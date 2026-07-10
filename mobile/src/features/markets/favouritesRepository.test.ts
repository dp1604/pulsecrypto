import { describe, expect, it, vi } from "vitest";
import {
  FAVOURITES_PAYLOAD_VERSION,
  FAVOURITES_STORAGE_KEY,
  createFavouritesRepository,
  normalizeFavouriteSymbols,
  parseFavouritesPayload,
  serializeFavouritesPayload,
  type AsyncStorageLike
} from "./favouritesRepository";

const createMemoryStorage = (): AsyncStorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();

  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    }
  };
};

describe("favouritesRepository", () => {
  it("returns an empty list when the storage key is missing", async () => {
    const storage = createMemoryStorage();
    const repository = createFavouritesRepository(storage);

    await expect(repository.load()).resolves.toEqual([]);
  });

  it("loads a valid versioned payload", async () => {
    const storage = createMemoryStorage();
    storage.data.set(
      FAVOURITES_STORAGE_KEY,
      JSON.stringify({ version: 1, symbols: ["BTCUSDT", "ETHUSDT"] })
    );
    const repository = createFavouritesRepository(storage);

    await expect(repository.load()).resolves.toEqual(["BTCUSDT", "ETHUSDT"]);
  });

  it("ignores malformed JSON", () => {
    expect(parseFavouritesPayload("{not-json")).toEqual([]);
  });

  it("ignores unsupported payload versions", () => {
    expect(
      parseFavouritesPayload(
        JSON.stringify({ version: 2, symbols: ["BTCUSDT"] })
      )
    ).toEqual([]);
  });

  it("ignores non-array symbols", () => {
    expect(
      parseFavouritesPayload(
        JSON.stringify({ version: 1, symbols: "BTCUSDT" })
      )
    ).toEqual([]);
  });

  it("rejects non-string entries, whitespace, and duplicates", () => {
    expect(
      normalizeFavouriteSymbols([
        "btcusdt",
        " BTCUSDT ",
        "",
        "  ",
        42,
        null,
        "ethusdt"
      ])
    ).toEqual(["BTCUSDT", "ETHUSDT"]);
  });

  it("serializes a deterministic versioned payload", () => {
    expect(
      JSON.parse(serializeFavouritesPayload(["ethusdt", "btcusdt"]))
    ).toEqual({
      version: FAVOURITES_PAYLOAD_VERSION,
      symbols: ["ETHUSDT", "BTCUSDT"]
    });
  });

  it("throws a typed read failure without logging payload contents", async () => {
    const storage = createMemoryStorage();
    storage.getItem = vi.fn(async () => {
      throw new Error("read failed");
    });
    const repository = createFavouritesRepository(storage);

    await expect(repository.load()).rejects.toMatchObject({
      code: "read_failed"
    });
  });

  it("throws a typed write failure without logging payload contents", async () => {
    const storage = createMemoryStorage();
    storage.setItem = vi.fn(async () => {
      throw new Error("write failed");
    });
    const repository = createFavouritesRepository(storage);

    await expect(repository.save(["BTCUSDT"])).rejects.toMatchObject({
      code: "write_failed"
    });
  });
});

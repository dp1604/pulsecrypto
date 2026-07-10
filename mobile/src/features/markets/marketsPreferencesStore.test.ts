import { describe, expect, it, vi } from "vitest";
import {
  FavouritesRepositoryError,
  createFavouritesRepository,
  type AsyncStorageLike
} from "./favouritesRepository";
import { createMarketsPreferencesStore } from "./marketsPreferencesStore";

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

describe("marketsPreferencesStore", () => {
  it("hydrates favourites from storage", async () => {
    const storage = createMemoryStorage();
    await storage.setItem(
      "pulsecrypto.markets.favourites.v1",
      JSON.stringify({ version: 1, symbols: ["BTCUSDT"] })
    );
    const store = createMarketsPreferencesStore({
      repository: createFavouritesRepository(storage)
    });

    await store.getState().hydrate();

    expect(store.getState()).toMatchObject({
      hydrationStatus: "ready",
      favouriteSymbols: ["BTCUSDT"],
      persistenceErrorMessage: null
    });
  });

  it("deduplicates concurrent hydrate calls", async () => {
    const storage = createMemoryStorage();
    const repository = createFavouritesRepository(storage);
    const loadSpy = vi.spyOn(repository, "load");
    const store = createMarketsPreferencesStore({ repository });

    const first = store.getState().hydrate();
    const second = store.getState().hydrate();

    expect(first).toBe(second);
    await first;

    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it("handles storage read failures with a safe non-blocking message", async () => {
    const repository = createFavouritesRepository({
      getItem: async () => {
        throw new Error("read failed");
      },
      setItem: async () => undefined
    });
    const store = createMarketsPreferencesStore({ repository });

    await store.getState().hydrate();

    expect(store.getState()).toMatchObject({
      hydrationStatus: "error",
      favouriteSymbols: [],
      persistenceErrorMessage:
        "Saved favourites could not be restored. You can still favourite pairs on this screen."
    });
  });

  it("ignores malformed payloads without crashing", async () => {
    const storage = createMemoryStorage();
    await storage.setItem(
      "pulsecrypto.markets.favourites.v1",
      "{not-json"
    );
    const store = createMarketsPreferencesStore({
      repository: createFavouritesRepository(storage)
    });

    await store.getState().hydrate();

    expect(store.getState()).toMatchObject({
      hydrationStatus: "ready",
      favouriteSymbols: []
    });
  });

  it("adds and removes favourites with symbol normalization", async () => {
    const storage = createMemoryStorage();
    const store = createMarketsPreferencesStore({
      repository: createFavouritesRepository(storage)
    });

    await store.getState().toggleFavourite("btcusdt");
    expect(store.getState().isFavourite("BTCUSDT")).toBe(true);

    await store.getState().toggleFavourite("BTCUSDT");
    expect(store.getState().favouriteSymbols).toEqual([]);
  });

  it("persists the latest snapshot after rapid toggles", async () => {
    const storage = createMemoryStorage();
    let releaseBlockedSave: (() => void) | undefined;
    const blockedSave = new Promise<void>((resolve) => {
      releaseBlockedSave = resolve;
    });
    let saveCallCount = 0;
    const repository = createFavouritesRepository({
      getItem: storage.getItem,
      setItem: async (key, value) => {
        saveCallCount += 1;

        if (saveCallCount === 1) {
          await blockedSave;
        }

        await storage.setItem(key, value);
      }
    });
    const store = createMarketsPreferencesStore({ repository });

    const first = store.getState().toggleFavourite("BTCUSDT");
    await Promise.resolve();
    const second = store.getState().toggleFavourite("DOGEUSDT");
    releaseBlockedSave?.();
    await Promise.all([first, second]);

    expect(
      JSON.parse(storage.data.get("pulsecrypto.markets.favourites.v1") ?? "{}")
    ).toEqual({
      version: 1,
      symbols: ["BTCUSDT", "DOGEUSDT"]
    });
  });

  it("does not surface persistence warnings for obsolete generations", async () => {
    const storage = createMemoryStorage();
    let releaseBlockedSave: (() => void) | undefined;
    const blockedSave = new Promise<void>((resolve) => {
      releaseBlockedSave = resolve;
    });
    let saveCallCount = 0;
    const repository = createFavouritesRepository({
      getItem: storage.getItem,
      setItem: async (key, value) => {
        saveCallCount += 1;

        if (saveCallCount === 1) {
          await blockedSave;
          throw new FavouritesRepositoryError("write_failed", "stale write failed");
        }

        await storage.setItem(key, value);
      }
    });
    const store = createMarketsPreferencesStore({ repository });

    const first = store.getState().toggleFavourite("BTCUSDT");
    await Promise.resolve();
    const second = store.getState().toggleFavourite("DOGEUSDT");
    releaseBlockedSave?.();
    await Promise.all([first, second]);

    expect(store.getState()).toMatchObject({
      favouriteSymbols: ["BTCUSDT", "DOGEUSDT"],
      persistenceErrorMessage: null
    });
  });

  it("keeps in-memory favourites when persistence fails", async () => {
    const repository = createFavouritesRepository({
      getItem: async () => null,
      setItem: async () => {
        throw new Error("write failed");
      }
    });
    const store = createMarketsPreferencesStore({ repository });

    await store.getState().toggleFavourite("BTCUSDT");

    expect(store.getState()).toMatchObject({
      favouriteSymbols: ["BTCUSDT"],
      persistenceErrorMessage:
        "Favourites could not be saved. Your latest selections remain on this screen."
    });
  });

  it("does not let hydration overwrite newer user toggles", async () => {
    let resolveLoad!: (value: string[]) => void;
    const repository = {
      load: () =>
        new Promise<string[]>((resolve) => {
          resolveLoad = resolve;
        }),
      save: async () => undefined
    };
    const store = createMarketsPreferencesStore({ repository });

    const hydratePromise = store.getState().hydrate();
    await store.getState().toggleFavourite("DOGEUSDT");

    resolveLoad(["BTCUSDT"]);
    await hydratePromise;

    expect(store.getState().favouriteSymbols).toEqual(["DOGEUSDT"]);
  });

  it("restores favourites from storage in a new store instance", async () => {
    const storage = createMemoryStorage();
    const firstStore = createMarketsPreferencesStore({
      repository: createFavouritesRepository(storage)
    });

    await firstStore.getState().toggleFavourite("BTCUSDT");
    await firstStore.getState().toggleFavourite("DOGEUSDT");

    const secondStore = createMarketsPreferencesStore({
      repository: createFavouritesRepository(storage)
    });
    await secondStore.getState().hydrate();

    expect(secondStore.getState().favouriteSymbols).toEqual([
      "BTCUSDT",
      "DOGEUSDT"
    ]);
  });

  it("clears persistence warnings explicitly", async () => {
    const repository = createFavouritesRepository({
      getItem: async () => null,
      setItem: async () => {
        throw new FavouritesRepositoryError("write_failed", "write failed");
      }
    });
    const store = createMarketsPreferencesStore({ repository });

    await store.getState().toggleFavourite("BTCUSDT");
    store.getState().clearPersistenceError();

    expect(store.getState().persistenceErrorMessage).toBeNull();
  });
});

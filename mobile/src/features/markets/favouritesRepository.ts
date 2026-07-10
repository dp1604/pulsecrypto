export const FAVOURITES_STORAGE_KEY = "pulsecrypto.markets.favourites.v1";
export const FAVOURITES_PAYLOAD_VERSION = 1;

export type FavouritesPayload = {
  version: typeof FAVOURITES_PAYLOAD_VERSION;
  symbols: string[];
};

export type FavouritesRepositoryErrorCode =
  | "read_failed"
  | "write_failed"
  | "invalid_payload";

export class FavouritesRepositoryError extends Error {
  readonly code: FavouritesRepositoryErrorCode;

  constructor(code: FavouritesRepositoryErrorCode, message: string) {
    super(message);
    this.name = "FavouritesRepositoryError";
    this.code = code;
  }
}

export type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type FavouritesRepository = {
  load: () => Promise<string[]>;
  save: (symbols: readonly string[]) => Promise<void>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const normalizeFavouriteSymbols = (
  symbols: readonly unknown[]
): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of symbols) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();

    if (!trimmed) {
      continue;
    }

    const canonical = trimmed.toUpperCase();

    if (seen.has(canonical)) {
      continue;
    }

    seen.add(canonical);
    normalized.push(canonical);
  }

  return normalized;
};

export const parseFavouritesPayload = (raw: string | null): string[] => {
  if (raw === null) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!isRecord(parsed)) {
    return [];
  }

  if (parsed.version !== FAVOURITES_PAYLOAD_VERSION) {
    return [];
  }

  if (!Array.isArray(parsed.symbols)) {
    return [];
  }

  return normalizeFavouriteSymbols(parsed.symbols);
};

export const serializeFavouritesPayload = (
  symbols: readonly string[]
): string => {
  const payload: FavouritesPayload = {
    version: FAVOURITES_PAYLOAD_VERSION,
    symbols: normalizeFavouriteSymbols(symbols)
  };

  return JSON.stringify(payload);
};

export const createFavouritesRepository = (
  storage: AsyncStorageLike,
  key: string = FAVOURITES_STORAGE_KEY
): FavouritesRepository => ({
  async load() {
    try {
      const raw = await storage.getItem(key);
      return parseFavouritesPayload(raw);
    } catch {
      throw new FavouritesRepositoryError(
        "read_failed",
        "Unable to read saved favourites."
      );
    }
  },

  async save(symbols) {
    try {
      await storage.setItem(key, serializeFavouritesPayload(symbols));
    } catch {
      throw new FavouritesRepositoryError(
        "write_failed",
        "Unable to save favourites."
      );
    }
  }
});

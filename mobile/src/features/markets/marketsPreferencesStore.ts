import { create } from "zustand";
import {
  normalizeFavouriteSymbols,
  type FavouritesRepository
} from "./favouritesRepository";

export type HydrationStatus = "idle" | "hydrating" | "ready" | "error";

export type MarketsPreferencesState = {
  hydrationStatus: HydrationStatus;
  favouriteSymbols: string[];
  persistenceErrorMessage: string | null;
  lastPersistedAt: number | null;
};

export type MarketsPreferencesStore = MarketsPreferencesState & {
  hydrate: () => Promise<void>;
  toggleFavourite: (symbol: string) => Promise<void>;
  clearPersistenceError: () => void;
  isFavourite: (symbol: string) => boolean;
};

export const initialMarketsPreferencesState: MarketsPreferencesState = {
  hydrationStatus: "idle",
  favouriteSymbols: [],
  persistenceErrorMessage: null,
  lastPersistedAt: null
};

const PERSISTENCE_ERROR_MESSAGE =
  "Favourites could not be saved. Your latest selections remain on this screen.";

const HYDRATION_ERROR_MESSAGE =
  "Saved favourites could not be restored. You can still favourite pairs on this screen.";

type CreateMarketsPreferencesStoreOptions = {
  repository: FavouritesRepository;
};

export const createMarketsPreferencesStore = (
  options: CreateMarketsPreferencesStoreOptions
) => {
  const repository = options.repository;

  let hydratePromise: Promise<void> | null = null;
  let persistChain: Promise<void> = Promise.resolve();
  let persistGeneration = 0;
  let userMutationGeneration = 0;

  return create<MarketsPreferencesStore>((set, get) => {
    const enqueuePersist = (symbols: readonly string[], generation: number) => {
      persistGeneration = generation;

      const snapshot = normalizeFavouriteSymbols(symbols);

      persistChain = persistChain
        .then(async () => {
          if (generation !== persistGeneration) {
            return;
          }

          await repository.save(snapshot);

          if (generation !== persistGeneration) {
            return;
          }

          set({
            persistenceErrorMessage: null,
            lastPersistedAt: Date.now()
          });
        })
        .catch(() => {
          if (generation !== persistGeneration) {
            return;
          }

          set({ persistenceErrorMessage: PERSISTENCE_ERROR_MESSAGE });
        });

      return persistChain;
    };

    return {
      ...initialMarketsPreferencesState,
      hydrate: () => {
        if (hydratePromise) {
          return hydratePromise;
        }

        const hydrationStartGeneration = userMutationGeneration;

        set({ hydrationStatus: "hydrating", persistenceErrorMessage: null });

        hydratePromise = repository
          .load()
          .then((symbols) => {
            if (userMutationGeneration !== hydrationStartGeneration) {
              set({ hydrationStatus: "ready" });
              return;
            }

            set({
              hydrationStatus: "ready",
              favouriteSymbols: normalizeFavouriteSymbols(symbols),
              persistenceErrorMessage: null
            });
          })
          .catch(() => {
            if (userMutationGeneration !== hydrationStartGeneration) {
              set({ hydrationStatus: "ready" });
              return;
            }

            set({
              hydrationStatus: "error",
              favouriteSymbols: [],
              persistenceErrorMessage: HYDRATION_ERROR_MESSAGE
            });
          })
          .finally(() => {
            hydratePromise = null;
          });

        return hydratePromise;
      },
      toggleFavourite: async (symbol) => {
        const canonical = normalizeFavouriteSymbols([symbol])[0];

        if (!canonical) {
          return;
        }

        userMutationGeneration += 1;
        const generation = userMutationGeneration;

        const current = get().favouriteSymbols;
        const isSelected = current.includes(canonical);
        const next = isSelected
          ? current.filter((entry) => entry !== canonical)
          : [...current, canonical];

        set({
          favouriteSymbols: next,
          hydrationStatus:
            get().hydrationStatus === "idle" ? "ready" : get().hydrationStatus
        });

        await enqueuePersist(next, generation);
      },
      clearPersistenceError: () => {
        set({ persistenceErrorMessage: null });
      },
      isFavourite: (symbol) => {
        const canonical = normalizeFavouriteSymbols([symbol])[0];

        if (!canonical) {
          return false;
        }

        return get().favouriteSymbols.includes(canonical);
      }
    };
  });
};

export const selectFavouriteSymbols = (state: MarketsPreferencesStore) =>
  state.favouriteSymbols;

export const selectHydrationStatus = (state: MarketsPreferencesStore) =>
  state.hydrationStatus;

export const selectPersistenceErrorMessage = (
  state: MarketsPreferencesStore
) => state.persistenceErrorMessage;

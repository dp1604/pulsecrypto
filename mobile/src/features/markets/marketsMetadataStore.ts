import type { PairMeta } from "@pulsecrypto/shared";
import { create } from "zustand";
import { isAbortError, toUserFacingMessage } from "../../api/errors";
import { createHttpClient } from "../../api/httpClient";
import { fetchPairsMeta } from "../../api/pairsMetaApi";
import {
  initialMarketsMetadataState,
  type MarketsMetadataState
} from "./types";

export type MarketsMetadataStore = MarketsMetadataState & {
  load: () => Promise<void>;
  retry: () => Promise<void>;
  refresh: () => Promise<void>;
  cancel: () => void;
};

type CreateMarketsMetadataStoreOptions = {
  fetchPairsMetaImpl?: typeof fetchPairsMeta;
  getApiBaseUrlImpl: () => string;
};

type FetchMode = "initial" | "refresh";

const REFRESH_ERROR_MESSAGE =
  "Unable to refresh pair metadata. Showing the last loaded list.";

export const createMarketsMetadataStore = (
  options: CreateMarketsMetadataStoreOptions
) => {
  const fetchPairsMetaImpl = options.fetchPairsMetaImpl ?? fetchPairsMeta;
  const getApiBaseUrlImpl = options.getApiBaseUrlImpl;
  let inFlightPromise: Promise<void> | null = null;
  let activeRequestId: number | null = null;
  let activeController: AbortController | null = null;
  let nextRequestId = 0;

  return create<MarketsMetadataStore>((set, get) => {
    const applyInitialSuccess = (items: PairMeta[]) => {
      if (items.length === 0) {
        set({
          status: "empty",
          items: [],
          errorMessage: null,
          refreshErrorMessage: null,
          isRefreshing: false,
          lastLoadedAt: Date.now(),
          inFlightGeneration: null
        });
        return;
      }

      set({
        status: "success",
        items,
        errorMessage: null,
        refreshErrorMessage: null,
        isRefreshing: false,
        lastLoadedAt: Date.now(),
        inFlightGeneration: null
      });
    };

    const applyRefreshSuccess = (items: PairMeta[]) => {
      const existingItems = get().items;

      if (items.length === 0) {
        if (existingItems.length > 0) {
          set({
            status: "success",
            refreshErrorMessage:
              "Refresh returned no supported pairs. Showing the last loaded list.",
            isRefreshing: false,
            lastLoadedAt: Date.now(),
            inFlightGeneration: null
          });
          return;
        }

        set({
          status: "empty",
          items: [],
          errorMessage: null,
          refreshErrorMessage: null,
          isRefreshing: false,
          lastLoadedAt: Date.now(),
          inFlightGeneration: null
        });
        return;
      }

      set({
        status: "success",
        items,
        errorMessage: null,
        refreshErrorMessage: null,
        isRefreshing: false,
        lastLoadedAt: Date.now(),
        inFlightGeneration: null
      });
    };

    const beginFetch = (force: boolean, mode: FetchMode): Promise<void> => {
      if (!force && inFlightPromise) {
        return inFlightPromise;
      }

      if (activeController) {
        activeController.abort();
        activeController = null;
      }

      activeRequestId = null;

      const requestGeneration = get().requestGeneration + 1;
      const controller = new AbortController();
      const requestId = ++nextRequestId;

      activeRequestId = requestId;
      activeController = controller;

      if (mode === "initial") {
        set({
          requestGeneration,
          inFlightGeneration: requestGeneration,
          status: "loading",
          errorMessage: null,
          refreshErrorMessage: null,
          isRefreshing: false
        });
      } else {
        set({
          requestGeneration,
          inFlightGeneration: requestGeneration,
          isRefreshing: true,
          refreshErrorMessage: null
        });
      }

      const isCurrentRequest = () =>
        activeRequestId === requestId &&
        get().requestGeneration === requestGeneration &&
        activeController === controller;

      const promise = Promise.resolve().then(async () => {
        try {
          if (!isCurrentRequest() || controller.signal.aborted) {
            return;
          }

          const baseUrl = getApiBaseUrlImpl();
          const client = createHttpClient(baseUrl);
          const items = await fetchPairsMetaImpl(client, controller.signal);

          if (!isCurrentRequest()) {
            return;
          }

          if (mode === "initial") {
            applyInitialSuccess(items);
            return;
          }

          applyRefreshSuccess(items);
        } catch (error) {
          if (!isCurrentRequest()) {
            return;
          }

          if (isAbortError(error)) {
            set({
              inFlightGeneration: null,
              isRefreshing: false
            });
            return;
          }

          if (mode === "refresh" && get().items.length > 0) {
            set({
              status: "success",
              refreshErrorMessage: REFRESH_ERROR_MESSAGE,
              isRefreshing: false,
              inFlightGeneration: null
            });
            return;
          }

          set({
            status: "error",
            errorMessage: toUserFacingMessage(error),
            refreshErrorMessage: null,
            isRefreshing: false,
            inFlightGeneration: null
          });
        } finally {
          if (activeRequestId === requestId) {
            activeRequestId = null;
            activeController = null;
          }

          if (inFlightPromise === promise) {
            inFlightPromise = null;
          }
        }
      });

      inFlightPromise = promise;

      return promise;
    };

    return {
      ...initialMarketsMetadataState,
      load: () => beginFetch(false, "initial"),
      retry: () => beginFetch(true, "initial"),
      refresh: () => {
        if (get().items.length === 0) {
          return beginFetch(false, "initial");
        }

        return beginFetch(false, "refresh");
      },
      cancel: () => {
        const { items, requestGeneration } = get();

        if (activeController) {
          activeController.abort();
          activeController = null;
        }

        activeRequestId = null;
        inFlightPromise = null;

        set({
          requestGeneration: requestGeneration + 1,
          inFlightGeneration: null,
          errorMessage: null,
          refreshErrorMessage: null,
          isRefreshing: false,
          status: items.length > 0 ? "success" : "idle"
        });
      }
    };
  });
};

export const selectMarketsMetadataStatus = (state: MarketsMetadataStore) =>
  state.status;

export const selectMarketsMetadataItems = (state: MarketsMetadataStore) =>
  state.items;

export const selectMarketsMetadataError = (state: MarketsMetadataStore) =>
  state.errorMessage;

export const selectMarketsMetadataRefreshError = (state: MarketsMetadataStore) =>
  state.refreshErrorMessage;

export const selectMarketsMetadataIsRefreshing = (
  state: MarketsMetadataStore
) => state.isRefreshing;

export const selectMarketsMetadataLastLoadedAt = (
  state: MarketsMetadataStore
) => state.lastLoadedAt;

export type { PairMeta };

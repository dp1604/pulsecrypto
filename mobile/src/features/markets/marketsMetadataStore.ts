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
  cancel: () => void;
};

type CreateMarketsMetadataStoreOptions = {
  fetchPairsMetaImpl?: typeof fetchPairsMeta;
  getApiBaseUrlImpl: () => string;
};

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
    const applySuccess = (items: PairMeta[]) => {
      if (items.length === 0) {
        set({
          status: "empty",
          items: [],
          errorMessage: null,
          lastLoadedAt: Date.now(),
          inFlightGeneration: null
        });
        return;
      }

      set({
        status: "success",
        items,
        errorMessage: null,
        lastLoadedAt: Date.now(),
        inFlightGeneration: null
      });
    };

    const beginLoad = (force: boolean): Promise<void> => {
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

      set({
        requestGeneration,
        inFlightGeneration: requestGeneration,
        status: "loading",
        errorMessage: null
      });

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

          applySuccess(items);
        } catch (error) {
          if (!isCurrentRequest()) {
            return;
          }

          if (isAbortError(error)) {
            set({ inFlightGeneration: null });
            return;
          }

          set({
            status: "error",
            errorMessage: toUserFacingMessage(error),
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
      load: () => beginLoad(false),
      retry: () => beginLoad(true),
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

export const selectMarketsMetadataLastLoadedAt = (
  state: MarketsMetadataStore
) => state.lastLoadedAt;

export type { PairMeta };

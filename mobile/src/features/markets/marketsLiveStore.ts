import type { MarketSnapshot, PairSymbol } from "@pulsecrypto/shared";
import { create } from "zustand";
import {
  createMarketDisplayCoalescer,
  type MarketDisplayCoalescer
} from "./marketDisplayCoalescer";
import {
  createMarketWebSocketController,
  type MarketConnectionStatus,
  type MarketWebSocketController,
  type WebSocketLike
} from "./marketWebSocketClient";

export type { MarketConnectionStatus } from "./marketWebSocketClient";

export type MarketsLiveState = {
  connectionStatus: MarketConnectionStatus;
  snapshotsByPair: Partial<Record<PairSymbol, MarketSnapshot>>;
  lastAcceptedSequence: number;
  lastBatchReceivedAt: number | null;
  reconnectAttempt: number;
  connectionErrorMessage: string | null;
  invalidMessageCount: number;
};

export type MarketsLiveStore = MarketsLiveState & {
  start: () => void;
  stop: () => void;
  setAppActive: (active: boolean) => void;
  reconnectNow: () => void;
};

export const initialMarketsLiveState: MarketsLiveState = {
  connectionStatus: "idle",
  snapshotsByPair: {},
  lastAcceptedSequence: -1,
  lastBatchReceivedAt: null,
  reconnectAttempt: 0,
  connectionErrorMessage: null,
  invalidMessageCount: 0
};

type CreateMarketsLiveStoreOptions = {
  getWebSocketUrl: () => string;
  createWebSocket?: (url: string) => WebSocketLike;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  random?: () => number;
  now?: () => number;
};

export const createMarketsLiveStore = (
  options: CreateMarketsLiveStoreOptions
) => {
  let controller: MarketWebSocketController | null = null;
  let displayCoalescer: MarketDisplayCoalescer | null = null;
  let lifecycleStarted = false;
  const setTimeoutFn = options.setTimeout ?? setTimeout;
  const clearTimeoutFn = options.clearTimeout ?? clearTimeout;
  const nowFn = options.now ?? (() => Date.now());

  return create<MarketsLiveStore>((set, get) => {
    const ensureDisplayCoalescer = () => {
      if (displayCoalescer !== null) {
        return displayCoalescer;
      }

      displayCoalescer = createMarketDisplayCoalescer({
        setTimeout: setTimeoutFn,
        clearTimeout: clearTimeoutFn,
        now: nowFn,
        onPublish: (payload) => {
          set({
            snapshotsByPair: payload.snapshotsByPair,
            lastAcceptedSequence: payload.lastAcceptedSequence,
            lastBatchReceivedAt: payload.lastBatchReceivedAt,
            connectionErrorMessage: null
          });
        }
      });

      return displayCoalescer;
    };

    const ensureController = () => {
      if (controller !== null) {
        return controller;
      }

      controller = createMarketWebSocketController({
        getWebSocketUrl: options.getWebSocketUrl,
        createWebSocket: options.createWebSocket,
        setTimeout: options.setTimeout,
        clearTimeout: options.clearTimeout,
        random: options.random,
        now: options.now,
        callbacks: {
          onConnectionState: ({ status, reconnectAttempt, errorMessage }) => {
            if (status === "connecting" || status === "reconnecting") {
              ensureDisplayCoalescer().markSessionStart();
            }

            set({
              connectionStatus: status,
              reconnectAttempt,
              connectionErrorMessage: errorMessage
            });
          },
          onMarketBatch: (batch) => {
            ensureDisplayCoalescer().acceptBatch(batch, get().snapshotsByPair);
          }
        }
      });

      return controller;
    };

    return {
      ...initialMarketsLiveState,

      start: () => {
        const activeController = ensureController();
        ensureDisplayCoalescer().markSessionStart();

        if (lifecycleStarted) {
          activeController.start();
          return;
        }

        lifecycleStarted = true;
        activeController.start();
      },

      stop: () => {
        ensureDisplayCoalescer().stop();

        if (controller === null) {
          set({ connectionStatus: "disconnected" });
          return;
        }

        controller.stop();
        lifecycleStarted = false;
      },

      setAppActive: (active: boolean) => {
        const coalescer = ensureDisplayCoalescer();

        if (active) {
          coalescer.resume();
        } else {
          coalescer.pause();
        }

        ensureController().setAppActive(active);
      },

      reconnectNow: () => {
        ensureController().reconnectNow();
      }
    };
  });
};

export const selectConnectionStatus = (state: MarketsLiveStore) =>
  state.connectionStatus;

export const selectConnectionError = (state: MarketsLiveStore) =>
  state.connectionErrorMessage;

export const selectReconnectAttempt = (state: MarketsLiveStore) =>
  state.reconnectAttempt;

export const selectLastBatchReceivedAt = (state: MarketsLiveStore) =>
  state.lastBatchReceivedAt;

export const selectHasLiveSnapshot = (state: MarketsLiveStore) =>
  state.lastBatchReceivedAt !== null;

export const createSelectSnapshotByPair =
  (pair: PairSymbol) => (state: MarketsLiveStore) =>
    state.snapshotsByPair[pair];

export const createSelectSnapshotPriceByPair =
  (pair: PairSymbol) => (state: MarketsLiveStore) =>
    state.snapshotsByPair[pair]?.price;

export const createSelectSnapshotChange24hByPair =
  (pair: PairSymbol) => (state: MarketsLiveStore) =>
    state.snapshotsByPair[pair]?.change24hPercent;

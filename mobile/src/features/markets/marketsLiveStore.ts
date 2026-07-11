import type { MarketSnapshot, PairSymbol } from "@pulsecrypto/shared";
import { create } from "zustand";
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
  let lifecycleStarted = false;

  return create<MarketsLiveStore>((set) => {
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
            set({
              connectionStatus: status,
              reconnectAttempt,
              connectionErrorMessage: errorMessage
            });
          },
          onMarketBatch: (batch) => {
            set((state) => {
              const nextSnapshots = { ...state.snapshotsByPair };

              for (const snapshot of batch.pairs) {
                const existing = nextSnapshots[snapshot.pair];

                if (
                  existing !== undefined &&
                  snapshot.lastUpdated < existing.lastUpdated
                ) {
                  continue;
                }

                nextSnapshots[snapshot.pair] = snapshot;
              }

              return {
                snapshotsByPair: nextSnapshots,
                lastAcceptedSequence: batch.sequence,
                lastBatchReceivedAt: options.now?.() ?? Date.now(),
                connectionErrorMessage: null
              };
            });
          }
        }
      });

      return controller;
    };

    return {
      ...initialMarketsLiveState,

      start: () => {
        const activeController = ensureController();

        if (lifecycleStarted) {
          activeController.start();
          return;
        }

        lifecycleStarted = true;
        activeController.start();
      },

      stop: () => {
        if (controller === null) {
          set({ connectionStatus: "disconnected" });
          return;
        }

        controller.stop();
        lifecycleStarted = false;
      },

      setAppActive: (active: boolean) => {
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

export const createSelectSnapshotByPair =
  (pair: PairSymbol) => (state: MarketsLiveStore) =>
    state.snapshotsByPair[pair];

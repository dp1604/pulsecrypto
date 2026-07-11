import type { MarketSnapshotBatchMessage } from "@pulsecrypto/shared";
import { parseMarketWebSocketMessage } from "./marketWebSocketMessage";

export type MarketConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "live"
  | "reconnecting"
  | "paused"
  | "disconnected";

export type WebSocketLike = {
  readonly url: string;
  readonly readyState: number;
  onopen: ((event?: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event?: unknown) => void) | null;
  onclose: ((event: { code?: number; reason?: string; wasClean?: boolean }) => void) | null;
  close: (code?: number, reason?: string) => void;
};

export const WEB_SOCKET_CONNECTING = 0;
export const WEB_SOCKET_OPEN = 1;
export const WEB_SOCKET_CLOSING = 2;
export const WEB_SOCKET_CLOSED = 3;

export type MarketWebSocketControllerCallbacks = {
  onConnectionState: (state: {
    status: MarketConnectionStatus;
    reconnectAttempt: number;
    errorMessage: string | null;
  }) => void;
  onMarketBatch: (
    batch: MarketSnapshotBatchMessage,
    socketGeneration: number
  ) => void;
};

export type CreateMarketWebSocketControllerOptions = {
  getWebSocketUrl: () => string;
  createWebSocket?: (url: string) => WebSocketLike;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
  random?: () => number;
  now?: () => number;
  callbacks: MarketWebSocketControllerCallbacks;
};

export type MarketWebSocketController = {
  start: () => void;
  stop: () => void;
  setAppActive: (active: boolean) => void;
  reconnectNow: () => void;
};

const OPEN_TIMEOUT_MS = 10_000;
const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 8_000;
const JITTER_FACTOR = 0.2;

const TRANSIENT_ERROR_MESSAGE =
  "Live market connection interrupted. Retrying automatically.";

const CONFIGURATION_ERROR_MESSAGE =
  "The app is not configured with a valid WebSocket URL. Set EXPO_PUBLIC_WS_URL and restart.";

export const computeReconnectDelayMs = (
  reconnectAttempt: number,
  random: () => number
): number => {
  const retryIndex = Math.max(0, reconnectAttempt - 1);
  const uncappedNominal = BASE_RECONNECT_DELAY_MS * 2 ** retryIndex;
  const boundedRandom = Math.min(1, Math.max(0, random()));
  const jitterMultiplier = 1 - JITTER_FACTOR + boundedRandom * (JITTER_FACTOR * 2);
  const jittered = Math.round(uncappedNominal * jitterMultiplier);

  return Math.min(MAX_RECONNECT_DELAY_MS, Math.max(0, jittered));
};

export const createMarketWebSocketController = (
  options: CreateMarketWebSocketControllerOptions
): MarketWebSocketController => {
  const createWebSocket = options.createWebSocket;
  const setTimeoutFn = options.setTimeout ?? setTimeout;
  const clearTimeoutFn = options.clearTimeout ?? clearTimeout;
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  const callbacks = options.callbacks;

  let desiredRunning = false;
  let appActive = true;
  let currentSocket: WebSocketLike | null = null;
  let socketGeneration = 0;
  let lastAcceptedSequence = -1;
  let reconnectAttempt = 0;
  let hasReceivedValidBatch = false;
  let openTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let intentionalClose = false;
  let stopped = false;

  const emitConnectionState = (
    status: MarketConnectionStatus,
    errorMessage: string | null = null
  ) => {
    callbacks.onConnectionState({
      status,
      reconnectAttempt,
      errorMessage
    });
  };

  const clearOpenTimeout = () => {
    if (openTimeoutId !== null) {
      clearTimeoutFn(openTimeoutId);
      openTimeoutId = null;
    }
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutId !== null) {
      clearTimeoutFn(reconnectTimeoutId);
      reconnectTimeoutId = null;
    }
  };

  const detachSocketHandlers = (socket: WebSocketLike) => {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;
  };

  const closeCurrentSocket = (code?: number, reason?: string) => {
    if (currentSocket === null) {
      return;
    }

    const socket = currentSocket;
    currentSocket = null;
    detachSocketHandlers(socket);

    if (
      socket.readyState === WEB_SOCKET_OPEN ||
      socket.readyState === WEB_SOCKET_CONNECTING
    ) {
      intentionalClose = true;
      socket.close(code, reason);
    }
  };

  const scheduleReconnect = () => {
    if (!desiredRunning || !appActive || stopped) {
      return;
    }

    clearReconnectTimeout();

    const generationAtSchedule = socketGeneration;
    const delayMs = computeReconnectDelayMs(reconnectAttempt, random);

    reconnectTimeoutId = setTimeoutFn(() => {
      reconnectTimeoutId = null;

      if (
        !desiredRunning ||
        !appActive ||
        stopped ||
        generationAtSchedule !== socketGeneration
      ) {
        return;
      }

      connect();
    }, delayMs);
  };

  const handleSocketFailure = (generation: number) => {
    if (generation !== socketGeneration || stopped) {
      return;
    }

    clearOpenTimeout();
    closeCurrentSocket();
    reconnectAttempt += 1;
    emitConnectionState("reconnecting", TRANSIENT_ERROR_MESSAGE);
    scheduleReconnect();
  };

  const handleValidBatch = (
    batch: MarketSnapshotBatchMessage,
    generation: number
  ) => {
    if (generation !== socketGeneration || stopped) {
      return;
    }

    if (batch.sequence <= lastAcceptedSequence) {
      return;
    }

    lastAcceptedSequence = batch.sequence;
    reconnectAttempt = 0;
    hasReceivedValidBatch = true;
    callbacks.onMarketBatch(batch, generation);
    emitConnectionState("live", null);
  };

  const connect = () => {
    if (!desiredRunning || !appActive || stopped) {
      return;
    }

    if (
      currentSocket !== null &&
      (currentSocket.readyState === WEB_SOCKET_OPEN ||
        currentSocket.readyState === WEB_SOCKET_CONNECTING)
    ) {
      return;
    }

    clearReconnectTimeout();
    clearOpenTimeout();
    closeCurrentSocket();

    socketGeneration += 1;
    const generation = socketGeneration;
    lastAcceptedSequence = -1;
    hasReceivedValidBatch = false;
    intentionalClose = false;

    let url: string;

    try {
      url = options.getWebSocketUrl();
    } catch {
      emitConnectionState("disconnected", CONFIGURATION_ERROR_MESSAGE);
      return;
    }

    emitConnectionState("connecting", null);

    let socket: WebSocketLike;

    try {
      if (createWebSocket === undefined) {
        throw new Error("WebSocket factory is not available.");
      }

      socket = createWebSocket(url);
    } catch {
      handleSocketFailure(generation);
      return;
    }

    currentSocket = socket;

    socket.onopen = () => {
      if (generation !== socketGeneration || stopped) {
        return;
      }

      clearOpenTimeout();
      emitConnectionState("connected", null);
    };

    socket.onmessage = (event) => {
      if (generation !== socketGeneration || stopped) {
        return;
      }

      const parsed = parseMarketWebSocketMessage(event.data);

      if (parsed.kind === "batch") {
        handleValidBatch(parsed.batch, generation);
      }
    };

    socket.onerror = () => {
      if (generation !== socketGeneration || stopped) {
        return;
      }

      handleSocketFailure(generation);
    };

    socket.onclose = () => {
      if (generation !== socketGeneration || stopped) {
        return;
      }

      clearOpenTimeout();
      currentSocket = null;
      detachSocketHandlers(socket);

      if (intentionalClose) {
        intentionalClose = false;
        return;
      }

      reconnectAttempt += 1;
      emitConnectionState(
        hasReceivedValidBatch ? "reconnecting" : "reconnecting",
        TRANSIENT_ERROR_MESSAGE
      );
      scheduleReconnect();
    };

    openTimeoutId = setTimeoutFn(() => {
      openTimeoutId = null;

      if (generation !== socketGeneration || stopped) {
        return;
      }

      intentionalClose = false;
      handleSocketFailure(generation);
    }, OPEN_TIMEOUT_MS);
  };

  return {
    start: () => {
      if (desiredRunning) {
        if (appActive && currentSocket === null && reconnectTimeoutId === null) {
          connect();
        }

        return;
      }

      stopped = false;
      desiredRunning = true;

      if (appActive) {
        connect();
      }
    },

    stop: () => {
      stopped = true;
      desiredRunning = false;
      clearOpenTimeout();
      clearReconnectTimeout();
      closeCurrentSocket();
      socketGeneration += 1;
      reconnectAttempt = 0;
      hasReceivedValidBatch = false;
      emitConnectionState("disconnected", null);
    },

    setAppActive: (active: boolean) => {
      appActive = active;

      if (!desiredRunning || stopped) {
        return;
      }

      if (!active) {
        clearReconnectTimeout();
        clearOpenTimeout();
        intentionalClose = true;
        closeCurrentSocket();
        emitConnectionState("paused", null);
        return;
      }

      connect();
    },

    reconnectNow: () => {
      if (!desiredRunning || !appActive || stopped) {
        return;
      }

      clearReconnectTimeout();
      reconnectAttempt = 0;
      intentionalClose = true;
      closeCurrentSocket();
      connect();
    }
  };
};

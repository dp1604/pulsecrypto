import type { MarketSnapshot, PairSymbol } from "@pulsecrypto/shared";

export const DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS = 250;

export type MarketSnapshotBatch = {
  sequence: number;
  sentAt: number;
  pairs: readonly MarketSnapshot[];
};

export type MarketDisplayPublishPayload = {
  snapshotsByPair: Partial<Record<PairSymbol, MarketSnapshot>>;
  lastAcceptedSequence: number;
  lastBatchReceivedAt: number;
};

export type MarketDisplayCoalescerOptions = {
  publishIntervalMs?: number;
  setTimeout: typeof setTimeout;
  clearTimeout: typeof clearTimeout;
  now: () => number;
  onPublish: (payload: MarketDisplayPublishPayload) => void;
};

export type MarketDisplayCoalescer = {
  acceptBatch: (
    batch: MarketSnapshotBatch,
    currentSnapshots: Partial<Record<PairSymbol, MarketSnapshot>>
  ) => void;
  flushImmediate: (
    currentSnapshots: Partial<Record<PairSymbol, MarketSnapshot>>
  ) => void;
  markSessionStart: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  hasPendingTimer: () => boolean;
  getPendingSequence: () => number | null;
};

const mergeBatchIntoSnapshots = (
  currentSnapshots: Partial<Record<PairSymbol, MarketSnapshot>>,
  batch: MarketSnapshotBatch
): Partial<Record<PairSymbol, MarketSnapshot>> => {
  const nextSnapshots = { ...currentSnapshots };

  for (const snapshot of batch.pairs) {
    const existing = nextSnapshots[snapshot.pair];

    if (existing !== undefined && snapshot.lastUpdated < existing.lastUpdated) {
      continue;
    }

    nextSnapshots[snapshot.pair] = snapshot;
  }

  return nextSnapshots;
};

export const createMarketDisplayCoalescer = (
  options: MarketDisplayCoalescerOptions
): MarketDisplayCoalescer => {
  const publishIntervalMs =
    options.publishIntervalMs ?? DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS;

  let timerId: ReturnType<typeof setTimeout> | null = null;
  let pendingSequence: number | null = null;
  let pendingReceivedAt: number | null = null;
  let pendingSnapshots: Partial<Record<PairSymbol, MarketSnapshot>> | null =
    null;
  let publishImmediately = true;
  let paused = false;

  const clearPendingTimer = () => {
    if (timerId !== null) {
      options.clearTimeout(timerId);
      timerId = null;
    }
  };

  const publishPending = () => {
    clearPendingTimer();

    if (
      pendingSnapshots === null ||
      pendingSequence === null ||
      pendingReceivedAt === null
    ) {
      return;
    }

    options.onPublish({
      snapshotsByPair: pendingSnapshots,
      lastAcceptedSequence: pendingSequence,
      lastBatchReceivedAt: pendingReceivedAt
    });

    pendingSnapshots = null;
    pendingSequence = null;
    pendingReceivedAt = null;
    publishImmediately = false;
  };

  const schedulePublish = () => {
    if (paused || timerId !== null) {
      return;
    }

    timerId = options.setTimeout(() => {
      timerId = null;
      publishPending();
    }, publishIntervalMs);
  };

  return {
    acceptBatch: (batch, currentSnapshots) => {
      if (paused) {
        return;
      }

      const baseSnapshots = pendingSnapshots ?? currentSnapshots;
      pendingSnapshots = mergeBatchIntoSnapshots(baseSnapshots, batch);
      pendingSequence = batch.sequence;
      pendingReceivedAt = options.now();

      if (publishImmediately) {
        publishPending();
        return;
      }

      schedulePublish();
    },

    flushImmediate: (currentSnapshots) => {
      if (pendingSnapshots === null) {
        pendingSnapshots = { ...currentSnapshots };
      }

      publishPending();
    },

    markSessionStart: () => {
      publishImmediately = true;
    },

    stop: () => {
      clearPendingTimer();
      pendingSnapshots = null;
      pendingSequence = null;
      pendingReceivedAt = null;
      publishImmediately = true;
      paused = false;
    },

    pause: () => {
      paused = true;
      clearPendingTimer();
    },

    resume: () => {
      paused = false;
      publishImmediately = true;
    },

    hasPendingTimer: () => timerId !== null,

    getPendingSequence: () => pendingSequence
  };
};

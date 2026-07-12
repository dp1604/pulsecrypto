import type { PairSymbol } from "@pulsecrypto/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSelectSnapshotByPair,
  createMarketsLiveStore,
  initialMarketsLiveState,
  selectConnectionError,
  selectConnectionStatus,
  selectHasLiveSnapshot,
  selectLastBatchReceivedAt,
  selectReconnectAttempt
} from "./marketsLiveStore";
import { DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS } from "./marketDisplayCoalescer";
import {
  WEB_SOCKET_CLOSED,
  WEB_SOCKET_CONNECTING,
  WEB_SOCKET_OPEN,
  type WebSocketLike
} from "./marketWebSocketClient";

const validSnapshot = (overrides?: Partial<typeof baseSnapshot> & { pair?: PairSymbol }) => ({
  ...baseSnapshot,
  ...overrides
});

const baseSnapshot = {
  pair: "BTCUSDT" as PairSymbol,
  displayName: "BTC / USDT",
  price: 50000,
  change24hPercent: 1.5,
  spread: 10,
  buyPressure: 55,
  sellPressure: 45,
  bids: [{ price: 49990, quantity: 1, total: 1 }],
  asks: [{ price: 50010, quantity: 1, total: 1 }],
  lastUpdated: 1000
};

const makeBatch = (
  sequence: number,
  pairs = [validSnapshot()],
  sentAt = 1000
) =>
  JSON.stringify({
    type: "market.snapshot.batch",
    sentAt,
    sequence,
    pairs
  });

class FakeWebSocket implements WebSocketLike {
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = WEB_SOCKET_CONNECTING;
  onopen: ((event?: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  onclose:
    | ((event: { code?: number; reason?: string; wasClean?: boolean }) => void)
    | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  simulateOpen() {
    this.readyState = WEB_SOCKET_OPEN;
    this.onopen?.({});
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  simulateClose(code = 1006, reason = "", wasClean = false) {
    this.readyState = WEB_SOCKET_CLOSED;
    this.onclose?.({ code, reason, wasClean });
  }

  close() {
    this.simulateClose(1000, "", true);
  }
}

const latestSocket = () =>
  FakeWebSocket.instances[FakeWebSocket.instances.length - 1];

describe("marketsLiveStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createStore = () =>
    createMarketsLiveStore({
      getWebSocketUrl: () => "ws://127.0.0.1:3001",
      createWebSocket: (url) => new FakeWebSocket(url),
      setTimeout,
      clearTimeout,
      random: () => 0,
      now: () => 2_000
    });

  const flushDisplayCoalescer = () => {
    vi.advanceTimersByTime(DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS);
  };

  it("starts with initial state", () => {
    const store = createStore();

    expect(store.getState()).toMatchObject(initialMarketsLiveState);
  });

  it("propagates controller connection state", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();

    expect(selectConnectionStatus(store.getState())).toBe("connected");
  });

  it("inserts snapshots from the first batch", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));

    expect(createSelectSnapshotByPair("BTCUSDT")(store.getState())?.price).toBe(
      50000
    );
    expect(selectConnectionStatus(store.getState())).toBe("live");
  });

  it("merges batch snapshots in one snapshot-state update", () => {
    const store = createStore();
    let snapshotUpdateCount = 0;

    store.subscribe((state, previousState) => {
      if (state.snapshotsByPair !== previousState.snapshotsByPair) {
        snapshotUpdateCount += 1;
      }
    });

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));

    expect(snapshotUpdateCount).toBe(1);
  });

  it("replaces newer pair snapshots on later batches", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));
    latestSocket().simulateMessage(
      makeBatch(2, [validSnapshot({ price: 51000, lastUpdated: 2000 })])
    );
    flushDisplayCoalescer();

    expect(createSelectSnapshotByPair("BTCUSDT")(store.getState())?.price).toBe(
      51000
    );
  });

  it("keeps omitted pairs from earlier batches", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(
      makeBatch(1, [
        validSnapshot(),
        validSnapshot({
          pair: "ETHUSDT",
          displayName: "ETH / USDT",
          lastUpdated: 1001
        })
      ])
    );
    latestSocket().simulateMessage(makeBatch(2, [validSnapshot({ lastUpdated: 2000 })]));
    flushDisplayCoalescer();

    expect(createSelectSnapshotByPair("ETHUSDT")(store.getState())?.pair).toBe(
      "ETHUSDT"
    );
  });

  it("ignores older per-pair lastUpdated values", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(
      makeBatch(1, [validSnapshot({ price: 52000, lastUpdated: 3000 })])
    );
    latestSocket().simulateMessage(
      makeBatch(2, [validSnapshot({ price: 49000, lastUpdated: 2500 })])
    );
    flushDisplayCoalescer();

    expect(createSelectSnapshotByPair("BTCUSDT")(store.getState())?.price).toBe(
      52000
    );
  });

  it("merges multiple pairs atomically", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(
      makeBatch(1, [
        validSnapshot({ lastUpdated: 1000 }),
        validSnapshot({
          pair: "ETHUSDT",
          displayName: "ETH / USDT",
          price: 3000,
          lastUpdated: 1001
        })
      ])
    );

    expect(Object.keys(store.getState().snapshotsByPair)).toHaveLength(2);
  });

  it("preserves snapshots while reconnecting", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));
    latestSocket().simulateClose();

    expect(createSelectSnapshotByPair("BTCUSDT")(store.getState())?.price).toBe(
      50000
    );
    expect(selectConnectionStatus(store.getState())).toBe("reconnecting");
  });

  it("preserves snapshots while paused", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));
    store.getState().setAppActive(false);

    expect(createSelectSnapshotByPair("BTCUSDT")(store.getState())?.price).toBe(
      50000
    );
    expect(selectConnectionStatus(store.getState())).toBe("paused");
  });

  it("preserves snapshots on explicit disconnect", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));
    store.getState().stop();

    expect(createSelectSnapshotByPair("BTCUSDT")(store.getState())?.price).toBe(
      50000
    );
    expect(selectConnectionStatus(store.getState())).toBe("disconnected");
  });

  it("clears transient error after a later valid batch", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));
    latestSocket().simulateClose();

    expect(selectConnectionError(store.getState())).not.toBeNull();

    store.getState().reconnectNow();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(2));

    expect(selectConnectionError(store.getState())).toBeNull();
  });

  it("exposes selectors for intended fields only", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));

    expect(selectConnectionStatus(store.getState())).toBe("live");
    expect(selectReconnectAttempt(store.getState())).toBe(0);
    expect(selectLastBatchReceivedAt(store.getState())).toBe(2_000);
    expect(selectConnectionError(store.getState())).toBeNull();
  });

  it("deduplicates start and stop actions", () => {
    const store = createStore();

    store.getState().start();
    store.getState().start();
    expect(FakeWebSocket.instances).toHaveLength(1);

    store.getState().stop();
    store.getState().stop();
    expect(selectConnectionStatus(store.getState())).toBe("disconnected");
  });

  it("delegates reconnectNow to the controller", () => {
    const store = createStore();

    store.getState().start();
    store.getState().reconnectNow();

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("retains last-known snapshots while reconnecting for details presentation", () => {
    const store = createStore();

    store.setState({
      connectionStatus: "reconnecting",
      snapshotsByPair: {
        ETHUSDT: validSnapshot({
          pair: "ETHUSDT",
          displayName: "ETH / USDT",
          price: 3200,
          change24hPercent: -0.5,
          lastUpdated: 1_700_000_000_000
        })
      }
    });

    expect(createSelectSnapshotByPair("ETHUSDT")(store.getState())?.price).toBe(
      3200
    );
    expect(selectConnectionStatus(store.getState())).toBe("reconnecting");
  });

  it("selectHasLiveSnapshot is false before first publish", () => {
    const store = createStore();

    expect(selectHasLiveSnapshot(store.getState())).toBe(false);
  });

  it("selectHasLiveSnapshot becomes true after first publish and stays stable", () => {
    const store = createStore();

    store.getState().start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));

    expect(selectHasLiveSnapshot(store.getState())).toBe(true);
    const firstTimestamp = selectLastBatchReceivedAt(store.getState());

    latestSocket().simulateMessage(
      makeBatch(2, [validSnapshot({ price: 50100, lastUpdated: 3000 })])
    );
    flushDisplayCoalescer();

    expect(selectHasLiveSnapshot(store.getState())).toBe(true);
    expect(createSelectSnapshotByPair("BTCUSDT")(store.getState())?.price).toBe(
      50100
    );
    expect(selectHasLiveSnapshot(store.getState())).toBe(
      selectHasLiveSnapshot({
        ...store.getState(),
        lastBatchReceivedAt: firstTimestamp
      })
    );
  });
});

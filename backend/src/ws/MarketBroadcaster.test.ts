import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MARKET_SNAPSHOT_BATCH_TYPE,
  MarketSnapshotBatchMessageSchema
} from "@pulsecrypto/shared";
import { WebSocket } from "ws";
import { MarketSnapshotBuilder } from "../market/MarketSnapshotBuilder";
import { MarketStateStore } from "../market/MarketStateStore";
import type { MarketBroadcastClients } from "./MarketBroadcaster";
import { MarketBroadcaster } from "./MarketBroadcaster";

class FakeClientWebSocket extends EventEmitter {
  readyState: number = WebSocket.OPEN;
  bufferedAmount = 0;
  readonly sent: string[] = [];
  closedWith: { code: number; reason: string } | undefined;

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(code = 1000, reason = "client closed"): void {
    this.readyState = WebSocket.CLOSED;
    this.closedWith = { code, reason };
    this.emit("close", code, reason);
  }

  terminate(): void {
    this.close();
  }

  removeAllListeners(event?: string | symbol): this {
    return super.removeAllListeners(event);
  }
}

const createFakeClients = (
  clients: FakeClientWebSocket[]
): MarketBroadcastClients => {
  const removed: Array<{
    client: FakeClientWebSocket;
    code?: number;
    reason?: string;
  }> = [];

  return {
    getClientsSnapshot: () => clients as unknown as WebSocket[],
    removeClient: (client, code = 1008, reason = "Client removed") => {
      const fakeClient = client as unknown as FakeClientWebSocket;
      removed.push({ client: fakeClient, code, reason });
      fakeClient.close(code, reason);
      const index = clients.indexOf(fakeClient);

      if (index >= 0) {
        clients.splice(index, 1);
      }
    },
    removed
  } as MarketBroadcastClients & {
    removed: Array<{
      client: FakeClientWebSocket;
      code: number;
      reason: string;
    }>;
  };
};

const seedBtcSnapshot = (store: MarketStateStore): void => {
  store.updateTicker({
    pair: "BTCUSDT",
    price: "109235.42",
    change24hPercent: "1.82",
    high24h: "110000",
    low24h: "105000",
    volume24h: "18250.32",
    timestamp: "1720802025000"
  });
  store.updateOrderBook({
    pair: "BTCUSDT",
    bids: [["109235.41", "1.5"]],
    asks: [["109235.43", "0.8"]],
    timestamp: "1720802025001"
  });
};

describe("MarketBroadcaster", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds and sends market.snapshot.batch with sentAt, sequence, and pairs", () => {
    const store = new MarketStateStore();
    seedBtcSnapshot(store);

    const client = new FakeClientWebSocket();
    const clients = createFakeClients([client]);
    const broadcaster = new MarketBroadcaster({
      snapshotBuilder: new MarketSnapshotBuilder(store),
      clients,
      intervalMs: 100,
      now: () => 1_720_802_025_000
    });

    broadcaster.start();
    vi.advanceTimersByTime(100);

    expect(client.sent).toHaveLength(1);

    const message = MarketSnapshotBatchMessageSchema.parse(
      JSON.parse(client.sent[0] ?? "{}")
    );

    expect(message).toEqual({
      type: MARKET_SNAPSHOT_BATCH_TYPE,
      sentAt: 1_720_802_025_000,
      sequence: 0,
      pairs: expect.arrayContaining([
        expect.objectContaining({
          pair: "BTCUSDT",
          price: 109235.42,
          change24hPercent: 1.82
        })
      ])
    });
    expect(message.pairs).toHaveLength(5);
  });

  it("increments sequence across ticks", () => {
    const store = new MarketStateStore();
    seedBtcSnapshot(store);

    const client = new FakeClientWebSocket();
    const broadcaster = new MarketBroadcaster({
      snapshotBuilder: new MarketSnapshotBuilder(store),
      clients: createFakeClients([client]),
      intervalMs: 100,
      now: () => 1_720_802_025_000
    });

    broadcaster.start();
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(100);

    const first = MarketSnapshotBatchMessageSchema.parse(
      JSON.parse(client.sent[0] ?? "{}")
    );
    const second = MarketSnapshotBatchMessageSchema.parse(
      JSON.parse(client.sent[1] ?? "{}")
    );

    expect(first.sequence).toBe(0);
    expect(second.sequence).toBe(1);
  });

  it("does not send when no clients are connected", () => {
    const broadcaster = new MarketBroadcaster({
      snapshotBuilder: new MarketSnapshotBuilder(new MarketStateStore()),
      clients: createFakeClients([]),
      intervalMs: 100
    });

    broadcaster.start();
    vi.advanceTimersByTime(300);

    expect(broadcaster).toBeDefined();
  });

  it("skips non-open clients", () => {
    const store = new MarketStateStore();
    seedBtcSnapshot(store);

    const openClient = new FakeClientWebSocket();
    const closedClient = new FakeClientWebSocket();
    closedClient.readyState = WebSocket.CLOSED;

    const broadcaster = new MarketBroadcaster({
      snapshotBuilder: new MarketSnapshotBuilder(store),
      clients: createFakeClients([openClient, closedClient]),
      intervalMs: 100
    });

    broadcaster.start();
    vi.advanceTimersByTime(100);

    expect(openClient.sent).toHaveLength(1);
    expect(closedClient.sent).toHaveLength(0);
  });

  it("skips clients whose bufferedAmount exceeds the threshold", () => {
    const store = new MarketStateStore();
    seedBtcSnapshot(store);

    const slowClient = new FakeClientWebSocket();
    slowClient.bufferedAmount = 2_000_000;
    const healthyClient = new FakeClientWebSocket();

    const broadcaster = new MarketBroadcaster({
      snapshotBuilder: new MarketSnapshotBuilder(store),
      clients: createFakeClients([slowClient, healthyClient]),
      intervalMs: 100,
      maxBufferedAmountBytes: 1_000_000,
      maxConsecutiveSlowTicks: 5
    });

    broadcaster.start();
    vi.advanceTimersByTime(100);

    expect(slowClient.sent).toHaveLength(0);
    expect(healthyClient.sent).toHaveLength(1);
  });

  it("closes clients after max consecutive slow ticks", () => {
    const store = new MarketStateStore();
    seedBtcSnapshot(store);

    const slowClient = new FakeClientWebSocket();
    slowClient.bufferedAmount = 2_000_000;
    const clients = createFakeClients([slowClient]);
    const removed = (
      clients as MarketBroadcastClients & {
        removed: Array<{
          client: FakeClientWebSocket;
          code: number;
          reason: string;
        }>;
      }
    ).removed;

    const broadcaster = new MarketBroadcaster({
      snapshotBuilder: new MarketSnapshotBuilder(store),
      clients,
      intervalMs: 100,
      maxBufferedAmountBytes: 1_000_000,
      maxConsecutiveSlowTicks: 3
    });

    broadcaster.start();
    vi.advanceTimersByTime(300);

    expect(slowClient.sent).toHaveLength(0);
    expect(slowClient.closedWith).toEqual({
      code: 1008,
      reason: "Slow consumer"
    });
    expect(removed).toHaveLength(1);
  });

  it("stop() clears timers and prevents further sends", () => {
    const store = new MarketStateStore();
    seedBtcSnapshot(store);

    const client = new FakeClientWebSocket();
    const broadcaster = new MarketBroadcaster({
      snapshotBuilder: new MarketSnapshotBuilder(store),
      clients: createFakeClients([client]),
      intervalMs: 100
    });

    broadcaster.start();
    vi.advanceTimersByTime(100);
    broadcaster.stop();
    vi.advanceTimersByTime(300);

    expect(client.sent).toHaveLength(1);
  });
});

describe("MarketBroadcaster integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delivers a valid market.snapshot.batch built from MarketStateStore data", () => {
    const store = new MarketStateStore();
    seedBtcSnapshot(store);

    const client = new FakeClientWebSocket();
    const broadcaster = new MarketBroadcaster({
      snapshotBuilder: new MarketSnapshotBuilder(store),
      clients: createFakeClients([client]),
      intervalMs: 50,
      now: () => 99
    });

    broadcaster.start();
    vi.advanceTimersByTime(50);

    const message = MarketSnapshotBatchMessageSchema.parse(
      JSON.parse(client.sent[0] ?? "{}")
    );
    const btcSnapshot = message.pairs.find((pair) => pair.pair === "BTCUSDT");

    expect(btcSnapshot).toEqual(
      expect.objectContaining({
        pair: "BTCUSDT",
        displayName: "BTC / USDT",
        price: 109235.42,
        spread: expect.any(Number),
        buyPressure: expect.any(Number),
        sellPressure: expect.any(Number),
        bids: expect.any(Array),
        asks: expect.any(Array),
        lastUpdated: 1_720_802_025_001
      })
    );
  });
});

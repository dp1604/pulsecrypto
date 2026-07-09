import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket, type RawData } from "ws";
import { MarketStateStore } from "../market/MarketStateStore";
import { BinanceReconnectPolicy } from "./BinanceReconnectPolicy";
import { BinanceStreamClient } from "./BinanceStreamClient";

const silentLogger = {
  info: () => undefined,
  warn: () => undefined
};

const validBtcTickerMessage = JSON.stringify({
  stream: "btcusdt@ticker",
  data: {
    e: "24hrTicker",
    E: 1720802025000,
    s: "BTCUSDT",
    c: "109235.42",
    P: "1.82",
    h: "110000",
    l: "105000",
    v: "18250.32"
  }
});

const validBtcDepthMessage = JSON.stringify({
  stream: "btcusdt@depth20@100ms",
  data: {
    lastUpdateId: 123,
    bids: [
      ["109235.41", "1.5"],
      ["109235.4", "2"]
    ],
    asks: [
      ["109235.43", "0.8"],
      ["109235.44", "1.2"]
    ]
  }
});

class FakeWebSocket extends EventEmitter {
  readyState: number = WebSocket.CONNECTING;

  emitMessage(data: string): void {
    this.emit("message", data as unknown as RawData);
  }

  emitClose(code = 1006, reason = "connection lost"): void {
    this.readyState = WebSocket.CLOSED;
    this.emit("close", code, Buffer.from(reason));
  }

  close(): void {
    if (this.readyState === WebSocket.CLOSED) {
      return;
    }

    this.readyState = WebSocket.CLOSED;
    this.emit("close", 1000, Buffer.from("client closed"));
  }

  terminate(): void {
    this.close();
  }

  removeAllListeners(event?: string | symbol): this {
    return super.removeAllListeners(event);
  }
}

type ClientHarness = {
  client: BinanceStreamClient;
  store: MarketStateStore;
  sockets: FakeWebSocket[];
};

const createClientHarness = (
  options?: Partial<ConstructorParameters<typeof BinanceStreamClient>[0]>
): ClientHarness => {
  const store = new MarketStateStore();
  const sockets: FakeWebSocket[] = [];

  const client = new BinanceStreamClient({
    marketStateStore: store,
    logger: silentLogger,
    now: () => 1720802025999,
    reconnectPolicy: new BinanceReconnectPolicy({
      minDelayMs: 50,
      maxDelayMs: 50,
      jitterRatio: 0
    }),
    createWebSocket: () => {
      const socket = new FakeWebSocket();
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
    ...options
  });

  return { client, store, sockets };
};

describe("BinanceStreamClient", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("start() opens only one upstream socket when called twice", () => {
    const { client, sockets } = createClientHarness();

    client.start();
    client.start();

    expect(sockets).toHaveLength(1);
  });

  it("routes valid ticker messages into MarketStateStore", () => {
    const { client, store, sockets } = createClientHarness();

    client.start();
    sockets[0]?.emitMessage(validBtcTickerMessage);

    expect(store.getPairState("BTCUSDT")?.ticker).toEqual({
      price: 109235.42,
      change24hPercent: 1.82,
      high24h: 110000,
      low24h: 105000,
      volume24h: 18250.32,
      timestamp: 1720802025000
    });
  });

  it("routes valid partial-depth messages into MarketStateStore", () => {
    const { client, store, sockets } = createClientHarness();

    client.start();
    sockets[0]?.emitMessage(validBtcDepthMessage);

    expect(store.getPairState("BTCUSDT")?.depth).toEqual({
      bids: [
        { price: 109235.41, quantity: 1.5, total: 163853.115 },
        { price: 109235.4, quantity: 2, total: 218470.8 }
      ],
      asks: [
        { price: 109235.43, quantity: 0.8, total: 87388.344 },
        { price: 109235.44, quantity: 1.2, total: 131082.528 }
      ],
      timestamp: 1720802025999
    });
  });

  it("ignores malformed messages without throwing or mutating state", () => {
    const { client, store, sockets } = createClientHarness();

    client.start();

    expect(() => {
      sockets[0]?.emitMessage("not-json");
      sockets[0]?.emitMessage(JSON.stringify({ stream: "btcusdt@ticker" }));
      sockets[0]?.emitMessage(
        JSON.stringify({
          stream: "btcusdt@ticker",
          data: { s: "BTCUSDT", c: "bad", P: "1" }
        })
      );
    }).not.toThrow();

    expect(store.getPairState("BTCUSDT")?.ticker).toBeUndefined();
    expect(store.getPairState("BTCUSDT")?.depth).toBeUndefined();
  });

  it("stop() prevents reconnect after the upstream socket closes", () => {
    vi.useFakeTimers();

    const { client, sockets } = createClientHarness();

    client.start();
    client.stop();
    sockets[0]?.emitClose();

    vi.runAllTimers();

    expect(sockets).toHaveLength(1);
  });

  it("schedules reconnect after an unexpected upstream close", () => {
    vi.useFakeTimers();

    const { client, sockets } = createClientHarness();

    client.start();
    sockets[0]?.emitClose();

    expect(sockets).toHaveLength(1);

    vi.advanceTimersByTime(50);

    expect(sockets).toHaveLength(2);
  });
});

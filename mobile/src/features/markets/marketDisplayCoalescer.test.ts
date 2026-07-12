import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PairSymbol } from "@pulsecrypto/shared";
import {
  createMarketDisplayCoalescer,
  DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS
} from "./marketDisplayCoalescer";

const pair = "BTCUSDT" as PairSymbol;

const snapshot = (price: number, lastUpdated: number, symbol: PairSymbol = pair) => ({
  pair: symbol,
  displayName: "BTC / USDT",
  price,
  change24hPercent: 1,
  spread: 1,
  buyPressure: 50,
  sellPressure: 50,
  bids: [{ price: price - 1, quantity: 1, total: 1 }],
  asks: [{ price: price + 1, quantity: 1, total: 1 }],
  lastUpdated
});

const batch = (
  sequence: number,
  price: number,
  lastUpdated: number,
  pairs = [snapshot(price, lastUpdated)]
) => ({
  sequence,
  sentAt: lastUpdated,
  pairs
});

describe("marketDisplayCoalescer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("publishes the first batch immediately", () => {
    const publishes: number[] = [];
    const coalescer = createMarketDisplayCoalescer({
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      now: () => 1000,
      onPublish: (payload) => {
        publishes.push(payload.lastAcceptedSequence);
      }
    });

    coalescer.acceptBatch(batch(1, 100, 1000), {});

    expect(publishes).toEqual([1]);
  });

  it("coalesces multiple batches inside 250ms into one later publication", () => {
    const publishes: number[] = [];
    const coalescer = createMarketDisplayCoalescer({
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      now: () => 1000,
      onPublish: (payload) => {
        publishes.push(payload.lastAcceptedSequence);
      }
    });

    coalescer.acceptBatch(batch(1, 100, 1000), {});
    coalescer.acceptBatch(batch(2, 101, 1050), { BTCUSDT: snapshot(100, 1000) });
    coalescer.acceptBatch(batch(3, 102, 1100), { BTCUSDT: snapshot(101, 1050) });

    expect(publishes).toEqual([1]);
    expect(coalescer.hasPendingTimer()).toBe(true);

    vi.advanceTimersByTime(DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS);

    expect(publishes).toEqual([1, 3]);
  });

  it("retains the newest sequence and values for every pair", () => {
    let published: ReturnType<typeof createMarketDisplayCoalescer> | null = null;
    let latestPrice = 0;
    let latestEth = 0;

    const coalescer = createMarketDisplayCoalescer({
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      now: () => 2000,
      onPublish: (payload) => {
        latestPrice = payload.snapshotsByPair.BTCUSDT?.price ?? 0;
        latestEth = payload.snapshotsByPair.ETHUSDT?.price ?? 0;
      }
    });
    published = coalescer;

    coalescer.acceptBatch(batch(1, 100, 1000), {});
    coalescer.acceptBatch(
      {
        sequence: 2,
        sentAt: 1100,
        pairs: [
          snapshot(110, 1100, "BTCUSDT"),
          snapshot(20, 1100, "ETHUSDT")
        ]
      },
      { BTCUSDT: snapshot(100, 1000) }
    );

    vi.advanceTimersByTime(DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS);

    expect(latestPrice).toBe(110);
    expect(latestEth).toBe(20);
    expect(published.getPendingSequence()).toBeNull();
  });

  it("rejects stale per-pair timestamps while coalescing", () => {
    let latestPrice = 0;
    const coalescer = createMarketDisplayCoalescer({
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      now: () => 3000,
      onPublish: (payload) => {
        latestPrice = payload.snapshotsByPair.BTCUSDT?.price ?? 0;
      }
    });

    coalescer.acceptBatch(batch(1, 200, 2000), {});
    coalescer.acceptBatch(batch(2, 150, 1500), { BTCUSDT: snapshot(200, 2000) });

    vi.advanceTimersByTime(DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS);

    expect(latestPrice).toBe(200);
  });

  it("keeps only one publish timer", () => {
    const coalescer = createMarketDisplayCoalescer({
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      now: () => 1000,
      onPublish: () => undefined
    });

    coalescer.acceptBatch(batch(1, 100, 1000), {});
    coalescer.acceptBatch(batch(2, 101, 1050), { BTCUSDT: snapshot(100, 1000) });
    coalescer.acceptBatch(batch(3, 102, 1100), { BTCUSDT: snapshot(101, 1050) });

    expect(coalescer.hasPendingTimer()).toBe(true);
  });

  it("clears pending timer on stop without a late publish", () => {
    const publishes: number[] = [];
    const coalescer = createMarketDisplayCoalescer({
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      now: () => 1000,
      onPublish: (payload) => {
        publishes.push(payload.lastAcceptedSequence);
      }
    });

    coalescer.acceptBatch(batch(1, 100, 1000), {});
    coalescer.acceptBatch(batch(2, 101, 1050), { BTCUSDT: snapshot(100, 1000) });
    coalescer.stop();

    vi.advanceTimersByTime(DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS);

    expect(publishes).toEqual([1]);
    expect(coalescer.hasPendingTimer()).toBe(false);
  });

  it("clears pending timer on pause", () => {
    const publishes: number[] = [];
    const coalescer = createMarketDisplayCoalescer({
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      now: () => 1000,
      onPublish: (payload) => {
        publishes.push(payload.lastAcceptedSequence);
      }
    });

    coalescer.acceptBatch(batch(1, 100, 1000), {});
    coalescer.acceptBatch(batch(2, 101, 1050), { BTCUSDT: snapshot(100, 1000) });
    coalescer.pause();

    vi.advanceTimersByTime(DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS);

    expect(publishes).toEqual([1]);
    expect(coalescer.hasPendingTimer()).toBe(false);
  });

  it("publishes immediately after resume on the next batch", () => {
    const publishes: number[] = [];
    const coalescer = createMarketDisplayCoalescer({
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      now: () => 1000,
      onPublish: (payload) => {
        publishes.push(payload.lastAcceptedSequence);
      }
    });

    coalescer.acceptBatch(batch(1, 100, 1000), {});
    coalescer.pause();
    coalescer.resume();
    coalescer.acceptBatch(batch(2, 101, 2000), { BTCUSDT: snapshot(100, 1000) });

    expect(publishes).toEqual([1, 2]);
  });

  it("publishes immediately after markSessionStart on the next batch", () => {
    const publishes: number[] = [];
    const coalescer = createMarketDisplayCoalescer({
      setTimeout: setTimeout,
      clearTimeout: clearTimeout,
      now: () => 1000,
      onPublish: (payload) => {
        publishes.push(payload.lastAcceptedSequence);
      }
    });

    coalescer.acceptBatch(batch(1, 100, 1000), {});
    coalescer.acceptBatch(batch(2, 101, 1050), { BTCUSDT: snapshot(100, 1000) });
    vi.advanceTimersByTime(DEFAULT_MARKET_DISPLAY_PUBLISH_INTERVAL_MS);
    coalescer.markSessionStart();
    coalescer.acceptBatch(batch(3, 102, 2000), { BTCUSDT: snapshot(101, 1050) });

    expect(publishes).toEqual([1, 2, 3]);
  });
});

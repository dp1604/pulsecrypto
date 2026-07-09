import { describe, expect, it } from "vitest";
import { SUPPORTED_PAIR_SYMBOLS } from "@pulsecrypto/shared";
import { buildSnapshotFromState, MarketSnapshotBuilder } from "./MarketSnapshotBuilder";
import { MarketStateStore } from "./MarketStateStore";

describe("MarketSnapshotBuilder", () => {
  it("outputs one safe snapshot per supported pair", () => {
    const builder = new MarketSnapshotBuilder(new MarketStateStore());

    expect(builder.buildAllSnapshots().map((snapshot) => snapshot.pair)).toEqual(
      [...SUPPORTED_PAIR_SYMBOLS]
    );
  });

  it("builds a safe snapshot from ticker without depth", () => {
    const store = new MarketStateStore();

    store.updateTicker({
      pair: "BTCUSDT",
      price: "109235.42",
      change24hPercent: "1.82",
      high24h: "110000",
      low24h: "105000",
      volume24h: "18250.32",
      timestamp: "1720802025000"
    });

    expect(new MarketSnapshotBuilder(store).buildPairSnapshot("BTCUSDT")).toEqual(
      {
        pair: "BTCUSDT",
        displayName: "BTC / USDT",
        price: 109235.42,
        change24hPercent: 1.82,
        spread: 0,
        buyPressure: 0,
        sellPressure: 0,
        bids: [],
        asks: [],
        lastUpdated: 1720802025000
      }
    );
  });

  it("builds a safe snapshot from depth without ticker", () => {
    const store = new MarketStateStore();

    store.updateOrderBook({
      pair: "ETHUSDT",
      bids: [
        ["100", "2"],
        ["99", "1"]
      ],
      asks: [
        ["101", "3"],
        ["102", "3"]
      ],
      timestamp: "1720802025001"
    });

    expect(new MarketSnapshotBuilder(store).buildPairSnapshot("ETHUSDT")).toEqual(
      {
        pair: "ETHUSDT",
        displayName: "ETH / USDT",
        price: 0,
        change24hPercent: 0,
        spread: 1,
        buyPressure: (3 / 9) * 100,
        sellPressure: 100 - (3 / 9) * 100,
        bids: [
          {
            price: 100,
            quantity: 2,
            total: 200
          },
          {
            price: 99,
            quantity: 1,
            total: 99
          }
        ],
        asks: [
          {
            price: 101,
            quantity: 3,
            total: 303
          },
          {
            price: 102,
            quantity: 3,
            total: 306
          }
        ],
        lastUpdated: 1720802025001
      }
    );
  });

  it("handles empty bids and asks without crashing", () => {
    const snapshot = buildSnapshotFromState({
      pair: "XRPUSDT",
      displayName: "XRP / USDT",
      depth: {
        bids: [],
        asks: [],
        timestamp: 12
      }
    });

    expect(snapshot).toEqual({
      pair: "XRPUSDT",
      displayName: "XRP / USDT",
      price: 0,
      change24hPercent: 0,
      spread: 0,
      buyPressure: 0,
      sellPressure: 0,
      bids: [],
      asks: [],
      lastUpdated: 12
    });
  });

  it("uses the latest timestamp from ticker or depth", () => {
    const store = new MarketStateStore();

    store.updateTicker({
      pair: "DOGEUSDT",
      price: "0.2",
      change24hPercent: "0.5",
      high24h: "0.21",
      low24h: "0.19",
      volume24h: "1000",
      timestamp: "10"
    });
    store.updateOrderBook({
      pair: "DOGEUSDT",
      bids: [["0.2", "10"]],
      asks: [["0.21", "20"]],
      timestamp: "20"
    });

    expect(
      new MarketSnapshotBuilder(store).buildPairSnapshot("DOGEUSDT")?.lastUpdated
    ).toBe(20);
  });

  it("returns undefined for unsupported pair snapshots", () => {
    const builder = new MarketSnapshotBuilder(new MarketStateStore());

    expect(builder.buildPairSnapshot("UNKNOWN" as never)).toBeUndefined();
  });
});

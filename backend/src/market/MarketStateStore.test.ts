import { describe, expect, it } from "vitest";
import { SUPPORTED_PAIR_SYMBOLS } from "@pulsecrypto/shared";
import { MarketStateStore } from "./MarketStateStore";

describe("MarketStateStore", () => {
  it("initializes safely for supported pairs only", () => {
    const store = new MarketStateStore();

    expect(store.getAllStates()).toEqual(
      expect.arrayContaining(
        SUPPORTED_PAIR_SYMBOLS.map((pair) =>
          expect.objectContaining({
            pair,
            displayName: expect.any(String)
          })
        )
      )
    );
    expect(store.getAllStates()).toHaveLength(SUPPORTED_PAIR_SYMBOLS.length);
    expect(store.getPairState("UNKNOWN")).toBeUndefined();
  });

  it("ignores unknown pair updates", () => {
    const store = new MarketStateStore();

    expect(
      store.updateTicker({
        pair: "UNKNOWN",
        price: "100",
        change24hPercent: "1",
        high24h: "110",
        low24h: "90",
        volume24h: "1000",
        timestamp: "1720802025000"
      })
    ).toBe(false);
    expect(
      store.updateOrderBook({
        pair: "UNKNOWN",
        bids: [["100", "1"]],
        asks: [["101", "1"]],
        timestamp: "1720802025000"
      })
    ).toBe(false);
    expect(store.getAllStates()).toHaveLength(SUPPORTED_PAIR_SYMBOLS.length);
  });

  it("stores the latest valid ticker update", () => {
    const store = new MarketStateStore();

    expect(
      store.updateTicker({
        pair: "BTCUSDT",
        price: "109235.42",
        change24hPercent: "-1.23",
        high24h: "110000",
        low24h: "105000",
        volume24h: "18250.32",
        timestamp: "1720802025000"
      })
    ).toBe(true);

    expect(store.getPairState("BTCUSDT")?.ticker).toEqual({
      price: 109235.42,
      change24hPercent: -1.23,
      high24h: 110000,
      low24h: 105000,
      volume24h: 18250.32,
      timestamp: 1720802025000
    });
  });

  it("rejects invalid ticker numeric values without crashing", () => {
    const store = new MarketStateStore();

    expect(
      store.updateTicker({
        pair: "BTCUSDT",
        price: "bad",
        change24hPercent: "1",
        high24h: "110",
        low24h: "90",
        volume24h: "1000",
        timestamp: "1720802025000"
      })
    ).toBe(false);
    expect(store.getPairState("BTCUSDT")?.ticker).toBeUndefined();
  });

  it("does not overwrite ticker state with older or equal timestamps", () => {
    const store = new MarketStateStore();

    expect(
      store.updateTicker({
        pair: "BTCUSDT",
        price: "100",
        change24hPercent: "1",
        high24h: "110",
        low24h: "90",
        volume24h: "1000",
        timestamp: "200"
      })
    ).toBe(true);

    expect(
      store.updateTicker({
        pair: "BTCUSDT",
        price: "101",
        change24hPercent: "2",
        high24h: "111",
        low24h: "91",
        volume24h: "1001",
        timestamp: "200"
      })
    ).toBe(false);
    expect(
      store.updateTicker({
        pair: "BTCUSDT",
        price: "102",
        change24hPercent: "3",
        high24h: "112",
        low24h: "92",
        volume24h: "1002",
        timestamp: "199"
      })
    ).toBe(false);

    expect(store.getPairState("BTCUSDT")?.ticker).toEqual({
      price: 100,
      change24hPercent: 1,
      high24h: 110,
      low24h: 90,
      volume24h: 1000,
      timestamp: 200
    });
  });

  it("stores sorted and capped order book state", () => {
    const store = new MarketStateStore();

    expect(
      store.updateOrderBook({
        pair: "ETHUSDT",
        bids: [
          ["100", "2"],
          ["102", "1"],
          ["101", "3"]
        ],
        asks: [
          ["106", "4"],
          ["104", "1"],
          ["105", "2"]
        ],
        timestamp: "1720802025001",
        depthLimit: 2
      })
    ).toBe(true);

    expect(store.getPairState("ETHUSDT")?.depth).toEqual({
      bids: [
        {
          price: 102,
          quantity: 1,
          total: 102
        },
        {
          price: 101,
          quantity: 3,
          total: 303
        }
      ],
      asks: [
        {
          price: 104,
          quantity: 1,
          total: 104
        },
        {
          price: 105,
          quantity: 2,
          total: 210
        }
      ],
      timestamp: 1720802025001
    });
  });

  it("rejects invalid order book timestamps without mutating depth state", () => {
    const store = new MarketStateStore();

    expect(
      store.updateOrderBook({
        pair: "ETHUSDT",
        bids: [["100", "2"]],
        asks: [["101", "1"]],
        timestamp: "100"
      })
    ).toBe(true);

    const existingDepth = store.getPairState("ETHUSDT")?.depth;
    const invalidUpdates: unknown[] = [
      {
        pair: "ETHUSDT",
        bids: [["110", "2"]],
        asks: [["111", "1"]],
        timestamp: "bad"
      },
      {
        pair: "ETHUSDT",
        bids: [["110", "2"]],
        asks: [["111", "1"]],
        timestamp: "-1"
      },
      {
        pair: "ETHUSDT",
        bids: [["110", "2"]],
        asks: [["111", "1"]],
        timestamp: "Infinity"
      },
      {
        pair: "ETHUSDT",
        bids: [["110", "2"]],
        asks: [["111", "1"]]
      }
    ];

    for (const update of invalidUpdates) {
      expect(
        store.updateOrderBook(
          update as Parameters<MarketStateStore["updateOrderBook"]>[0]
        )
      ).toBe(false);
      expect(store.getPairState("ETHUSDT")?.depth).toEqual(existingDepth);
    }
  });

  it("does not overwrite depth state with older or equal timestamps", () => {
    const store = new MarketStateStore();

    expect(
      store.updateOrderBook({
        pair: "ETHUSDT",
        bids: [["100", "2"]],
        asks: [["101", "1"]],
        timestamp: "200"
      })
    ).toBe(true);

    expect(
      store.updateOrderBook({
        pair: "ETHUSDT",
        bids: [["110", "2"]],
        asks: [["111", "1"]],
        timestamp: "200"
      })
    ).toBe(false);
    expect(
      store.updateOrderBook({
        pair: "ETHUSDT",
        bids: [["120", "2"]],
        asks: [["121", "1"]],
        timestamp: "199"
      })
    ).toBe(false);

    expect(store.getPairState("ETHUSDT")?.depth).toEqual({
      bids: [
        {
          price: 100,
          quantity: 2,
          total: 200
        }
      ],
      asks: [
        {
          price: 101,
          quantity: 1,
          total: 101
        }
      ],
      timestamp: 200
    });
  });

  it("does not store raw event history", () => {
    const store = new MarketStateStore();

    store.updateTicker({
      pair: "SOLUSDT",
      price: "170",
      change24hPercent: "1",
      high24h: "180",
      low24h: "160",
      volume24h: "1000",
      timestamp: "100"
    });
    store.updateTicker({
      pair: "SOLUSDT",
      price: "171",
      change24hPercent: "2",
      high24h: "181",
      low24h: "161",
      volume24h: "2000",
      timestamp: "200"
    });
    store.updateOrderBook({
      pair: "SOLUSDT",
      bids: Array.from({ length: 40 }, (_, index) => [
        String(100 - index),
        "1"
      ]),
      asks: Array.from({ length: 40 }, (_, index) => [
        String(101 + index),
        "1"
      ]),
      timestamp: "300",
      depthLimit: 5
    });

    const state = store.getPairState("SOLUSDT");

    expect(state?.ticker?.price).toBe(171);
    expect(state?.depth?.bids).toHaveLength(5);
    expect(state?.depth?.asks).toHaveLength(5);
    expect(Object.keys(state ?? {}).sort()).toEqual([
      "depth",
      "displayName",
      "pair",
      "ticker"
    ]);
    expect("events" in (state ?? {})).toBe(false);
    expect("history" in (state ?? {})).toBe(false);
  });

  it("returns cloned state so callers cannot mutate the store", () => {
    const store = new MarketStateStore();

    store.updateOrderBook({
      pair: "DOGEUSDT",
      bids: [["0.2", "10"]],
      asks: [["0.21", "5"]],
      timestamp: "1"
    });

    const state = store.getPairState("DOGEUSDT");

    state?.depth?.bids.push({
      price: 999,
      quantity: 999,
      total: 998001
    });

    expect(store.getPairState("DOGEUSDT")?.depth?.bids).toEqual([
      {
        price: 0.2,
        quantity: 10,
        total: 2
      }
    ]);
  });
});

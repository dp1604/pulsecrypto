import { describe, expect, it } from "vitest";
import {
  computePressure,
  computeSpread,
  normalizeOrderBookLevels
} from "./marketCalculations";

describe("marketCalculations", () => {
  it("normalizes levels, computes totals, sorts bids descending, and caps depth", () => {
    const bids = normalizeOrderBookLevels(
      [
        ["100", "2"],
        ["102", "1.5"],
        ["101", "3"]
      ],
      "bid",
      2
    );

    expect(bids).toEqual([
      {
        price: 102,
        quantity: 1.5,
        total: 153
      },
      {
        price: 101,
        quantity: 3,
        total: 303
      }
    ]);
  });

  it("normalizes levels, computes totals, sorts asks ascending, and caps depth", () => {
    const asks = normalizeOrderBookLevels(
      [
        { price: "105", quantity: "2" },
        { price: "103", quantity: "1.25" },
        { price: "104", quantity: "3" }
      ],
      "ask",
      2
    );

    expect(asks).toEqual([
      {
        price: 103,
        quantity: 1.25,
        total: 128.75
      },
      {
        price: 104,
        quantity: 3,
        total: 312
      }
    ]);
  });

  it("uses a default order book depth of 20", () => {
    const levels = Array.from({ length: 25 }, (_, index) => [
      String(100 + index),
      "1"
    ] as const);

    expect(normalizeOrderBookLevels(levels, "bid")).toHaveLength(20);
  });

  it("filters invalid numeric values safely", () => {
    const levels = normalizeOrderBookLevels(
      [
        ["100", "2"],
        ["NaN", "2"],
        ["101", "0"],
        ["102", "-1"],
        ["Infinity", "1"],
        ["103", "bad"]
      ],
      "bid"
    );

    expect(levels).toEqual([
      {
        price: 100,
        quantity: 2,
        total: 200
      }
    ]);
  });

  it("computes spread from best ask minus best bid", () => {
    const bids = normalizeOrderBookLevels([["100", "2"]], "bid");
    const asks = normalizeOrderBookLevels([["100.75", "1"]], "ask");

    expect(computeSpread(bids, asks)).toBe(0.75);
  });

  it("returns undefined spread when either side is missing", () => {
    expect(computeSpread([], [])).toBeUndefined();
  });

  it("computes buy and sell pressure from top quantities", () => {
    const bids = normalizeOrderBookLevels(
      [
        ["100", "2"],
        ["99", "4"]
      ],
      "bid"
    );
    const asks = normalizeOrderBookLevels([["101", "3"]], "ask");

    expect(computePressure(bids, asks)).toEqual({
      buyPressure: (6 / 9) * 100,
      sellPressure: 100 - (6 / 9) * 100
    });
  });

  it("returns zero pressure when total quantity is zero", () => {
    expect(computePressure([], [])).toEqual({
      buyPressure: 0,
      sellPressure: 0
    });
  });
});

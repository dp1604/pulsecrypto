import { describe, expect, it } from "vitest";
import type { PairMeta } from "@pulsecrypto/shared";
import { filterPairs } from "./filterPairs";

const samplePairs: PairMeta[] = [
  {
    pair: "BTCUSDT",
    displayName: "BTC / USDT",
    tradingStatus: "TRADING",
    high24h: 110000,
    low24h: 105000,
    volume24h: 18250.32
  },
  {
    pair: "ETHUSDT",
    displayName: "ETH / USDT",
    tradingStatus: "TRADING",
    high24h: 4200,
    low24h: 3950,
    volume24h: 256900.45
  },
  {
    pair: "SOLUSDT",
    displayName: "SOL / USDT",
    tradingStatus: "TRADING",
    high24h: 185,
    low24h: 171,
    volume24h: 890120.77
  }
];

describe("filterPairs", () => {
  it("returns the original sequence for an empty query", () => {
    const input = [...samplePairs];

    expect(filterPairs(input, "")).toEqual(samplePairs);
    expect(filterPairs(input, "   ")).toEqual(samplePairs);
  });

  it("does not mutate the input array", () => {
    const input = [...samplePairs];

    filterPairs(input, "eth");

    expect(input).toEqual(samplePairs);
  });

  it("matches symbol queries case-insensitively", () => {
    expect(filterPairs(samplePairs, "btcusdt").map((item) => item.pair)).toEqual([
      "BTCUSDT"
    ]);
    expect(filterPairs(samplePairs, "ETH").map((item) => item.pair)).toEqual([
      "ETHUSDT"
    ]);
  });

  it("matches display-name queries", () => {
    expect(filterPairs(samplePairs, "sol /").map((item) => item.pair)).toEqual([
      "SOLUSDT"
    ]);
  });

  it("matches derived base-asset queries", () => {
    expect(filterPairs(samplePairs, "eth").map((item) => item.pair)).toEqual([
      "ETHUSDT"
    ]);
  });

  it("matches derived quote-asset queries", () => {
    expect(filterPairs(samplePairs, "usdt").map((item) => item.pair)).toEqual([
      "BTCUSDT",
      "ETHUSDT",
      "SOLUSDT"
    ]);
  });

  it("treats special characters as plain text", () => {
    expect(filterPairs(samplePairs, "(")).toEqual([]);
    expect(filterPairs(samplePairs, "btc /")).toEqual([
      expect.objectContaining({ pair: "BTCUSDT" })
    ]);
  });

  it("returns no matches when nothing matches", () => {
    expect(filterPairs(samplePairs, "doge")).toEqual([]);
  });

  it("preserves backend order for multiple matches", () => {
    expect(filterPairs(samplePairs, "usdt").map((item) => item.pair)).toEqual([
      "BTCUSDT",
      "ETHUSDT",
      "SOLUSDT"
    ]);
  });
});

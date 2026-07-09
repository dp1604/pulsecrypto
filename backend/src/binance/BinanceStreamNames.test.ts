import { describe, expect, it } from "vitest";
import { SUPPORTED_PAIR_SYMBOLS } from "@pulsecrypto/shared";
import {
  buildBinanceCombinedStreamUrl,
  buildBinanceStreamNames
} from "./BinanceStreamNames";

describe("BinanceStreamNames", () => {
  it("builds depth and ticker streams for all supported pairs", () => {
    const streamNames = buildBinanceStreamNames();

    expect(streamNames).toHaveLength(SUPPORTED_PAIR_SYMBOLS.length * 2);

    for (const pair of SUPPORTED_PAIR_SYMBOLS) {
      const binancePair = pair.toLowerCase();

      expect(streamNames).toContain(`${binancePair}@depth20@100ms`);
      expect(streamNames).toContain(`${binancePair}@ticker`);
    }
  });

  it("does not add unsupported pairs", () => {
    expect(buildBinanceStreamNames(["BTCUSDT", "FAKEUSDT", "ETHUSDT"])).toEqual(
      [
        "btcusdt@depth20@100ms",
        "btcusdt@ticker",
        "ethusdt@depth20@100ms",
        "ethusdt@ticker"
      ]
    );
  });

  it("deduplicates supported pairs while preserving first-seen order", () => {
    expect(buildBinanceStreamNames(["ETHUSDT", "ethusdt", "BTCUSDT"])).toEqual([
      "ethusdt@depth20@100ms",
      "ethusdt@ticker",
      "btcusdt@depth20@100ms",
      "btcusdt@ticker"
    ]);
  });

  it("builds a deterministic combined stream URL", () => {
    expect(
      buildBinanceCombinedStreamUrl({
        baseUrl: "wss://example.test/",
        streamNames: buildBinanceStreamNames(["BTCUSDT", "ETHUSDT"])
      })
    ).toBe(
      "wss://example.test/stream?streams=btcusdt@depth20@100ms/btcusdt@ticker/ethusdt@depth20@100ms/ethusdt@ticker"
    );
  });
});

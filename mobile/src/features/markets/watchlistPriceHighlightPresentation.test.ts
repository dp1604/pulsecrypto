import { describe, expect, it } from "vitest";
import type { WatchlistDisplayValuesAll } from "./marketMotionPresentation";
import {
  createNeutralWatchlistPriceHighlightMap,
  deriveWatchlistPriceHighlightDirection,
  deriveWatchlistPriceHighlightMap,
  WATCHLIST_PRICE_DISPLAY_INDEXES,
  WATCHLIST_PRICE_HIGHLIGHT_DURATION_MS,
  watchlistPriceHighlightMapHasActiveDirection
} from "./watchlistPriceHighlightPresentation";

const values = (
  btc: number | undefined,
  eth: number | undefined,
  sol: number | undefined,
  doge: number | undefined,
  xrp: number | undefined
): WatchlistDisplayValuesAll => [
  btc,
  1.23,
  eth,
  -0.46,
  sol,
  2.1,
  doge,
  -5.55,
  xrp,
  0
];

describe("watchlistPriceHighlightPresentation", () => {
  it("exports a bounded highlight duration", () => {
    expect(WATCHLIST_PRICE_HIGHLIGHT_DURATION_MS).toBeGreaterThanOrEqual(160);
    expect(WATCHLIST_PRICE_HIGHLIGHT_DURATION_MS).toBeLessThanOrEqual(200);
    expect(WATCHLIST_PRICE_HIGHLIGHT_DURATION_MS).toBe(180);
  });

  it("compares only the five visible rounded price primitives", () => {
    expect(WATCHLIST_PRICE_DISPLAY_INDEXES).toEqual([0, 2, 4, 6, 8]);
  });

  it("returns none on first valid price", () => {
    const next = values(64_238.17, 3_456.79, 145.6789, 0.123457, 0.567891);
    const highlights = deriveWatchlistPriceHighlightMap(null, next);

    expect(highlights).toEqual(createNeutralWatchlistPriceHighlightMap());
  });

  it("detects increase, decrease, equal, and invalid transitions", () => {
    expect(deriveWatchlistPriceHighlightDirection(undefined, 1)).toBe("none");
    expect(deriveWatchlistPriceHighlightDirection(1, undefined)).toBe("none");
    expect(deriveWatchlistPriceHighlightDirection(1, 2)).toBe("increase");
    expect(deriveWatchlistPriceHighlightDirection(2, 1)).toBe("decrease");
    expect(deriveWatchlistPriceHighlightDirection(2, 2)).toBe("none");
    expect(deriveWatchlistPriceHighlightDirection(Number.NaN, 2)).toBe("none");
  });

  it("does not highlight when displayed price is unchanged", () => {
    const before = values(64_238.17, 3_456.79, 145.6789, 0.123457, 0.567891);
    const after = values(64_238.17, 3_456.79, 145.6789, 0.123457, 0.567891);

    expect(deriveWatchlistPriceHighlightMap(before, after)).toEqual(
      createNeutralWatchlistPriceHighlightMap()
    );
  });

  it("batches simultaneous multi-pair changes", () => {
    const before = values(64_238.17, 3_456.79, 145.6789, 0.123457, 0.567891);
    const after = values(64_238.18, 3_456.78, 145.679, 0.123456, 0.567892);
    const highlights = deriveWatchlistPriceHighlightMap(before, after);

    expect(highlights.BTCUSDT).toBe("increase");
    expect(highlights.ETHUSDT).toBe("decrease");
    expect(highlights.SOLUSDT).toBe("increase");
    expect(highlights.DOGEUSDT).toBe("decrease");
    expect(highlights.XRPUSDT).toBe("increase");
    expect(watchlistPriceHighlightMapHasActiveDirection(highlights)).toBe(true);
  });
});

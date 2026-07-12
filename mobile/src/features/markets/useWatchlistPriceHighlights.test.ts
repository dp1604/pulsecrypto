import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("useWatchlistPriceHighlights", () => {
  it("uses one list-level controller with one clear timer", () => {
    const source = readFileSync(
      resolve(__dirname, "useWatchlistPriceHighlights.ts"),
      "utf8"
    );

    expect(source.includes("clearTimerRef")).toBe(true);
    expect(source.includes("clearTimerRef.current = setTimeout")).toBe(true);
    expect(source.includes("clearTimeout(clearTimerRef.current)")).toBe(true);
    expect(source.includes("WATCHLIST_PRICE_HIGHLIGHT_DURATION_MS")).toBe(true);
    expect(source.includes("useMarketsLiveStore")).toBe(false);
    expect(source.includes("Animated")).toBe(false);
    expect(source.includes("createNeutralWatchlistPriceHighlightMap")).toBe(true);
    expect(source.includes("deriveWatchlistPriceHighlightMap")).toBe(true);
  });

  it("cleans up the timer on unmount", () => {
    const source = readFileSync(
      resolve(__dirname, "useWatchlistPriceHighlights.ts"),
      "utf8"
    );

    expect(source.includes("() => () =>")).toBe(true);
    expect(source.includes("clearTimeout(clearTimerRef.current)")).toBe(true);
  });

  it("is wired from WatchlistRows without adding row subscriptions", () => {
    const rows = readFileSync(resolve(__dirname, "WatchlistRows.tsx"), "utf8");

    expect(rows.includes("useWatchlistPriceHighlights")).toBe(true);
    expect(rows.match(/useMarketsLiveStore\(/g)?.length).toBe(1);
    expect(rows.includes("priceHighlightDirection")).toBe(true);
  });
});

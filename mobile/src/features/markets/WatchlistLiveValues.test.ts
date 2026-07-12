import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatChange24hPresentation } from "./marketNumberPresentation";
import { formatLivePrice } from "./liveMarketFormatting";

describe("WatchlistLiveValues pure view", () => {
  it("does not subscribe to the live store", () => {
    const source = readFileSync(
      resolve(__dirname, "WatchlistLiveValues.tsx"),
      "utf8"
    );

    expect(source.includes("useMarketsLiveStore")).toBe(false);
    expect(source.includes("useShallow")).toBe(false);
    expect(source.includes("AnimatedPriceValue")).toBe(false);
    expect(source.includes("Animated")).toBe(false);
    expect(source.includes("useReducedMotionPreference")).toBe(false);
    expect(source.includes("motionMode")).toBe(false);
    expect(source.includes("displayPrice:")).toBe(true);
    expect(source.includes("displayChange24h:")).toBe(true);
  });

  it("applies brief buy/sell price text colors from highlight direction", () => {
    const source = readFileSync(
      resolve(__dirname, "WatchlistLiveValues.tsx"),
      "utf8"
    );

    expect(source.includes("priceHighlightDirection")).toBe(true);
    expect(source.includes('direction === "increase"')).toBe(true);
    expect(source.includes('direction === "decrease"')).toBe(true);
    expect(source.includes("colors.buy")).toBe(true);
    expect(source.includes("colors.sell")).toBe(true);
    expect(source.includes("colors.textPrimary")).toBe(true);
    expect(source.includes("backgroundColor")).toBe(false);
    expect(source.includes("overlay")).toBe(false);
  });

  it("formats grouped prices and percentage triangles", () => {
    expect(formatLivePrice(64_238.17)).toBe("64,238.17");
    expect(formatChange24hPresentation(1.23)?.displayText).toBe("▲ 1.23%");
    expect(formatChange24hPresentation(-0.45)?.displayText).toBe("▼ 0.45%");
    expect(formatChange24hPresentation(0)?.displayText).toBe("0.00%");
  });

  it("preserves accessibility labels for price and change", () => {
    const source = readFileSync(
      resolve(__dirname, "WatchlistLiveValues.tsx"),
      "utf8"
    );

    expect(source.includes("accessibilityLabel={`${displayName} live price")).toBe(
      true
    );
    expect(source.includes("accessibilityLabel")).toBe(true);
  });

  it("renders muted unavailable change state without animation overlays", () => {
    const source = readFileSync(
      resolve(__dirname, "WatchlistLiveValues.tsx"),
      "utf8"
    );

    expect(source.includes("Waiting for live data")).toBe(true);
    expect(source.includes("overlay")).toBe(false);
    expect(source.includes("greenOverlay")).toBe(false);
  });
});

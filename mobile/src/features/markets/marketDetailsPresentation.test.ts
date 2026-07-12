import type { OrderBookLevel } from "@pulsecrypto/shared";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCumulativeDepthColumns,
  buildMarketDetailsChangePresentation,
  buildOrderBookColumnLabels,
  classifyPressureLabel,
  computeMaximumVisibleAmount,
  computeRenderableDepthHeight,
  computeOrderBookRowTotal,
  computeRelativeDepthPercent,
  DEFAULT_ORDER_BOOK_VISIBLE_DEPTH,
  deriveMarketDirectionTone,
  derivePriceTone,
  formatFixturePrice,
  formatFixtureVolume,
  formatLastUpdatedUtc,
  formatMarketDetailsChange,
  formatMarketDetailsPrice,
  formatMarketDetailsStatusLabel,
  formatOrderBookAmount,
  formatOrderBookTotal,
  formatPairDisplayLabel,
  formatPressurePercent,
  formatSpreadValue,
  getPairAssetLabels,
  MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT,
  resolveMarketDetailsChangeColor,
  selectVisibleAskLevels,
  selectVisibleBidLevels,
  shouldShowLastKnownLabel
} from "./marketDetailsPresentation";

const sampleBids: OrderBookLevel[] = Array.from({ length: 12 }, (_, index) => ({
  price: 100 - index * 0.1,
  quantity: index + 1,
  total: (100 - index * 0.1) * (index + 1)
}));

const sampleAsks: OrderBookLevel[] = Array.from({ length: 12 }, (_, index) => ({
  price: 100.1 + index * 0.1,
  quantity: (index + 1) * 2,
  total: (100.1 + index * 0.1) * (index + 1) * 2
}));

describe("marketDetailsPresentation", () => {
  it("bounds visible bid and ask levels to the top 10", () => {
    expect(selectVisibleBidLevels(sampleBids)).toHaveLength(
      DEFAULT_ORDER_BOOK_VISIBLE_DEPTH
    );
    expect(selectVisibleAskLevels(sampleAsks)).toHaveLength(
      DEFAULT_ORDER_BOOK_VISIBLE_DEPTH
    );
  });

  it("does not mutate input arrays when selecting visible levels", () => {
    const bids = [...sampleBids];
    const asks = [...sampleAsks];

    selectVisibleBidLevels(bids);
    selectVisibleAskLevels(asks);

    expect(bids).toEqual(sampleBids);
    expect(asks).toEqual(sampleAsks);
  });

  it("preserves backend bid ordering (highest first)", () => {
    const visible = selectVisibleBidLevels(sampleBids);

    expect(visible[0]?.price).toBe(100);
    expect(visible[9]?.price).toBeCloseTo(99.1, 5);
  });

  it("preserves backend ask ordering (lowest first)", () => {
    const visible = selectVisibleAskLevels(sampleAsks);

    expect(visible[0]?.price).toBeCloseTo(100.1, 5);
    expect(visible[9]?.price).toBeCloseTo(101, 5);
  });

  it("computes bid and ask totals from price and quantity", () => {
    expect(
      computeOrderBookRowTotal({ price: 10, quantity: 2, total: 0 })
    ).toBe(20);
    expect(
      computeOrderBookRowTotal({ price: 1.5, quantity: 0.0001, total: 0.00015 })
    ).toBeCloseTo(0.00015, 8);
  });

  it("formats very small and large totals deterministically", () => {
    expect(formatOrderBookAmount(0.00001234)).toBe("0.00001234");
    expect(formatOrderBookTotal(1_250_000.5)).toBe("1,250,000.50");
  });

  it("handles zero values without NaN or Infinity", () => {
    expect(computeMaximumVisibleAmount([])).toBe(0);
    expect(computeRelativeDepthPercent(0, 10)).toBe(0);
    expect(computeRelativeDepthPercent(5, 0)).toBe(0);
    expect(formatOrderBookAmount(Number.NaN)).toBe("—");
    expect(formatOrderBookTotal(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatSpreadValue(Number.NaN)).toBe("—");
    expect(formatPressurePercent(Number.NaN)).toBe("—");
  });

  it("computes maximum visible amount and relative depth percentages", () => {
    const levels = selectVisibleBidLevels(sampleBids);
    const maximum = computeMaximumVisibleAmount(levels);

    expect(maximum).toBe(10);
    expect(computeRelativeDepthPercent(10, maximum)).toBe(100);
    expect(computeRelativeDepthPercent(5, maximum)).toBe(50);
    expect(computeRelativeDepthPercent(15, maximum)).toBe(100);
    expect(computeRelativeDepthPercent(-1, maximum)).toBe(0);
  });

  it("returns zero relative depth when all visible amounts are zero", () => {
    const levels: OrderBookLevel[] = [
      { price: 1, quantity: 0, total: 0 },
      { price: 2, quantity: 0, total: 0 }
    ];

    expect(computeMaximumVisibleAmount(levels)).toBe(0);
    expect(computeRelativeDepthPercent(0, 0)).toBe(0);
  });

  it("formats UTC last-updated timestamps deterministically", () => {
    expect(formatLastUpdatedUtc(Date.UTC(2026, 6, 9, 14, 32, 8, 214))).toBe(
      "Last updated 14:32:08.214 UTC"
    );
    expect(formatLastUpdatedUtc(-1)).toBe("Last updated unavailable");
  });

  it("formats pair display labels and asset symbols", () => {
    expect(formatPairDisplayLabel("BTC / USDT", "BTCUSDT")).toBe("BTC / USDT");
    expect(formatPairDisplayLabel(undefined, "ETHUSDT")).toBe("ETHUSDT");
    expect(getPairAssetLabels("BTCUSDT")).toEqual({
      baseAsset: "BTC",
      quoteAsset: "USDT"
    });
  });

  it("formats market details status labels for waiting and reconnect states", () => {
    expect(formatMarketDetailsStatusLabel("idle", false)).toBe(
      "Waiting for live market data"
    );
    expect(formatMarketDetailsStatusLabel("connected", false)).toBe(
      "Connected, waiting for data"
    );
    expect(formatMarketDetailsStatusLabel("reconnecting", true)).toBe(
      "Reconnecting"
    );
    expect(formatMarketDetailsStatusLabel("disconnected", true)).toBe(
      "Disconnected — showing last known data"
    );
    expect(formatMarketDetailsStatusLabel("live", true)).toBe(
      "Connection: Live"
    );
  });

  it("formats price and change with waiting placeholders when snapshot is absent", () => {
    expect(formatMarketDetailsPrice(undefined, false)).toBe(
      "Waiting for live market data"
    );
    expect(formatMarketDetailsChange(undefined, false)).toBe(
      "Waiting for live market data"
    );
    expect(formatMarketDetailsPrice(109235.42, true)).toBe("109,235.42");
    expect(formatMarketDetailsChange(1.82, true)).toBe("▲ 1.82%");
    expect(formatMarketDetailsChange(-1.82, true)).toBe("▼ 1.82%");
  });

  it("identifies last-known presentation for reconnecting and offline states", () => {
    expect(shouldShowLastKnownLabel("reconnecting", true)).toBe(true);
    expect(shouldShowLastKnownLabel("paused", true)).toBe(true);
    expect(shouldShowLastKnownLabel("disconnected", true)).toBe(true);
    expect(shouldShowLastKnownLabel("connecting", true)).toBe(true);
    expect(shouldShowLastKnownLabel("connected", true)).toBe(true);
    expect(shouldShowLastKnownLabel("live", true)).toBe(false);
    expect(shouldShowLastKnownLabel("reconnecting", false)).toBe(false);
  });

  it("shows last-known label for connecting and connected recovery states", () => {
    expect(shouldShowLastKnownLabel("connecting", true)).toBe(true);
    expect(shouldShowLastKnownLabel("connected", true)).toBe(true);
  });

  it("applies last-known label truth table across all connection states", () => {
    const nonLiveStates = [
      "idle",
      "connecting",
      "connected",
      "reconnecting",
      "paused",
      "disconnected"
    ] as const;

    for (const status of nonLiveStates) {
      expect(shouldShowLastKnownLabel(status, true)).toBe(true);
      expect(shouldShowLastKnownLabel(status, false)).toBe(false);
    }

    expect(shouldShowLastKnownLabel("live", true)).toBe(false);
    expect(shouldShowLastKnownLabel("live", false)).toBe(false);
  });
});

describe("market direction tone", () => {
  it("classifies positive, negative, neutral, and unavailable tones", () => {
    expect(deriveMarketDirectionTone(1.25, true)).toBe("positive");
    expect(derivePriceTone(-0.5, true)).toBe("negative");
    expect(deriveMarketDirectionTone(0, true)).toBe("neutral");
    expect(deriveMarketDirectionTone(undefined, false)).toBe("unavailable");
    expect(deriveMarketDirectionTone(Number.NaN, true)).toBe("unavailable");
  });

  it("classifies rounded-to-zero tiny values as neutral", () => {
    expect(deriveMarketDirectionTone(0.004, true)).toBe("neutral");
    expect(deriveMarketDirectionTone(-0.004, true)).toBe("neutral");
  });
});

describe("market details change color", () => {
  const palette = {
    buy: "#00C57A",
    sell: "#FF3B69",
    textPrimary: "#FFFFFF",
    textMuted: "#8A93A6"
  };

  it("maps semantic tones to palette colors", () => {
    expect(resolveMarketDetailsChangeColor("buy", palette)).toBe(palette.buy);
    expect(resolveMarketDetailsChangeColor("sell", palette)).toBe(palette.sell);
    expect(resolveMarketDetailsChangeColor("primary", palette)).toBe(
      palette.textPrimary
    );
    expect(resolveMarketDetailsChangeColor("muted", palette)).toBe(
      palette.textMuted
    );
  });

  it("uses primary tone for neutral change presentation", () => {
    const presentation = buildMarketDetailsChangePresentation(0, true);
    expect(presentation.tone).toBe("primary");
    expect(resolveMarketDetailsChangeColor(presentation.tone, palette)).toBe(
      palette.textPrimary
    );
  });
});

describe("last price row layout", () => {
  it("selects bottom-edge nowrap row layout at 390dp", () => {
    expect(MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT).toEqual({
      flexDirection: "row",
      alignItems: "flex-end",
      flexWrap: "nowrap",
      gap: 10,
      maxWidth: 390
    });
  });

  it("keeps animated price text from overriding parent bottom-edge alignment", () => {
    const source = readFileSync(
      resolve(__dirname, "AnimatedPriceValue.tsx"),
      "utf8"
    );

    expect(source.includes('alignSelf: "flex-start"')).toBe(false);
    expect(source.includes("flexShrink: 1")).toBe(true);
  });

  it("keeps market details price row nowrap with flex-end alignment", () => {
    const source = readFileSync(
      resolve(__dirname, "../../screens/MarketDetailsScreen.tsx"),
      "utf8"
    );

    expect(MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT.flexWrap).toBe("nowrap");
    expect(MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT.alignItems).toBe("flex-end");
    expect(source).toMatch(
      /priceRow:\s*\{[\s\S]*?flexWrap:\s*MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT\.flexWrap/
    );
    expect(source).toMatch(
      /priceRow:\s*\{[\s\S]*?alignItems:\s*MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT\.alignItems/
    );
  });

  it("keeps percentage shrink without forcing price row wrap", () => {
    const source = readFileSync(
      resolve(__dirname, "../../screens/MarketDetailsScreen.tsx"),
      "utf8"
    );

    expect(source).toMatch(/changeInline:[\s\S]*?flexShrink:\s*1/);
    expect(source).toMatch(/priceValue:[\s\S]*?flexShrink:\s*1/);
    expect(MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT.maxWidth).toBe(390);
  });
});

describe("depth summary presentation", () => {
  it("returns zero-height columns for empty sides", () => {
    const columns = buildCumulativeDepthColumns([], 10);

    expect(columns).toHaveLength(10);
    expect(columns.every((column) => column.heightPercent === 0)).toBe(true);
  });

  it("builds cumulative quantities without mutating source levels", () => {
    const levels = [...sampleBids.slice(0, 3)];
    const columns = buildCumulativeDepthColumns(levels, 3);

    expect(levels).toEqual(sampleBids.slice(0, 3));
    expect(columns[0]?.cumulativeQuantity).toBe(1);
    expect(columns[1]?.cumulativeQuantity).toBe(3);
    expect(columns[2]?.cumulativeQuantity).toBe(6);
    expect(columns[2]?.heightPercent).toBe(100);
  });

  it("normalizes heights between zero and one hundred and remains zero-safe", () => {
    const zeroLevels = [
      { price: 1, quantity: 0, total: 0 },
      { price: 2, quantity: 0, total: 0 }
    ];
    const zeroColumns = buildCumulativeDepthColumns(zeroLevels, 2);

    expect(zeroColumns.every((column) => column.heightPercent === 0)).toBe(true);

    const columns = buildCumulativeDepthColumns(sampleBids.slice(0, 2), 2);
    expect(columns[0]?.heightPercent).toBeGreaterThan(0);
    expect(columns[1]?.heightPercent).toBe(100);
  });

  it("classifies qualitative pressure labels deterministically", () => {
    expect(classifyPressureLabel(60, 40)).toBe("Buy heavy");
    expect(classifyPressureLabel(40, 60)).toBe("Sell heavy");
    expect(classifyPressureLabel(50, 50)).toBe("Balanced");
    expect(classifyPressureLabel(Number.NaN, 50)).toBe("Balanced");
  });

  it("formats fixture metadata compactly", () => {
    expect(formatFixtureVolume(1_830_000)).toBe("1.83M");
    expect(formatFixturePrice(105_000)).toBe("105,000.00");
  });
});

describe("computeRenderableDepthHeight", () => {
  it("returns zero for zero, negative, and non-finite input", () => {
    expect(computeRenderableDepthHeight(0)).toBe(0);
    expect(computeRenderableDepthHeight(-1)).toBe(0);
    expect(computeRenderableDepthHeight(Number.NaN)).toBe(0);
    expect(computeRenderableDepthHeight(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("applies the minimum visible height for positive values below the threshold", () => {
    expect(computeRenderableDepthHeight(1)).toBe(4);
    expect(computeRenderableDepthHeight(3.9)).toBe(4);
    expect(computeRenderableDepthHeight(4)).toBe(4);
    expect(computeRenderableDepthHeight(50)).toBe(50);
    expect(computeRenderableDepthHeight(100)).toBe(100);
    expect(computeRenderableDepthHeight(150)).toBe(100);
  });

  it("keeps empty cumulative-depth columns visually zero while positive columns remain visible", () => {
    const emptyColumns = buildCumulativeDepthColumns([], 10);
    const tinyPositiveColumns = buildCumulativeDepthColumns(
      [
        { price: 100, quantity: 1, total: 100 },
        { price: 99, quantity: 100, total: 9900 }
      ],
      2
    );

    expect(
      emptyColumns.every(
        (column) => computeRenderableDepthHeight(column.heightPercent) === 0
      )
    ).toBe(true);

    expect(computeRenderableDepthHeight(tinyPositiveColumns[0]?.heightPercent ?? 0)).toBe(
      4
    );
    expect(computeRenderableDepthHeight(tinyPositiveColumns[1]?.heightPercent ?? 0)).toBe(
      100
    );
  });

  it("does not produce a positive render height for zero-quantity depth columns", () => {
    const zeroQuantityColumns = buildCumulativeDepthColumns(
      [
        { price: 1, quantity: 0, total: 0 },
        { price: 2, quantity: 0, total: 0 }
      ],
      2
    );

    expect(
      zeroQuantityColumns.every(
        (column) => computeRenderableDepthHeight(column.heightPercent) === 0
      )
    ).toBe(true);
  });
});

describe("buildOrderBookColumnLabels", () => {
  it("builds BTC/USDT visible labels with unit-aware accessibility", () => {
    const labels = buildOrderBookColumnLabels("BTC", "USDT");

    expect(labels.price).toBe("PRICE (USDT)");
    expect(labels.amount).toBe("AMOUNT (BTC)");
    expect(labels.total).toBe("TOTAL");
    expect(labels.accessibilityLabel).toBe(
      "Price in USDT, amount in BTC, total in USDT"
    );
  });

  it("builds ETH/USDT visible labels dynamically", () => {
    const labels = buildOrderBookColumnLabels("ETH", "USDT");

    expect(labels.price).toBe("PRICE (USDT)");
    expect(labels.amount).toBe("AMOUNT (ETH)");
    expect(labels.total).toBe("TOTAL");
    expect(labels.accessibilityLabel).toBe(
      "Price in USDT, amount in ETH, total in USDT"
    );
  });

  it("normalizes lowercase symbols and surrounding whitespace without mutating inputs", () => {
    const baseAsset = "  eth  ";
    const quoteAsset = " usdt ";

    const labels = buildOrderBookColumnLabels(baseAsset, quoteAsset);

    expect(labels.price).toBe("PRICE (USDT)");
    expect(labels.amount).toBe("AMOUNT (ETH)");
    expect(baseAsset).toBe("  eth  ");
    expect(quoteAsset).toBe(" usdt ");
  });

  it("uses an em dash placeholder for empty asset symbols", () => {
    const labels = buildOrderBookColumnLabels("   ", "");

    expect(labels.price).toBe("PRICE (—)");
    expect(labels.amount).toBe("AMOUNT (—)");
    expect(labels.accessibilityLabel).toBe(
      "Price in —, amount in —, total in —"
    );
  });

  it("keeps labels single-line without embedded newlines", () => {
    const labels = buildOrderBookColumnLabels("BTC", "USDT");

    expect(labels.price.includes("\n")).toBe(false);
    expect(labels.amount.includes("\n")).toBe(false);
    expect(labels.total.includes("\n")).toBe(false);
    expect(labels.accessibilityLabel.includes("\n")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  deriveChange24hDirection,
  formatChange24hPresentation,
  formatGroupedDecimal,
  formatHighLowPrice,
  formatMarketPrice,
  formatOrderBookAmount,
  formatOrderBookPrice,
  formatOrderBookTotal,
  formatPercentage,
  formatSpread,
  formatVolume,
  resolveChange24hTone,
  roundChange24hPercent
} from "./marketNumberPresentation";

describe("marketNumberPresentation", () => {
  it("formats grouped market prices", () => {
    expect(formatMarketPrice(64_238.17)).toBe("64,238.17");
    expect(formatMarketPrice(64_044.88)).toBe("64,044.88");
  });

  it("formats order-book values with field precision", () => {
    expect(formatOrderBookPrice(64_239.5)).toBe("64,239.50");
    expect(formatOrderBookAmount(0.4522)).toBe("0.45220");
    expect(formatOrderBookTotal(29_045.12)).toBe("29,045.12");
    expect(formatOrderBookAmount(12_400)).toBe("12,400.00000");
  });

  it("formats high and low with commas", () => {
    expect(formatHighLowPrice(65_120)).toBe("65,120.00");
    expect(formatHighLowPrice(62_800)).toBe("62,800.00");
  });

  it("retains low-value precision", () => {
    expect(formatMarketPrice(0.00012345)).toBe("0.00012345");
    expect(formatOrderBookAmount(0.00012)).toBe("0.00012000");
  });

  it("formats negative permitted values", () => {
    expect(formatGroupedDecimal(-1_234.5, 2)).toBe("-1,234.50");
  });

  it("returns placeholder for invalid values", () => {
    expect(formatMarketPrice(Number.NaN)).toBe("—");
    expect(formatMarketPrice(undefined)).toBe("—");
    expect(formatOrderBookPrice(Number.POSITIVE_INFINITY)).toBe("—");
  });

  it("keeps percentages ungrouped", () => {
    expect(formatPercentage(2.45)).toBe("+2.45%");
    expect(formatPercentage(-2.45)).toBe("-2.45%");
    expect(formatPercentage(0)).toBe("0.00%");
  });

  it("does not use scientific notation", () => {
    const formatted = formatMarketPrice(1_000_000);
    expect(formatted.includes("e")).toBe(false);
    expect(formatted).toBe("1,000,000.00");
  });

  it("formats spread and volume helpers", () => {
    expect(formatSpread(12.34)).toBe("12.3400");
    expect(formatVolume(18_250, true)).toBe("18.25K");
  });

  describe("zero fixed-precision formatting", () => {
    it("formats zero market price with two decimals", () => {
      expect(formatMarketPrice(0)).toBe("0.00");
    });

    it("formats zero order-book price with two decimals", () => {
      expect(formatOrderBookPrice(0)).toBe("0.00");
    });

    it("formats zero order-book amount with five decimals", () => {
      expect(formatOrderBookAmount(0)).toBe("0.00000");
    });

    it("formats zero order-book total with two decimals", () => {
      expect(formatOrderBookTotal(0)).toBe("0.00");
    });

    it("formats zero high/low with two decimals", () => {
      expect(formatHighLowPrice(0)).toBe("0.00");
    });
  });

  describe("24-hour direction", () => {
    it("shows upward triangle for positive change", () => {
      const result = formatChange24hPresentation(2.45);
      expect(result.displayText).toBe("▲ 2.45%");
      expect(result.direction).toBe("positive");
      expect(result.showTriangle).toBe(true);
      expect(result.tone).toBe("buy");
      expect(result.accessibilityLabel).toBe(
        "Up 2.45 percent over 24 hours"
      );
    });

    it("shows downward triangle with absolute percentage", () => {
      const result = formatChange24hPresentation(-2.45);
      expect(result.displayText).toBe("▼ 2.45%");
      expect(result.direction).toBe("negative");
      expect(result.showTriangle).toBe(true);
      expect(result.tone).toBe("sell");
      expect(result.accessibilityLabel).toBe(
        "Down 2.45 percent over 24 hours"
      );
      expect(result.displayText).not.toContain("-");
    });

    it("shows neutral without triangle", () => {
      const result = formatChange24hPresentation(0);
      expect(result.displayText).toBe("0.00%");
      expect(result.direction).toBe("neutral");
      expect(result.showTriangle).toBe(false);
      expect(result.tone).toBe("primary");
    });

    it("treats negative zero as neutral", () => {
      const result = formatChange24hPresentation(-0);
      expect(result.displayText).toBe("0.00%");
      expect(result.direction).toBe("neutral");
      expect(result.showTriangle).toBe(false);
      expect(result.tone).toBe("primary");
    });

    it("classifies tiny positive values rounded to zero as neutral", () => {
      expect(formatChange24hPresentation(0.004)).toEqual(
        expect.objectContaining({
          displayText: "0.00%",
          direction: "neutral",
          showTriangle: false,
          tone: "primary"
        })
      );
    });

    it("classifies tiny negative values rounded to zero as neutral", () => {
      expect(formatChange24hPresentation(-0.004)).toEqual(
        expect.objectContaining({
          displayText: "0.00%",
          direction: "neutral",
          showTriangle: false,
          tone: "primary"
        })
      );
    });

    it("classifies half-up rounding boundary as positive", () => {
      expect(deriveChange24hDirection(0.005)).toBe("positive");
      expect(formatChange24hPresentation(0.005).displayText).toBe("▲ 0.01%");
    });

    it("shows unavailable without triangle", () => {
      const result = formatChange24hPresentation(undefined);
      expect(result.displayText).toBe("—");
      expect(result.direction).toBe("unavailable");
      expect(result.showTriangle).toBe(false);
      expect(result.tone).toBe("muted");
    });

    it("shows unavailable for invalid values", () => {
      const result = formatChange24hPresentation(Number.NaN);
      expect(result.direction).toBe("unavailable");
      expect(result.tone).toBe("muted");
    });

    it("resolves tone colors semantically", () => {
      expect(resolveChange24hTone("positive")).toBe("buy");
      expect(resolveChange24hTone("negative")).toBe("sell");
      expect(resolveChange24hTone("neutral")).toBe("primary");
      expect(resolveChange24hTone("unavailable")).toBe("muted");
    });

    it("rounds percentages to two decimals for classification", () => {
      expect(roundChange24hPercent(2.456)).toBe(2.46);
      expect(roundChange24hPercent(-2.454)).toBe(-2.45);
    });
  });
});

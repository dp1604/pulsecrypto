import { describe, expect, it } from "vitest";
import {
  DEPTH_MIN_CHANGE_THRESHOLD_PERCENT,
  DEPTH_TRANSITION_DURATION_MS,
  PRICE_TICK_COLOR_HOLD_MS,
  PRICE_TICK_COLOR_IN_MS,
  PRICE_TICK_COLOR_OUT_MS,
  PRICE_TICK_COLOR_TOTAL_MS,
  PRICE_TICK_FLASH_MIN_INTERVAL_MS,
  PRICE_TICK_INSTANT_HOLD_MS,
  PRICE_TICK_OPACITY_HOLD_MS,
  PRICE_TICK_OPACITY_IN_MS,
  PRICE_TICK_OPACITY_OUT_MS,
  PRICE_TICK_OPACITY_TOTAL_MS,
  PRICE_TICK_REDUCED_MOTION_HOLD_MS,
  clampDepthTargetPercent,
  classifyPriceMovement,
  hasMeaningfulDepthChange,
  isValidMotionPrice,
  resolveDepthAnimationTarget,
  shouldAnimateDepthTransition,
  shouldTriggerPriceFlash,
  roundDisplayChange24h,
  roundDisplayPrice,
  selectWatchlistDisplayValuesAll,
  selectWatchlistDisplayValuesByPair,
  isSubprecisionPriceChange,
  isSubprecisionChange24hChange
} from "./marketMotionPresentation";

describe("marketMotionPresentation", () => {
  describe("isValidMotionPrice", () => {
    it("accepts positive finite numbers", () => {
      expect(isValidMotionPrice(1)).toBe(true);
      expect(isValidMotionPrice(0.0001)).toBe(true);
    });

    it("rejects zero, negative, and non-finite values", () => {
      expect(isValidMotionPrice(0)).toBe(false);
      expect(isValidMotionPrice(-1)).toBe(false);
      expect(isValidMotionPrice(Number.NaN)).toBe(false);
      expect(isValidMotionPrice(Number.POSITIVE_INFINITY)).toBe(false);
      expect(isValidMotionPrice(undefined)).toBe(false);
      expect(isValidMotionPrice("1")).toBe(false);
    });
  });

  describe("classifyPriceMovement", () => {
    it("returns none for the first valid price", () => {
      expect(classifyPriceMovement(null, 100, false)).toBe("none");
    });

    it("returns increase when the next price is higher", () => {
      expect(classifyPriceMovement(100, 101, false)).toBe("increase");
    });

    it("returns decrease when the next price is lower", () => {
      expect(classifyPriceMovement(100, 99.5, false)).toBe("decrease");
    });

    it("returns equal when the price is unchanged", () => {
      expect(classifyPriceMovement(100, 100, false)).toBe("equal");
    });

    it("returns none when the previous price is invalid", () => {
      expect(classifyPriceMovement(null, 100, false)).toBe("none");
      expect(classifyPriceMovement(0, 100, false)).toBe("none");
    });

    it("returns none when the next price is invalid", () => {
      expect(classifyPriceMovement(100, Number.NaN, false)).toBe("none");
      expect(classifyPriceMovement(100, -1, false)).toBe("none");
    });

    it("returns none after a pair reset without flashing", () => {
      expect(classifyPriceMovement(100, 101, true)).toBe("none");
    });
  });

  describe("clampDepthTargetPercent", () => {
    it("clamps below zero to zero", () => {
      expect(clampDepthTargetPercent(-5)).toBe(0);
    });

    it("clamps above one hundred to one hundred", () => {
      expect(clampDepthTargetPercent(140)).toBe(100);
    });

    it("keeps finite targets unchanged", () => {
      expect(clampDepthTargetPercent(42.5)).toBe(42.5);
    });

    it("maps non-finite targets to zero", () => {
      expect(clampDepthTargetPercent(Number.NaN)).toBe(0);
      expect(clampDepthTargetPercent(Number.POSITIVE_INFINITY)).toBe(0);
    });
  });

  describe("hasMeaningfulDepthChange", () => {
    it("ignores changes below the threshold", () => {
      expect(
        hasMeaningfulDepthChange(40, 40 + DEPTH_MIN_CHANGE_THRESHOLD_PERCENT - 0.1)
      ).toBe(false);
    });

    it("detects meaningful increases", () => {
      expect(hasMeaningfulDepthChange(40, 41)).toBe(true);
    });

    it("detects meaningful decreases", () => {
      expect(hasMeaningfulDepthChange(60, 58)).toBe(true);
    });
  });

  describe("shouldAnimateDepthTransition", () => {
    it("skips animation on first render", () => {
      expect(shouldAnimateDepthTransition(0, 50, true, false)).toBe(false);
    });

    it("skips animation when reduced motion is enabled", () => {
      expect(shouldAnimateDepthTransition(10, 20, false, true)).toBe(false);
    });

    it("animates meaningful depth changes", () => {
      expect(shouldAnimateDepthTransition(10, 20, false, false)).toBe(true);
    });

    it("skips animation for insignificant depth changes", () => {
      expect(shouldAnimateDepthTransition(50, 50.2, false, false)).toBe(false);
    });
  });

  describe("resolveDepthAnimationTarget", () => {
    it("clamps the animation target", () => {
      expect(resolveDepthAnimationTarget(120, false)).toBe(100);
      expect(resolveDepthAnimationTarget(-3, false)).toBe(0);
    });
  });

  describe("motion constants", () => {
    it("keeps native opacity flash duration under the 250ms publication interval", () => {
      expect(PRICE_TICK_OPACITY_TOTAL_MS).toBeLessThan(250);
      expect(PRICE_TICK_OPACITY_IN_MS).toBe(60);
      expect(PRICE_TICK_OPACITY_HOLD_MS).toBe(60);
      expect(PRICE_TICK_OPACITY_OUT_MS).toBe(120);
      expect(PRICE_TICK_COLOR_TOTAL_MS).toBe(PRICE_TICK_OPACITY_TOTAL_MS);
    });

    it("keeps flash cooldown at one and a half seconds after contingency", () => {
      expect(PRICE_TICK_FLASH_MIN_INTERVAL_MS).toBe(1500);
    });

    it("keeps Watchlist instant flash hold bounded", () => {
      expect(PRICE_TICK_INSTANT_HOLD_MS).toBeGreaterThanOrEqual(140);
      expect(PRICE_TICK_INSTANT_HOLD_MS).toBeLessThanOrEqual(180);
    });

    it("keeps reduced-motion hold bounded", () => {
      expect(PRICE_TICK_REDUCED_MOTION_HOLD_MS).toBeGreaterThan(0);
      expect(PRICE_TICK_REDUCED_MOTION_HOLD_MS).toBeLessThan(500);
    });

    it("keeps depth duration bounded near the stream cadence", () => {
      expect(DEPTH_TRANSITION_DURATION_MS).toBeGreaterThanOrEqual(80);
      expect(DEPTH_TRANSITION_DURATION_MS).toBeLessThanOrEqual(120);
    });

    it("never uses zero or excessive durations", () => {
      expect(PRICE_TICK_COLOR_TOTAL_MS).toBeGreaterThan(0);
      expect(DEPTH_TRANSITION_DURATION_MS).toBeGreaterThan(0);
      expect(PRICE_TICK_COLOR_TOTAL_MS).toBeLessThan(1000);
      expect(DEPTH_TRANSITION_DURATION_MS).toBeLessThan(500);
    });
  });

  describe("shouldTriggerPriceFlash", () => {
    it("allows the first qualifying movement after cooldown starts", () => {
      expect(shouldTriggerPriceFlash("increase", null, 1_000)).toBe(true);
    });

    it("blocks flashes inside the cooldown window", () => {
      expect(shouldTriggerPriceFlash("decrease", 1_000, 1_500)).toBe(false);
      expect(shouldTriggerPriceFlash("decrease", 1_000, 1_999)).toBe(false);
    });

    it("allows a flash once cooldown expires", () => {
      expect(shouldTriggerPriceFlash("increase", 1_000, 2_500)).toBe(true);
    });

    it("does not flash equal, none, or reset movements", () => {
      expect(shouldTriggerPriceFlash("equal", null, 1_000)).toBe(false);
      expect(shouldTriggerPriceFlash("none", null, 1_000)).toBe(false);
    });
  });

  describe("display precision selection", () => {
    it("rounds price and change to visible Watchlist precision", () => {
      expect(roundDisplayPrice(64_238.1749)).toBe(64_238.17);
      expect(roundDisplayChange24h(1.23456)).toBe(1.23);
    });

    it("treats subprecision raw changes as invisible", () => {
      expect(isSubprecisionPriceChange(64_238.171, 64_238.172)).toBe(true);
      expect(isSubprecisionChange24hChange(1.231, 1.232)).toBe(true);
    });

    it("selects tuple without order-book fields", () => {
      const state = {
        snapshotsByPair: {
          BTCUSDT: {
            price: 100.123456,
            change24hPercent: 2.3456,
            bids: [{ price: 1, quantity: 1, total: 1 }]
          }
        }
      } as never;
      const tuple = selectWatchlistDisplayValuesByPair("BTCUSDT")(state);
      expect(tuple).toEqual([100.1235, 2.35]);
    });

    it("selects all supported pairs in deterministic order", () => {
      const state = {
        snapshotsByPair: {
          BTCUSDT: { price: 100, change24hPercent: 1 },
          ETHUSDT: { price: 200, change24hPercent: 2 },
          SOLUSDT: { price: 300, change24hPercent: 3 },
          DOGEUSDT: { price: 0.1, change24hPercent: 4 },
          XRPUSDT: { price: 0.5, change24hPercent: 5 }
        }
      } as never;

      expect(selectWatchlistDisplayValuesAll(state)).toEqual([
        100,
        1,
        200,
        2,
        300,
        3,
        0.1,
        4,
        0.5,
        5
      ]);
    });
  });
});

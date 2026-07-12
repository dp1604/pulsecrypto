import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { OrderBookLevel } from "@pulsecrypto/shared";
import {
  assessCoordinateMismatch,
  bidCurveReachesLeftHalf,
  askCurveReachesRightHalf,
  buildAskDepthPoints,
  buildBidDepthPoints,
  buildDepthLinePathWithCenterJoin,
  centerValleyIsAboveBaseline,
  centerValleyToBaselineGap,
  depthCenterJoinIsC1Continuous,
  depthCenterJoinIsHorizontallyTangent,
  depthLinePathStartsAtSharedCenter,
  depthLinePathUsesLineCommandAtCenterJoin,
  depthVisibleYFromNormalized,
  getMarketDepthAskCenterJoinControlPoint,
  getMarketDepthAskShoulderPoint,
  getMarketDepthBidCenterJoinControlPoint,
  getMarketDepthBidShoulderPoint,
  getMarketDepthCenterValleyPoint,
  buildDepthAreaPath,
  buildMarketDepthAccessibilityLabel,
  buildMarketDepthChartModel,
  buildMarketDepthPresentation,
  classifyLiquidityGap,
  classifyMarketDepthPressure,
  computeCumulativeQuantities,
  computeDepthTotals,
  computeLiquidityGapPercent,
  computeSharedDepthMaximum,
  coordinatesFitViewBox,
  extractPathCoordinates,
  filterValidDepthLevels,
  formatCompactDepthQuantity,
  formatLiquidityGapCardValue,
  formatLiquidityGapPercent,
  getPathCoordinateDomain,
  isValidDepthLevel,
  MARKET_DEPTH_CENTER_DIVIDER_X,
  MARKET_DEPTH_CENTER_JOIN_TANGENT_OFFSET,
  MARKET_DEPTH_CENTER_SHOULDER_OFFSET,
  MARKET_DEPTH_CENTER_VALLEY_Y,
  MARKET_DEPTH_BASELINE_Y,
  MARKET_DEPTH_MIN_VALLEY_TO_BASELINE_GAP,
  MARKET_DEPTH_CHART_BORDER_WIDTH_DP,
  MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  MARKET_DEPTH_CHART_HORIZONTAL_PADDING_DP,
  MARKET_DEPTH_CHART_VERTICAL_PADDING_DP,
  MARKET_DEPTH_MIN_VALLEY_TO_CARD_GAP_DP,
  MARKET_DEPTH_DIVIDER_Y_BOTTOM,
  MARKET_DEPTH_DIVIDER_Y_TOP,
  MARKET_DEPTH_SVG_VIEW_BOX,
  MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP,
  MARKET_DEPTH_SUMMARY_CARD_RIGHT_DP,
  MARKET_DEPTH_VISIBLE_LEVELS,
  MARKET_DEPTH_VIEW_BOX_DOMAIN,
  marketDepthCardBalanceDifferenceDp,
  marketDepthCardBalanceWithinTolerance,
  marketDepthGapAboveCardDp,
  marketDepthGapBelowCardDp,
  deriveMarketDepthCenterValleyY,
  marketDepthCardPositionIsFixed,
  marketDepthSummaryCardTopPixelY,
  marketDepthValleyPixelY,
  marketDepthValleyToCardGapDp,
  normalizeDepthValue,
  selectBoundedDepthLevels
} from "./marketDepthPresentation";

const level = (price: number, quantity: number): OrderBookLevel => ({
  price,
  quantity,
  total: price * quantity
});

const parsePathCoordinates = (path: string): number[] => {
  const matches = path.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  return matches.map((value) => Number(value));
};

const expectFinitePath = (path: string): void => {
  if (!path) {
    return;
  }

  const coordinates = parsePathCoordinates(path);
  expect(coordinates.length).toBeGreaterThan(0);
  expect(coordinates.every((value) => Number.isFinite(value))).toBe(true);
  expect(coordinates.some((value) => value === Number.POSITIVE_INFINITY)).toBe(
    false
  );
  expect(coordinates.some((value) => value === Number.NEGATIVE_INFINITY)).toBe(
    false
  );
  expect(coordinates.some((value) => Number.isNaN(value))).toBe(false);
};

describe("marketDepthPresentation", () => {
  describe("input integrity", () => {
    it("ignores invalid prices", () => {
      const levels = [
        level(Number.NaN, 1),
        level(-1, 1),
        level(100, 1)
      ];

      expect(filterValidDepthLevels(levels)).toEqual([level(100, 1)]);
    });

    it("ignores invalid quantities", () => {
      const levels = [
        level(100, Number.NaN),
        level(100, 0),
        level(100, -2),
        level(99, 2)
      ];

      expect(filterValidDepthLevels(levels)).toEqual([level(99, 2)]);
    });

    it("does not mutate source levels", () => {
      const levels = [level(100, 1), level(99, 2)];
      const copy = levels.map((entry) => ({ ...entry }));

      selectBoundedDepthLevels(levels);

      expect(levels).toEqual(copy);
    });

    it("preserves backend ordering", () => {
      const levels = [
        level(101, 1),
        level(100, 2),
        level(99, 3)
      ];

      expect(selectBoundedDepthLevels(levels)).toEqual(levels);
    });
  });

  describe("bounds", () => {
    it("limits bids to the visible market depth", () => {
      const bids = Array.from({ length: 12 }, (_, index) =>
        level(100 - index, 1)
      );

      expect(selectBoundedDepthLevels(bids).length).toBe(
        MARKET_DEPTH_VISIBLE_LEVELS
      );
    });

    it("limits asks to the visible market depth", () => {
      const asks = Array.from({ length: 12 }, (_, index) =>
        level(101 + index, 1)
      );

      expect(selectBoundedDepthLevels(asks).length).toBe(
        MARKET_DEPTH_VISIBLE_LEVELS
      );
    });
  });

  describe("cumulative depth", () => {
    it("accumulates bid quantities away from centre", () => {
      const bids = [level(100, 1), level(99, 2), level(98, 3)];

      expect(computeCumulativeQuantities(selectBoundedDepthLevels(bids))).toEqual([
        1, 3, 6
      ]);
    });

    it("accumulates ask quantities away from centre", () => {
      const asks = [level(101, 2), level(102, 3), level(103, 4)];

      expect(computeCumulativeQuantities(selectBoundedDepthLevels(asks))).toEqual([
        2, 5, 9
      ]);
    });

    it("places the best bid nearest the centre", () => {
      const bids = [level(100, 2), level(99, 3)];
      const points = buildBidDepthPoints(
        computeCumulativeQuantities(bids),
        5
      );

      expect(points[0]).toEqual(getMarketDepthCenterValleyPoint());
      expect(points[1]?.x).toBeGreaterThan(points[2]?.x ?? 0);
      expect(points[1]?.x).toBeLessThan(MARKET_DEPTH_CENTER_DIVIDER_X);
    });

    it("places the best ask nearest the centre", () => {
      const asks = [level(101, 2), level(102, 3)];
      const points = buildAskDepthPoints(
        computeCumulativeQuantities(asks),
        5
      );

      expect(points[0]).toEqual(getMarketDepthCenterValleyPoint());
      expect(points[1]?.x).toBeLessThan(points[2]?.x ?? 1);
      expect(points[1]?.x).toBeGreaterThan(MARKET_DEPTH_CENTER_DIVIDER_X);
    });

    it("computes edge cumulative totals", () => {
      const bids = [level(100, 1.2), level(99, 0.8)];
      const asks = [level(101, 0.5), level(102, 1.5)];

      expect(computeDepthTotals(bids, asks)).toEqual({
        bidTotal: 2,
        askTotal: 2
      });
    });
  });

  describe("shared normalization", () => {
    it("uses one shared maximum across both sides", () => {
      const bids = [level(100, 8)];
      const asks = [level(101, 2)];
      const bidCumulative = computeCumulativeQuantities(bids);
      const askCumulative = computeCumulativeQuantities(asks);
      const sharedMaximum = computeSharedDepthMaximum(
        bidCumulative,
        askCumulative
      );

      expect(sharedMaximum).toBe(8);
      expect(normalizeDepthValue(8, sharedMaximum)).toBe(1);
      expect(normalizeDepthValue(2, sharedMaximum)).toBe(0.25);
    });

    it("preserves side imbalance", () => {
      const presentation = buildMarketDepthPresentation({
        baseAsset: "btc",
        bids: [level(100, 9)],
        asks: [level(101, 3)],
        buyPressure: 50,
        sellPressure: 50
      });

      expect(presentation.bidTotalQuantity).toBe(9);
      expect(presentation.askTotalQuantity).toBe(3);
      expect(presentation.chart.bidPoints[1]?.y).toBeLessThan(
        presentation.chart.askPoints[1]?.y ?? 1
      );
    });

    it("keeps normalized outputs within zero and one", () => {
      const bids = [level(100, 4), level(99, 6)];
      const asks = [level(101, 10), level(102, 1)];
      const chart = buildMarketDepthChartModel(bids, asks);
      const allPoints = [...chart.bidPoints, ...chart.askPoints];

      for (const point of allPoints) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1);
      }
    });

    it("keeps a zero side at the elevated center valley", () => {
      const chart = buildMarketDepthChartModel([level(100, 0.5)], []);

      expect(chart.askAreaPath).toBe("");
      expect(chart.askPoints.every((point) => point.y === MARKET_DEPTH_CENTER_VALLEY_Y)).toBe(
        true
      );
    });
  });

  describe("geometry", () => {
    const geometryCases = [
      { label: "empty sides", bids: [] as OrderBookLevel[], asks: [] },
      { label: "one bid point", bids: [level(100, 1)], asks: [] },
      { label: "one ask point", bids: [], asks: [level(101, 1)] },
      {
        label: "two bid points",
        bids: [level(100, 1), level(99, 2)],
        asks: []
      },
      {
        label: "ten bid points",
        bids: Array.from({ length: 10 }, (_, index) =>
          level(100 - index, index + 1)
        ),
        asks: []
      },
      {
        label: "ten ask points",
        bids: [],
        asks: Array.from({ length: 10 }, (_, index) =>
          level(101 + index, index + 1)
        )
      }
    ] as const;

    it.each(geometryCases)("keeps $label safe", ({ bids, asks }) => {
      const chart = buildMarketDepthChartModel(bids, asks);

      expectFinitePath(chart.bidAreaPath);
      expectFinitePath(chart.askAreaPath);
      expectFinitePath(chart.bidLinePath);
      expectFinitePath(chart.askLinePath);
    });

    it("closes bid and ask areas on the baseline", () => {
      const chart = buildMarketDepthChartModel(
        [level(100, 2), level(99, 3)],
        [level(101, 1), level(102, 4)]
      );

      expect(chart.bidAreaPath.endsWith("Z")).toBe(true);
      expect(chart.askAreaPath.endsWith("Z")).toBe(true);
      expect(chart.bidAreaPath).toContain("L 0 1");
      expect(chart.askAreaPath).toContain("L 1 1");
    });

    it("produces no visible filled area for zero depth", () => {
      expect(buildDepthAreaPath([{ x: 0.5, y: 1 }], "bid")).toBe("");
      expect(
        buildMarketDepthChartModel([], []).bidAreaPath
      ).toBe("");
    });
  });

  describe("formatting", () => {
    it("formats sub-unit quantity", () => {
      expect(formatCompactDepthQuantity(0.92, "btc")).toBe("0.92 BTC");
    });

    it("formats normal quantity", () => {
      expect(formatCompactDepthQuantity(950, "btc")).toBe("950 BTC");
    });

    it("formats thousands", () => {
      expect(formatCompactDepthQuantity(1_200, "btc")).toBe("1.2k BTC");
      expect(formatCompactDepthQuantity(8_400, "eth")).toBe("8.4k ETH");
    });

    it("uses uppercase asset symbols", () => {
      expect(formatCompactDepthQuantity(2, "eth")).toBe("2.00 ETH");
    });

    it("returns unavailable for invalid values", () => {
      expect(formatCompactDepthQuantity(Number.NaN, "btc")).toBe("—");
      expect(formatCompactDepthQuantity(0, "btc")).toBe("—");
    });
  });

  describe("liquidity gap", () => {
    it("uses the top-of-book formula", () => {
      const gap = computeLiquidityGapPercent(100, 100.1);

      expect(gap).toBeCloseTo(0.09995002498750057, 8);
      expect(formatLiquidityGapPercent(gap)).toBe("0.10%");
    });

    it("rejects invalid best bid", () => {
      expect(computeLiquidityGapPercent(Number.NaN, 101)).toBeNull();
      expect(computeLiquidityGapPercent(0, 101)).toBeNull();
    });

    it("rejects invalid best ask", () => {
      expect(computeLiquidityGapPercent(100, Number.NaN)).toBeNull();
      expect(computeLiquidityGapPercent(100, 0)).toBeNull();
    });

    it("rejects crossed books", () => {
      expect(computeLiquidityGapPercent(101, 100)).toBeNull();
    });

    it("classifies the low threshold boundary", () => {
      expect(classifyLiquidityGap(0.05)).toBe("Low");
      expect(classifyLiquidityGap(0.0500001)).toBe("Moderate");
    });

    it("classifies the moderate threshold boundary", () => {
      expect(classifyLiquidityGap(0.2)).toBe("Moderate");
      expect(classifyLiquidityGap(0.2000001)).toBe("High");
    });

    it("classifies high gaps", () => {
      expect(classifyLiquidityGap(0.5)).toBe("High");
    });
  });

  describe("pressure", () => {
    it("classifies buy heavy at the boundary", () => {
      expect(classifyMarketDepthPressure(55, 40)).toBe("Buy Heavy");
      expect(classifyMarketDepthPressure(54.9, 40)).toBe("Balanced");
    });

    it("classifies sell heavy at the boundary", () => {
      expect(classifyMarketDepthPressure(40, 55)).toBe("Sell Heavy");
      expect(classifyMarketDepthPressure(40, 54.9)).toBe("Balanced");
    });

    it("classifies balanced pressure", () => {
      expect(classifyMarketDepthPressure(50, 50)).toBe("Balanced");
    });

    it("returns unavailable for non-finite pressure", () => {
      expect(classifyMarketDepthPressure(Number.NaN, 50)).toBe("—");
      expect(classifyMarketDepthPressure(50, Number.NaN)).toBe("—");
    });
  });

  describe("accessibility", () => {
    it("announces a complete BTC summary", () => {
      const presentation = buildMarketDepthPresentation({
        baseAsset: "btc",
        bids: [level(100, 600), level(99, 600)],
        asks: [level(100.02, 450), level(100.04, 450)],
        buyPressure: 40,
        sellPressure: 60
      });

      expect(presentation.accessibilityLabel).toBe(
        "Market depth. Bids 1.2k BTC. Asks 900 BTC. Liquidity gap Low, 0.02 percent. Pressure Sell Heavy."
      );
    });

    it("announces a complete ETH summary", () => {
      const presentation = buildMarketDepthPresentation({
        baseAsset: "eth",
        bids: [level(2_000, 4)],
        asks: [level(2_010, 4)],
        buyPressure: 60,
        sellPressure: 40
      });

      expect(presentation.accessibilityLabel).toContain("ETH");
      expect(presentation.accessibilityLabel).toContain("Buy Heavy");
    });

    it("announces unavailable values", () => {
      const label = buildMarketDepthAccessibilityLabel({
        bidTotalLabel: "—",
        askTotalLabel: "—",
        liquidityGapClassification: "—",
        liquidityGapLabel: "—",
        pressureClassification: "—"
      });

      expect(label).toBe(
        "Market depth. Bids —. Asks —. Liquidity gap unavailable. Pressure unavailable."
      );
    });
  });

  describe("valid level predicate", () => {
    it("accepts finite positive levels", () => {
      expect(isValidDepthLevel(level(100, 1))).toBe(true);
    });

    it("rejects zero quantity", () => {
      expect(isValidDepthLevel(level(100, 0))).toBe(false);
    });
  });

  describe("viewBox compatibility", () => {
    const representativeBids = Array.from({ length: 10 }, (_, index) =>
      level(100 - index, index + 1)
    );
    const representativeAsks = Array.from({ length: 10 }, (_, index) =>
      level(101 + index, index + 1)
    );
    const chart = buildMarketDepthChartModel(
      representativeBids,
      representativeAsks
    );

    it("exports a normalized viewBox domain", () => {
      expect(MARKET_DEPTH_SVG_VIEW_BOX).toBe("0 0 1 1");
      expect(MARKET_DEPTH_VIEW_BOX_DOMAIN).toEqual({ min: 0, max: 1 });
    });

    it("fits bid area path coordinates inside the viewBox", () => {
      expect(coordinatesFitViewBox(chart.bidAreaPath)).toBe(true);
    });

    it("fits ask area path coordinates inside the viewBox", () => {
      expect(coordinatesFitViewBox(chart.askAreaPath)).toBe(true);
    });

    it("fits bid line path coordinates inside the viewBox", () => {
      expect(coordinatesFitViewBox(chart.bidLinePath)).toBe(true);
    });

    it("fits ask line path coordinates inside the viewBox", () => {
      expect(coordinatesFitViewBox(chart.askLinePath)).toBe(true);
    });

    it("keeps control-point coordinates inside the viewBox", () => {
      const allPaths = [
        chart.bidAreaPath,
        chart.askAreaPath,
        chart.bidLinePath,
        chart.askLinePath
      ];

      for (const path of allPaths) {
        const coordinates = extractPathCoordinates(path);
        expect(
          coordinates.every(
            (value) =>
              value >= MARKET_DEPTH_VIEW_BOX_DOMAIN.min &&
              value <= MARKET_DEPTH_VIEW_BOX_DOMAIN.max
          )
        ).toBe(true);
      }
    });

    it("uses the same coordinate domain for the center divider", () => {
      expect(MARKET_DEPTH_CENTER_DIVIDER_X).toBe(0.5);
      expect(MARKET_DEPTH_DIVIDER_Y_TOP).toBeGreaterThanOrEqual(0);
      expect(MARKET_DEPTH_DIVIDER_Y_BOTTOM).toBeLessThanOrEqual(1);
    });

    it("detects the prior 100x72 viewBox mismatch", () => {
      const assessment = assessCoordinateMismatch({
        bidAreaPath: chart.bidAreaPath,
        askAreaPath: chart.askAreaPath,
        componentViewBox: "0 0 100 72"
      });

      expect(assessment.mismatch).toBe(true);
      expect(assessment.pathDomain.maxX).toBeLessThanOrEqual(1);
      expect(assessment.viewBoxDomain.maxX).toBe(100);
    });

    it("does not detect mismatch with the normalized viewBox", () => {
      const assessment = assessCoordinateMismatch({
        bidAreaPath: chart.bidAreaPath,
        askAreaPath: chart.askAreaPath,
        componentViewBox: MARKET_DEPTH_SVG_VIEW_BOX
      });

      expect(assessment.mismatch).toBe(false);
    });
  });

  describe("render coverage", () => {
    const representativeBids = Array.from({ length: 10 }, (_, index) =>
      level(100 - index, index + 1)
    );
    const representativeAsks = Array.from({ length: 10 }, (_, index) =>
      level(101 + index, index + 1)
    );
    const chart = buildMarketDepthChartModel(
      representativeBids,
      representativeAsks
    );

    it("reaches materially into the left half for bids", () => {
      expect(bidCurveReachesLeftHalf(chart.bidPoints)).toBe(true);
      const bidDomain = getPathCoordinateDomain(chart.bidAreaPath);
      expect(bidDomain?.minX ?? 1).toBeLessThanOrEqual(0.1);
    });

    it("reaches materially into the right half for asks", () => {
      expect(askCurveReachesRightHalf(chart.askPoints)).toBe(true);
      const askDomain = getPathCoordinateDomain(chart.askAreaPath);
      expect(askDomain?.maxX ?? 0).toBeGreaterThanOrEqual(0.9);
    });

    it("starts both sides at the elevated center valley", () => {
      expect(chart.bidPoints[0]).toEqual(getMarketDepthCenterValleyPoint());
      expect(chart.askPoints[0]).toEqual(getMarketDepthCenterValleyPoint());
    });

    it("keeps the visible center valley above the baseline", () => {
      expect(centerValleyIsAboveBaseline()).toBe(true);
      expect(centerValleyToBaselineGap()).toBeGreaterThanOrEqual(
        MARKET_DEPTH_MIN_VALLEY_TO_BASELINE_GAP
      );
    });

    it("does not place visible line paths at the baseline center point", () => {
      const bidCenterY = parsePathCoordinates(chart.bidLinePath)[1];
      const askCenterY = parsePathCoordinates(chart.askLinePath)[1];
      expect(bidCenterY).toBe(MARKET_DEPTH_CENTER_VALLEY_Y);
      expect(askCenterY).toBe(MARKET_DEPTH_CENTER_VALLEY_Y);
      expect(bidCenterY).toBeLessThan(MARKET_DEPTH_BASELINE_Y);
      expect(askCenterY).toBeLessThan(MARKET_DEPTH_BASELINE_Y);
    });

    it("closes both areas to their baseline", () => {
      expect(chart.bidAreaPath).toContain("L 0 1");
      expect(chart.bidAreaPath.endsWith("Z")).toBe(true);
      expect(chart.askAreaPath).toContain("L 1 1");
      expect(chart.askAreaPath.endsWith("Z")).toBe(true);
    });

    it("keeps every visible bid point at or above the center valley", () => {
      for (const point of chart.bidPoints) {
        expect(point.y).toBeLessThanOrEqual(MARKET_DEPTH_CENTER_VALLEY_Y + 1e-6);
      }
    });

    it("keeps every visible ask point at or above the center valley", () => {
      for (const point of chart.askPoints) {
        expect(point.y).toBeLessThanOrEqual(MARKET_DEPTH_CENTER_VALLEY_Y + 1e-6);
      }
    });

    it("never lets outward cumulative depth descend below the center valley", () => {
      const bidYs = chart.bidPoints.map((point) => point.y);
      const askYs = chart.askPoints.map((point) => point.y);

      for (let index = 1; index < bidYs.length; index += 1) {
        expect(bidYs[index]).toBeLessThanOrEqual(bidYs[index - 1] ?? 1);
      }

      for (let index = 1; index < askYs.length; index += 1) {
        expect(askYs[index]).toBeLessThanOrEqual(askYs[index - 1] ?? 1);
      }
    });

    it("uses symmetric center join controls as mirrored tangent points", () => {
      const bidControl = getMarketDepthBidCenterJoinControlPoint();
      const askControl = getMarketDepthAskCenterJoinControlPoint();

      expect(bidControl.y).toBe(MARKET_DEPTH_CENTER_VALLEY_Y);
      expect(askControl.y).toBe(MARKET_DEPTH_CENTER_VALLEY_Y);
      expect(bidControl.x).toBeCloseTo(
        MARKET_DEPTH_CENTER_DIVIDER_X - MARKET_DEPTH_CENTER_JOIN_TANGENT_OFFSET,
        6
      );
      expect(askControl.x).toBeCloseTo(
        MARKET_DEPTH_CENTER_DIVIDER_X + MARKET_DEPTH_CENTER_JOIN_TANGENT_OFFSET,
        6
      );
      expect(MARKET_DEPTH_CENTER_JOIN_TANGENT_OFFSET).toBe(
        MARKET_DEPTH_CENTER_SHOULDER_OFFSET
      );
      expect(MARKET_DEPTH_CENTER_DIVIDER_X - bidControl.x).toBeCloseTo(
        askControl.x - MARKET_DEPTH_CENTER_DIVIDER_X,
        6
      );
      expect(getMarketDepthBidShoulderPoint()).toEqual(bidControl);
      expect(getMarketDepthAskShoulderPoint()).toEqual(askControl);
    });

    it("joins bid and ask at one shared center with horizontal tangents", () => {
      expect(depthLinePathStartsAtSharedCenter(chart.bidLinePath, "bid")).toBe(
        true
      );
      expect(depthLinePathStartsAtSharedCenter(chart.askLinePath, "ask")).toBe(
        true
      );
      expect(
        depthCenterJoinIsHorizontallyTangent(chart.bidLinePath, "bid")
      ).toBe(true);
      expect(
        depthCenterJoinIsHorizontallyTangent(chart.askLinePath, "ask")
      ).toBe(true);
      expect(
        depthCenterJoinIsC1Continuous(chart.bidLinePath, chart.askLinePath)
      ).toBe(true);
    });

    it("does not use a line command at the visible center join", () => {
      expect(depthLinePathUsesLineCommandAtCenterJoin(chart.bidLinePath)).toBe(
        false
      );
      expect(depthLinePathUsesLineCommandAtCenterJoin(chart.askLinePath)).toBe(
        false
      );
      expect(chart.bidLinePath.startsWith("M")).toBe(true);
      expect(chart.bidLinePath.includes(" C ")).toBe(true);
      expect(chart.askLinePath.startsWith("M")).toBe(true);
      expect(chart.askLinePath.includes(" C ")).toBe(true);
    });

    it("keeps bid and ask visible paths on their respective halves", () => {
      const bidXs = parsePathCoordinates(chart.bidLinePath).filter(
        (_, index) => index % 2 === 0
      );
      const askXs = parsePathCoordinates(chart.askLinePath).filter(
        (_, index) => index % 2 === 0
      );

      expect(bidXs.every((x) => x <= MARKET_DEPTH_CENTER_DIVIDER_X + 1e-6)).toBe(
        true
      );
      expect(askXs.every((x) => x >= MARKET_DEPTH_CENTER_DIVIDER_X - 1e-6)).toBe(
        true
      );
    });

    it("maps visible depth relative to the valley instead of the baseline", () => {
      expect(depthVisibleYFromNormalized(0)).toBe(MARKET_DEPTH_CENTER_VALLEY_Y);
      expect(depthVisibleYFromNormalized(1)).toBe(0);
      expect(depthVisibleYFromNormalized(0.5)).toBeCloseTo(0.325, 2);
    });

    it("keeps visible line paths off the baseline", () => {
      const bidYs = parsePathCoordinates(chart.bidLinePath).filter(
        (_, index) => index % 2 === 1
      );
      const askYs = parsePathCoordinates(chart.askLinePath).filter(
        (_, index) => index % 2 === 1
      );

      expect(bidYs.every((y) => y < MARKET_DEPTH_BASELINE_Y)).toBe(true);
      expect(askYs.every((y) => y < MARKET_DEPTH_BASELINE_Y)).toBe(true);
    });

    it("remains honest when one side has zero depth", () => {
      const oneSided = buildMarketDepthChartModel(
        representativeBids,
        []
      );

      expect(oneSided.askAreaPath).toBe("");
      expect(oneSided.bidAreaPath.length).toBeGreaterThan(0);
      expect(
        oneSided.bidPoints.every(
          (point) => point.y <= MARKET_DEPTH_CENTER_VALLEY_Y + 1e-6
        )
      ).toBe(true);
    });
  });

  describe("stroke separation", () => {
    const chart = buildMarketDepthChartModel(
      [level(100, 2), level(99, 3)],
      [level(101, 1), level(102, 4)]
    );

    it("keeps area paths and line paths separate", () => {
      expect(chart.bidAreaPath).not.toBe(chart.bidLinePath);
      expect(chart.askAreaPath).not.toBe(chart.askLinePath);
      expect(chart.bidAreaPath.endsWith("Z")).toBe(true);
      expect(chart.bidLinePath.endsWith("Z")).toBe(false);
    });

    it("keeps line paths available independently of area paths", () => {
      expect(chart.bidLinePath.length).toBeGreaterThan(0);
      expect(chart.askLinePath.length).toBeGreaterThan(0);
    });

    it("does not use background overlay for price ticks", () => {
      const source = readFileSync(
        resolve(__dirname, "AnimatedPriceValue.tsx"),
        "utf8"
      );

      expect(source).not.toMatch(/backgroundColor: overlayColor/);
      expect(source).toMatch(/useNativeDriver:\s*true/);
      expect(source).toMatch(/overlayOpacity/);
      expect(source).toMatch(/Animated\.Text/);
    });

    it("does not stroke closed area paths in the component source", () => {
      const source = readFileSync(
        resolve(__dirname, "MarketDepthSummary.tsx"),
        "utf8"
      );

      const bidAreaBlock = source.match(
        /chart\.bidAreaPath[\s\S]*?\/>/
      )?.[0];
      const askAreaBlock = source.match(
        /chart\.askAreaPath[\s\S]*?\/>/
      )?.[0];

      expect(bidAreaBlock).toBeDefined();
      expect(askAreaBlock).toBeDefined();
      expect(bidAreaBlock).not.toMatch(/stroke=/);
      expect(askAreaBlock).not.toMatch(/stroke=/);
      expect(source).toMatch(/chart\.bidLinePath/);
      expect(source).toMatch(/chart\.askLinePath/);
      expect(source).toMatch(/fill="none"/);
      expect(source).toMatch(/strokeLinecap="round"/);
      expect(source).toMatch(/strokeLinejoin="round"/);
      expect(source.indexOf("MARKET_DEPTH_CENTER_DIVIDER_X")).toBeLessThan(
        source.indexOf("chart.bidAreaPath")
      );
    });
  });

  describe("chart constants", () => {
    it("derives center valley from fixed card geometry", () => {
      expect(deriveMarketDepthCenterValleyY()).toBeCloseTo(0.65, 5);
      expect(MARKET_DEPTH_CENTER_VALLEY_Y).toBe(deriveMarketDepthCenterValleyY());
      expect(MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP).toBe(240);
      expect(MARKET_DEPTH_CHART_BORDER_WIDTH_DP).toBe(0);
      expect(MARKET_DEPTH_CHART_HORIZONTAL_PADDING_DP).toBe(0);
      expect(MARKET_DEPTH_CHART_VERTICAL_PADDING_DP).toBe(0);
      expect(MARKET_DEPTH_SUMMARY_CARD_RIGHT_DP).toBe(16);
      expect(MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP).toBe(16);
      expect(marketDepthCardPositionIsFixed()).toBe(true);
    });

    it("balances gap above and below the summary card", () => {
      expect(marketDepthGapAboveCardDp()).toBe(16);
      expect(marketDepthGapBelowCardDp()).toBe(16);
      expect(marketDepthCardBalanceDifferenceDp()).toBe(0);
      expect(marketDepthCardBalanceWithinTolerance()).toBe(true);
    });

    it("keeps valley above the card and card above graph bottom", () => {
      const valleyY = marketDepthValleyPixelY();
      const cardTopY = marketDepthSummaryCardTopPixelY();
      const cardBottomY = MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP - MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP;
      expect(valleyY).toBeLessThan(cardTopY);
      expect(cardTopY).toBeLessThan(cardBottomY);
      expect(cardBottomY).toBeLessThan(MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP);
    });

    it("keeps viewBox and divider constants internally consistent", () => {
      expect(MARKET_DEPTH_SVG_VIEW_BOX).toBe("0 0 1 1");
      expect(MARKET_DEPTH_CENTER_DIVIDER_X).toBe(0.5);
      expect(MARKET_DEPTH_CENTER_VALLEY_Y).toBeLessThan(MARKET_DEPTH_BASELINE_Y);
      expect(MARKET_DEPTH_DIVIDER_Y_TOP).toBeLessThan(
        MARKET_DEPTH_DIVIDER_Y_BOTTOM
      );
    });
  });

  describe("card formatting", () => {
    it("formats liquidity gap on one compact line", () => {
      expect(formatLiquidityGapCardValue("Low", "0.02%")).toBe("Low (0.02%)");
      expect(formatLiquidityGapCardValue("Moderate", "0.10%")).toBe(
        "Moderate (0.10%)"
      );
      expect(formatLiquidityGapCardValue("High", "0.32%")).toBe("High (0.32%)");
    });

    it("formats unavailable liquidity gap on one line", () => {
      expect(formatLiquidityGapCardValue("—", "—")).toBe("— (—)");
    });
  });
});

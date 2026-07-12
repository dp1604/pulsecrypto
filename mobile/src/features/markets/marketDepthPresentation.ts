import type { OrderBookLevel } from "@pulsecrypto/shared";
import { DEFAULT_ORDER_BOOK_VISIBLE_DEPTH } from "./marketDetailsPresentation";

export const MARKET_DEPTH_VISIBLE_LEVELS = DEFAULT_ORDER_BOOK_VISIBLE_DEPTH;

export const MARKET_DEPTH_REFERENCE_WIDTH_DP = 390;
export const MARKET_DEPTH_REFERENCE_HEIGHT_DP = 300;
/** Title and legend region in Section - Market Depth Visualization.png */
export const MARKET_DEPTH_LEGEND_REGION_HEIGHT_DP = 60;
export const MARKET_DEPTH_PLOT_HEIGHT_DP =
  MARKET_DEPTH_REFERENCE_HEIGHT_DP - MARKET_DEPTH_LEGEND_REGION_HEIGHT_DP;
export const MARKET_DEPTH_CHART_ASPECT_RATIO =
  MARKET_DEPTH_REFERENCE_WIDTH_DP / MARKET_DEPTH_PLOT_HEIGHT_DP;

export const MARKET_DEPTH_SVG_VIEW_BOX = "0 0 1 1";
export const MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP = MARKET_DEPTH_PLOT_HEIGHT_DP;
export const MARKET_DEPTH_CHART_BORDER_WIDTH_DP = 0;
export const MARKET_DEPTH_CHART_HORIZONTAL_PADDING_DP = 0;
export const MARKET_DEPTH_CHART_VERTICAL_PADDING_DP = 0;
export const MARKET_DEPTH_CENTER_DIVIDER_X = 0.5;
export const MARKET_DEPTH_DIVIDER_Y_TOP = 0;
export const MARKET_DEPTH_DIVIDER_Y_BOTTOM = 1;
export const MARKET_DEPTH_BASELINE_Y = 1;
export const MARKET_DEPTH_MIN_VALLEY_TO_BASELINE_GAP = 0.15;
export const MARKET_DEPTH_SUMMARY_CARD_RIGHT_DP = 16;
export const MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP = 16;
export const MARKET_DEPTH_SUMMARY_CARD_ESTIMATED_HEIGHT_DP = 52;
export const MARKET_DEPTH_MIN_VALLEY_TO_CARD_GAP_DP = 28;
export const MARKET_DEPTH_CENTER_SHOULDER_OFFSET = 0.015;
/** Mirrored horizontal tangent offset at the shared center valley join. */
export const MARKET_DEPTH_CENTER_JOIN_TANGENT_OFFSET =
  MARKET_DEPTH_CENTER_SHOULDER_OFFSET;
export const MARKET_DEPTH_LINE_STROKE_WIDTH = 0.008;
export const MARKET_DEPTH_VIEW_BOX_DOMAIN = { min: 0, max: 1 } as const;

/** Derive center valley from fixed card geometry so gap above equals gap below. */
export const deriveMarketDepthCenterValleyY = (
  chartHeightDp: number = MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  cardBottomDp: number = MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP,
  cardHeightDp: number = MARKET_DEPTH_SUMMARY_CARD_ESTIMATED_HEIGHT_DP
): number => {
  const cardBottomOffsetRatio = cardBottomDp / chartHeightDp;
  const cardHeightRatio = cardHeightDp / chartHeightDp;
  return 1 - cardHeightRatio - 2 * cardBottomOffsetRatio;
};

export const MARKET_DEPTH_CENTER_VALLEY_Y = deriveMarketDepthCenterValleyY();

export type NormalizedDepthPoint = {
  x: number;
  y: number;
};

export type MarketDepthChartModel = {
  bidPoints: NormalizedDepthPoint[];
  askPoints: NormalizedDepthPoint[];
  bidAreaPath: string;
  askAreaPath: string;
  bidLinePath: string;
  askLinePath: string;
};

export type LiquidityGapClassification = "Low" | "Moderate" | "High" | "—";

export type PressureClassification = "Buy Heavy" | "Sell Heavy" | "Balanced" | "—";

export type MarketDepthPresentation = {
  baseAsset: string;
  bidTotalQuantity: number;
  askTotalQuantity: number;
  bidTotalLabel: string;
  askTotalLabel: string;
  liquidityGapPercent: number | null;
  liquidityGapLabel: string;
  liquidityGapClassification: LiquidityGapClassification;
  pressureClassification: PressureClassification;
  accessibilityLabel: string;
  chart: MarketDepthChartModel;
  hasVisibleDepth: boolean;
};

const CHART_BASELINE = MARKET_DEPTH_BASELINE_Y;
const CHART_TOP = 0;
const CHART_CENTER_X = 0.5;
const CHART_CENTER_VALLEY_Y = MARKET_DEPTH_CENTER_VALLEY_Y;
const CHART_CENTER_SHOULDER_OFFSET = MARKET_DEPTH_CENTER_SHOULDER_OFFSET;
const CHART_CENTER_JOIN_TANGENT_OFFSET = MARKET_DEPTH_CENTER_JOIN_TANGENT_OFFSET;

export const getMarketDepthCenterValleyPoint = (): NormalizedDepthPoint => ({
  x: CHART_CENTER_X,
  y: CHART_CENTER_VALLEY_Y
});

export const centerValleyIsAboveBaseline = (
  valleyY: number = MARKET_DEPTH_CENTER_VALLEY_Y,
  baselineY: number = MARKET_DEPTH_BASELINE_Y
): boolean => valleyY < baselineY;

export const centerValleyToBaselineGap = (
  valleyY: number = MARKET_DEPTH_CENTER_VALLEY_Y,
  baselineY: number = MARKET_DEPTH_BASELINE_Y
): number => baselineY - valleyY;

export const marketDepthValleyPixelY = (
  chartHeightDp: number = MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  valleyY: number = MARKET_DEPTH_CENTER_VALLEY_Y
): number => valleyY * chartHeightDp;

export const marketDepthSummaryCardTopPixelY = (
  chartHeightDp: number = MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  cardBottomDp: number = MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP,
  cardHeightDp: number = MARKET_DEPTH_SUMMARY_CARD_ESTIMATED_HEIGHT_DP
): number => chartHeightDp - cardBottomDp - cardHeightDp;

export const marketDepthValleyToCardGapDp = (
  chartHeightDp: number = MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  valleyY: number = MARKET_DEPTH_CENTER_VALLEY_Y,
  cardBottomDp: number = MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP,
  cardHeightDp: number = MARKET_DEPTH_SUMMARY_CARD_ESTIMATED_HEIGHT_DP
): number =>
  marketDepthSummaryCardTopPixelY(chartHeightDp, cardBottomDp, cardHeightDp) -
  marketDepthValleyPixelY(chartHeightDp, valleyY);

export const marketDepthCardPositionIsFixed = (): boolean => true;

export const marketDepthSummaryCardBottomPixelY = (
  chartHeightDp: number = MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  cardBottomDp: number = MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP
): number => chartHeightDp - cardBottomDp;

export const marketDepthGapAboveCardDp = (
  chartHeightDp: number = MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  valleyY: number = MARKET_DEPTH_CENTER_VALLEY_Y,
  cardBottomDp: number = MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP,
  cardHeightDp: number = MARKET_DEPTH_SUMMARY_CARD_ESTIMATED_HEIGHT_DP
): number =>
  marketDepthSummaryCardTopPixelY(chartHeightDp, cardBottomDp, cardHeightDp) -
  marketDepthValleyPixelY(chartHeightDp, valleyY);

export const marketDepthGapBelowCardDp = (
  chartHeightDp: number = MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  cardBottomDp: number = MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP
): number =>
  chartHeightDp - marketDepthSummaryCardBottomPixelY(chartHeightDp, cardBottomDp);

export const marketDepthCardBalanceDifferenceDp = (
  chartHeightDp: number = MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  valleyY: number = MARKET_DEPTH_CENTER_VALLEY_Y,
  cardBottomDp: number = MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP,
  cardHeightDp: number = MARKET_DEPTH_SUMMARY_CARD_ESTIMATED_HEIGHT_DP
): number =>
  Math.abs(
    marketDepthGapAboveCardDp(
      chartHeightDp,
      valleyY,
      cardBottomDp,
      cardHeightDp
    ) -
      marketDepthGapBelowCardDp(chartHeightDp, cardBottomDp)
  );

export const marketDepthCardBalanceWithinTolerance = (
  toleranceDp = 2,
  chartHeightDp: number = MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  valleyY: number = MARKET_DEPTH_CENTER_VALLEY_Y,
  cardBottomDp: number = MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP,
  cardHeightDp: number = MARKET_DEPTH_SUMMARY_CARD_ESTIMATED_HEIGHT_DP
): boolean =>
  marketDepthCardBalanceDifferenceDp(
    chartHeightDp,
    valleyY,
    cardBottomDp,
    cardHeightDp
  ) <= toleranceDp;

export const isValidDepthLevel = (level: OrderBookLevel): boolean =>
  Number.isFinite(level.price) &&
  level.price > 0 &&
  Number.isFinite(level.quantity) &&
  level.quantity > 0;

export const filterValidDepthLevels = (
  levels: readonly OrderBookLevel[]
): OrderBookLevel[] =>
  levels.filter((level) => isValidDepthLevel(level));

export const selectBoundedDepthLevels = (
  levels: readonly OrderBookLevel[],
  depth = MARKET_DEPTH_VISIBLE_LEVELS
): OrderBookLevel[] => filterValidDepthLevels(levels).slice(0, depth);

export const computeCumulativeQuantities = (
  levels: readonly OrderBookLevel[]
): number[] => {
  let runningTotal = 0;
  const totals: number[] = [];

  for (const level of levels) {
    runningTotal += level.quantity;
    totals.push(runningTotal);
  }

  return totals;
};

export const computeDepthTotals = (
  bids: readonly OrderBookLevel[],
  asks: readonly OrderBookLevel[]
): { bidTotal: number; askTotal: number } => {
  const bidCumulative = computeCumulativeQuantities(selectBoundedDepthLevels(bids));
  const askCumulative = computeCumulativeQuantities(selectBoundedDepthLevels(asks));

  return {
    bidTotal: bidCumulative[bidCumulative.length - 1] ?? 0,
    askTotal: askCumulative[askCumulative.length - 1] ?? 0
  };
};

export const normalizeDepthValue = (
  cumulativeQuantity: number,
  sharedMaximum: number
): number => {
  if (!Number.isFinite(cumulativeQuantity) || cumulativeQuantity <= 0) {
    return 0;
  }

  if (!Number.isFinite(sharedMaximum) || sharedMaximum <= 0) {
    return 0;
  }

  const normalized = cumulativeQuantity / sharedMaximum;

  return Math.min(1, Math.max(0, normalized));
};

export const computeSharedDepthMaximum = (
  bidCumulative: readonly number[],
  askCumulative: readonly number[]
): number => {
  let maximum = 0;

  for (const value of bidCumulative) {
    if (Number.isFinite(value) && value > maximum) {
      maximum = value;
    }
  }

  for (const value of askCumulative) {
    if (Number.isFinite(value) && value > maximum) {
      maximum = value;
    }
  }

  return maximum;
};

const normalizeAssetSymbol = (asset: string): string => {
  const trimmed = asset.trim();
  return trimmed ? trimmed.replace(/\s+/g, " ").toUpperCase() : "—";
};

export const formatCompactDepthQuantity = (
  value: number,
  asset: string
): string => {
  const symbol = normalizeAssetSymbol(asset);

  if (!Number.isFinite(value) || value <= 0) {
    return "—";
  }

  if (value >= 1_000) {
    const thousands = value / 1_000;
    const formatted =
      thousands >= 10 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${formatted}k ${symbol}`;
  }

  if (value >= 1) {
    const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(2);
    return `${formatted} ${symbol}`;
  }

  return `${value.toFixed(2)} ${symbol}`;
};

export const computeLiquidityGapPercent = (
  bestBid: number | undefined,
  bestAsk: number | undefined
): number | null => {
  if (
    bestBid === undefined ||
    bestAsk === undefined ||
    !Number.isFinite(bestBid) ||
    !Number.isFinite(bestAsk) ||
    bestBid <= 0 ||
    bestAsk <= 0 ||
    bestAsk < bestBid
  ) {
    return null;
  }

  const midPrice = (bestBid + bestAsk) / 2;

  if (!Number.isFinite(midPrice) || midPrice <= 0) {
    return null;
  }

  const gapPercent = ((bestAsk - bestBid) / midPrice) * 100;

  return Number.isFinite(gapPercent) && gapPercent >= 0 ? gapPercent : null;
};

export const classifyLiquidityGap = (
  gapPercent: number | null
): LiquidityGapClassification => {
  if (gapPercent === null || !Number.isFinite(gapPercent)) {
    return "—";
  }

  if (gapPercent <= 0.05) {
    return "Low";
  }

  if (gapPercent <= 0.2) {
    return "Moderate";
  }

  return "High";
};

export const formatLiquidityGapCardValue = (
  classification: LiquidityGapClassification,
  label: string
): string => {
  if (classification === "—" || label === "—") {
    return "— (—)";
  }

  return `${classification} (${label})`;
};

export const formatLiquidityGapPercent = (gapPercent: number | null): string => {
  if (gapPercent === null || !Number.isFinite(gapPercent)) {
    return "—";
  }

  if (gapPercent >= 1) {
    return `${gapPercent.toFixed(2)}%`;
  }

  if (gapPercent >= 0.01) {
    return `${gapPercent.toFixed(2)}%`;
  }

  return `${gapPercent.toFixed(3)}%`;
};

export const classifyMarketDepthPressure = (
  buyPressure: number,
  sellPressure: number
): PressureClassification => {
  if (!Number.isFinite(buyPressure) || !Number.isFinite(sellPressure)) {
    return "—";
  }

  if (buyPressure >= 55) {
    return "Buy Heavy";
  }

  if (sellPressure >= 55) {
    return "Sell Heavy";
  }

  return "Balanced";
};

export const getMarketDepthBidCenterJoinControlPoint = (): NormalizedDepthPoint => ({
  x: CHART_CENTER_X - CHART_CENTER_JOIN_TANGENT_OFFSET,
  y: CHART_CENTER_VALLEY_Y
});

export const getMarketDepthAskCenterJoinControlPoint = (): NormalizedDepthPoint => ({
  x: CHART_CENTER_X + CHART_CENTER_JOIN_TANGENT_OFFSET,
  y: CHART_CENTER_VALLEY_Y
});

export const getMarketDepthBidShoulderPoint = getMarketDepthBidCenterJoinControlPoint;

export const getMarketDepthAskShoulderPoint = getMarketDepthAskCenterJoinControlPoint;

export const depthVisibleYFromNormalized = (normalizedDepth: number): number => {
  const clamped = Math.min(1, Math.max(0, normalizedDepth));
  return (
    CHART_CENTER_VALLEY_Y - clamped * (CHART_CENTER_VALLEY_Y - CHART_TOP)
  );
};

const clampVisibleChartY = (value: number): number => {
  if (!Number.isFinite(value)) {
    return CHART_CENTER_VALLEY_Y;
  }

  return Math.min(CHART_CENTER_VALLEY_Y, Math.max(CHART_TOP, value));
};

export const buildBidDepthPoints = (
  bidCumulative: readonly number[],
  sharedMaximum: number
): NormalizedDepthPoint[] => {
  const count = bidCumulative.length;

  if (count === 0) {
    return [getMarketDepthCenterValleyPoint()];
  }

  const points: NormalizedDepthPoint[] = [getMarketDepthCenterValleyPoint()];

  for (let index = 0; index < count; index += 1) {
    const normalized = normalizeDepthValue(bidCumulative[index] ?? 0, sharedMaximum);
    const x =
      count === 1
        ? 0
        : CHART_CENTER_X - ((index + 1) / count) * CHART_CENTER_X;

    points.push({
      x: Math.min(CHART_CENTER_X, Math.max(CHART_TOP, x)),
      y: clampVisibleChartY(depthVisibleYFromNormalized(normalized))
    });
  }

  return points;
};

export const buildAskDepthPoints = (
  askCumulative: readonly number[],
  sharedMaximum: number
): NormalizedDepthPoint[] => {
  const count = askCumulative.length;

  if (count === 0) {
    return [getMarketDepthCenterValleyPoint()];
  }

  const points: NormalizedDepthPoint[] = [getMarketDepthCenterValleyPoint()];

  for (let index = 0; index < count; index += 1) {
    const normalized = normalizeDepthValue(askCumulative[index] ?? 0, sharedMaximum);
    const x =
      count === 1
        ? 1
        : CHART_CENTER_X + ((index + 1) / count) * CHART_CENTER_X;

    points.push({
      x: Math.max(CHART_CENTER_X, Math.min(1, x)),
      y: clampVisibleChartY(depthVisibleYFromNormalized(normalized))
    });
  }

  return points;
};

const hasVisibleDepthCurve = (points: readonly NormalizedDepthPoint[]): boolean =>
  points.length > 1 &&
  points.some((point) => point.y < MARKET_DEPTH_CENTER_VALLEY_Y - 1e-6);

const catmullRomBezierSegments = (
  points: readonly NormalizedDepthPoint[],
  startIndex = 0
): string[] => {
  const segments: string[] = [];

  for (let index = startIndex; index < points.length - 1; index += 1) {
    const p0 = points[Math.max(0, index - 1)];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[Math.min(points.length - 1, index + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clampVisibleChartY(p1.y + (p2.y - p0.y) / 6);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clampVisibleChartY(p2.y - (p3.y - p1.y) / 6);

    segments.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
  }

  return segments;
};

const buildCenterJoinApproachControl = (
  center: NormalizedDepthPoint,
  target: NormalizedDepthPoint,
  side: "bid" | "ask"
): NormalizedDepthPoint => {
  const direction = side === "bid" ? -1 : 1;
  const offset = CHART_CENTER_JOIN_TANGENT_OFFSET * 0.5;

  return {
    x: target.x - direction * offset,
    y: clampVisibleChartY(target.y)
  };
};

export const buildDepthLinePathWithCenterJoin = (
  points: readonly NormalizedDepthPoint[],
  side: "bid" | "ask"
): string => {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y}`;
  }

  const center = points[0];
  const firstOuter = points[1];
  const centerControl =
    side === "bid"
      ? getMarketDepthBidCenterJoinControlPoint()
      : getMarketDepthAskCenterJoinControlPoint();
  const approachControl = buildCenterJoinApproachControl(
    center,
    firstOuter,
    side
  );

  const segments = [
    `M ${center.x} ${center.y}`,
    `C ${centerControl.x} ${centerControl.y}, ${approachControl.x} ${approachControl.y}, ${firstOuter.x} ${firstOuter.y}`,
    ...catmullRomBezierSegments(points, 1)
  ];

  return segments.join(" ");
};

export const depthLinePathUsesLineCommandAtCenterJoin = (path: string): boolean => {
  const center = getMarketDepthCenterValleyPoint();
  const centerXPattern = new RegExp(
    `L\\s+${center.x.toFixed(6).replace(".", "\\.")}\\s+${center.y.toFixed(6).replace(".", "\\.")}`,
    "i"
  );

  return centerXPattern.test(path);
};

export const depthLinePathStartsAtSharedCenter = (
  path: string,
  side: "bid" | "ask"
): boolean => {
  const coordinates = extractPathCoordinates(path);
  const center = getMarketDepthCenterValleyPoint();

  if (coordinates.length < 2) {
    return false;
  }

  return (
    Math.abs((coordinates[0] ?? 0) - center.x) < 1e-6 &&
    Math.abs((coordinates[1] ?? 0) - center.y) < 1e-6
  );
};

export const depthCenterJoinIsHorizontallyTangent = (
  path: string,
  side: "bid" | "ask"
): boolean => {
  const coordinates = extractPathCoordinates(path);
  const center = getMarketDepthCenterValleyPoint();

  if (coordinates.length < 6) {
    return false;
  }

  const cpX = coordinates[2] ?? 0;
  const cpY = coordinates[3] ?? 0;

  if (side === "bid") {
    return (
      cpX < center.x &&
      Math.abs(cpY - center.y) < 1e-6
    );
  }

  return (
    cpX > center.x &&
    Math.abs(cpY - center.y) < 1e-6
  );
};

export const depthCenterJoinIsC1Continuous = (
  bidLinePath: string,
  askLinePath: string
): boolean => {
  const center = getMarketDepthCenterValleyPoint();
  const bidCoordinates = extractPathCoordinates(bidLinePath);
  const askCoordinates = extractPathCoordinates(askLinePath);

  if (bidCoordinates.length < 4 || askCoordinates.length < 4) {
    return false;
  }

  const bidCenterY = bidCoordinates[1] ?? Number.NaN;
  const askCenterY = askCoordinates[1] ?? Number.NaN;

  return (
    Math.abs((bidCoordinates[0] ?? 0) - center.x) < 1e-6 &&
    Math.abs((askCoordinates[0] ?? 0) - center.x) < 1e-6 &&
    Math.abs(bidCenterY - center.y) < 1e-6 &&
    Math.abs(askCenterY - center.y) < 1e-6 &&
    depthCenterJoinIsHorizontallyTangent(bidLinePath, "bid") &&
    depthCenterJoinIsHorizontallyTangent(askLinePath, "ask")
  );
};

export const buildDepthAreaPath = (
  points: readonly NormalizedDepthPoint[],
  side: "bid" | "ask"
): string => {
  if (!hasVisibleDepthCurve(points)) {
    return "";
  }

  const linePath = buildDepthLinePathWithCenterJoin(points, side);

  if (!linePath) {
    return "";
  }

  const edgePoint = points[points.length - 1];
  const edgeX = side === "bid" ? 0 : 1;

  return `${linePath} L ${edgeX} ${CHART_BASELINE} L ${CHART_CENTER_X} ${CHART_BASELINE} Z`;
};

export const buildMarketDepthChartModel = (
  bids: readonly OrderBookLevel[],
  asks: readonly OrderBookLevel[]
): MarketDepthChartModel => {
  const boundedBids = selectBoundedDepthLevels(bids);
  const boundedAsks = selectBoundedDepthLevels(asks);
  const bidCumulative = computeCumulativeQuantities(boundedBids);
  const askCumulative = computeCumulativeQuantities(boundedAsks);
  const sharedMaximum = computeSharedDepthMaximum(bidCumulative, askCumulative);
  const bidPoints = buildBidDepthPoints(bidCumulative, sharedMaximum);
  const askPoints = buildAskDepthPoints(askCumulative, sharedMaximum);

  return {
    bidPoints,
    askPoints,
    bidAreaPath: buildDepthAreaPath(bidPoints, "bid"),
    askAreaPath: buildDepthAreaPath(askPoints, "ask"),
    bidLinePath: buildDepthLinePathWithCenterJoin(bidPoints, "bid"),
    askLinePath: buildDepthLinePathWithCenterJoin(askPoints, "ask")
  };
};

export const buildMarketDepthAccessibilityLabel = (input: {
  bidTotalLabel: string;
  askTotalLabel: string;
  liquidityGapClassification: LiquidityGapClassification;
  liquidityGapLabel: string;
  pressureClassification: PressureClassification;
}): string => {
  const gapText =
    input.liquidityGapClassification === "—"
      ? "Liquidity gap unavailable"
      : `Liquidity gap ${input.liquidityGapClassification}, ${input.liquidityGapLabel.replace("%", " percent")}`;

  const pressureText =
    input.pressureClassification === "—"
      ? "Pressure unavailable"
      : `Pressure ${input.pressureClassification}`;

  return `Market depth. Bids ${input.bidTotalLabel}. Asks ${input.askTotalLabel}. ${gapText}. ${pressureText}.`;
};

export const buildMarketDepthPresentation = (input: {
  baseAsset: string;
  bids: readonly OrderBookLevel[];
  asks: readonly OrderBookLevel[];
  buyPressure: number;
  sellPressure: number;
}): MarketDepthPresentation => {
  const boundedBids = selectBoundedDepthLevels(input.bids);
  const boundedAsks = selectBoundedDepthLevels(input.asks);
  const bidCumulative = computeCumulativeQuantities(boundedBids);
  const askCumulative = computeCumulativeQuantities(boundedAsks);
  const bidTotalQuantity = bidCumulative[bidCumulative.length - 1] ?? 0;
  const askTotalQuantity = askCumulative[askCumulative.length - 1] ?? 0;
  const bidTotalLabel = formatCompactDepthQuantity(
    bidTotalQuantity,
    input.baseAsset
  );
  const askTotalLabel = formatCompactDepthQuantity(
    askTotalQuantity,
    input.baseAsset
  );
  const bestBid = boundedBids[0]?.price;
  const bestAsk = boundedAsks[0]?.price;
  const liquidityGapPercent = computeLiquidityGapPercent(bestBid, bestAsk);
  const liquidityGapClassification = classifyLiquidityGap(liquidityGapPercent);
  const liquidityGapLabel = formatLiquidityGapPercent(liquidityGapPercent);
  const pressureClassification = classifyMarketDepthPressure(
    input.buyPressure,
    input.sellPressure
  );
  const chart = buildMarketDepthChartModel(input.bids, input.asks);
  const hasVisibleDepth =
    chart.bidAreaPath.length > 0 || chart.askAreaPath.length > 0;

  return {
    baseAsset: normalizeAssetSymbol(input.baseAsset),
    bidTotalQuantity,
    askTotalQuantity,
    bidTotalLabel,
    askTotalLabel,
    liquidityGapPercent,
    liquidityGapLabel,
    liquidityGapClassification,
    pressureClassification,
    accessibilityLabel: buildMarketDepthAccessibilityLabel({
      bidTotalLabel,
      askTotalLabel,
      liquidityGapClassification,
      liquidityGapLabel,
      pressureClassification
    }),
    chart,
    hasVisibleDepth
  };
};

export const LIQUIDITY_GAP_THRESHOLD_NOTE =
  "Liquidity-gap categories are UI presentation thresholds for this assignment, not financial advice and not a universal market standard.";

const PATH_COORDINATE_PATTERN =
  /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;

export const extractPathCoordinates = (path: string): number[] => {
  if (!path) {
    return [];
  }

  return (path.match(PATH_COORDINATE_PATTERN) ?? []).map((value) =>
    Number(value)
  );
};

export const getPathCoordinateDomain = (
  path: string
): { minX: number; maxX: number; minY: number; maxY: number } | null => {
  const coordinates = extractPathCoordinates(path);

  if (coordinates.length < 2) {
    return null;
  }

  const xs: number[] = [];
  const ys: number[] = [];

  for (let index = 0; index + 1 < coordinates.length; index += 2) {
    xs.push(coordinates[index] ?? 0);
    ys.push(coordinates[index + 1] ?? 0);
  }

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
};

export const coordinatesFitViewBox = (
  path: string,
  domain = MARKET_DEPTH_VIEW_BOX_DOMAIN
): boolean => {
  const bounds = getPathCoordinateDomain(path);

  if (!bounds) {
    return true;
  }

  return (
    bounds.minX >= domain.min &&
    bounds.maxX <= domain.max &&
    bounds.minY >= domain.min &&
    bounds.maxY <= domain.max
  );
};

export const assessCoordinateMismatch = (input: {
  bidAreaPath: string;
  askAreaPath: string;
  componentViewBox: string;
}): {
  pathDomain: { minX: number; maxX: number; minY: number; maxY: number };
  viewBoxDomain: { minX: number; maxX: number; minY: number; maxY: number };
  mismatch: boolean;
} => {
  const paths = [input.bidAreaPath, input.askAreaPath].filter(Boolean);
  const pathBounds = paths
    .map((path) => getPathCoordinateDomain(path))
    .filter((bounds): bounds is NonNullable<typeof bounds> => bounds !== null);

  const pathDomain = pathBounds.reduce(
    (accumulator, bounds) => ({
      minX: Math.min(accumulator.minX, bounds.minX),
      maxX: Math.max(accumulator.maxX, bounds.maxX),
      minY: Math.min(accumulator.minY, bounds.minY),
      maxY: Math.max(accumulator.maxY, bounds.maxY)
    }),
    { minX: 1, maxX: 0, minY: 1, maxY: 0 }
  );

  const viewBoxParts = input.componentViewBox
    .trim()
    .split(/\s+/)
    .map((value) => Number(value));
  const viewBoxDomain = {
    minX: viewBoxParts[0] ?? 0,
    minY: viewBoxParts[1] ?? 0,
    maxX: (viewBoxParts[0] ?? 0) + (viewBoxParts[2] ?? 1),
    maxY: (viewBoxParts[1] ?? 0) + (viewBoxParts[3] ?? 1)
  };

  const mismatch =
    pathDomain.maxX <= 1.01 &&
    pathDomain.maxY <= 1.01 &&
    (viewBoxDomain.maxX > 1.5 || viewBoxDomain.maxY > 1.5);

  return { pathDomain, viewBoxDomain, mismatch };
};

export const bidCurveReachesLeftHalf = (
  bidPoints: readonly NormalizedDepthPoint[]
): boolean => {
  if (bidPoints.length < 2) {
    return false;
  }

  const minX = Math.min(...bidPoints.map((point) => point.x));
  return minX <= 0.5 - 0.5 * 0.1;
};

export const askCurveReachesRightHalf = (
  askPoints: readonly NormalizedDepthPoint[]
): boolean => {
  if (askPoints.length < 2) {
    return false;
  }

  const maxX = Math.max(...askPoints.map((point) => point.x));
  return maxX >= 0.5 + 0.5 * 0.1;
};

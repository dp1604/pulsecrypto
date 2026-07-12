import type { OrderBookLevel, PairSymbol } from "@pulsecrypto/shared";
import type { MarketConnectionStatus } from "./marketWebSocketClient";
import {
  deriveChange24hDirection,
  formatChange24hPresentation,
  formatHighLowPrice,
  formatMarketPrice,
  formatOrderBookAmount,
  formatOrderBookPrice,
  formatOrderBookTotal,
  formatPercentage,
  formatSpread,
  formatVolume,
  type Change24hPresentation,
  type Change24hTone
} from "./marketNumberPresentation";
import { formatConnectionStatusLabel } from "./liveMarketFormatting";

export const DEFAULT_ORDER_BOOK_VISIBLE_DEPTH = 10;

export const MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT = {
  flexDirection: "row" as const,
  alignItems: "flex-end" as const,
  flexWrap: "nowrap" as const,
  gap: 10,
  maxWidth: 390
};

export type MarketDetailsColorPalette = {
  buy: string;
  sell: string;
  textPrimary: string;
  textMuted: string;
};

export const resolveMarketDetailsChangeColor = (
  tone: Change24hTone,
  palette: MarketDetailsColorPalette
): string => {
  switch (tone) {
    case "buy":
      return palette.buy;
    case "sell":
      return palette.sell;
    case "primary":
      return palette.textPrimary;
    default:
      return palette.textMuted;
  }
};

export const selectVisibleBidLevels = (
  bids: readonly OrderBookLevel[],
  depth = DEFAULT_ORDER_BOOK_VISIBLE_DEPTH
): readonly OrderBookLevel[] => bids.slice(0, depth);

export const selectVisibleAskLevels = (
  asks: readonly OrderBookLevel[],
  depth = DEFAULT_ORDER_BOOK_VISIBLE_DEPTH
): readonly OrderBookLevel[] => asks.slice(0, depth);

export type OrderBookColumnLabels = {
  price: string;
  amount: string;
  total: string;
  accessibilityLabel: string;
};

const ORDER_BOOK_MISSING_ASSET = "—";

const normalizeOrderBookAsset = (asset: string): string => {
  const trimmed = asset.trim();

  if (!trimmed) {
    return ORDER_BOOK_MISSING_ASSET;
  }

  return trimmed.replace(/\s+/g, " ").toUpperCase();
};

export const buildOrderBookColumnLabels = (
  baseAsset: string,
  quoteAsset: string
): OrderBookColumnLabels => {
  const base = normalizeOrderBookAsset(baseAsset);
  const quote = normalizeOrderBookAsset(quoteAsset);

  return {
    price: `PRICE (${quote})`,
    amount: `AMOUNT (${base})`,
    total: "TOTAL",
    accessibilityLabel: `Price in ${quote}, amount in ${base}, total in ${quote}`
  };
};

export const computeOrderBookRowTotal = (level: OrderBookLevel): number => {
  const computed = level.price * level.quantity;

  if (Number.isFinite(level.total) && level.total > 0) {
    return level.total;
  }

  return Number.isFinite(computed) && computed >= 0 ? computed : 0;
};

export const computeMaximumVisibleAmount = (
  levels: readonly OrderBookLevel[]
): number => {
  let maximum = 0;

  for (const level of levels) {
    if (Number.isFinite(level.quantity) && level.quantity > maximum) {
      maximum = level.quantity;
    }
  }

  return maximum;
};

export const computeRelativeDepthPercent = (
  amount: number,
  maximumAmount: number
): number => {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  if (!Number.isFinite(maximumAmount) || maximumAmount <= 0) {
    return 0;
  }

  const percent = (amount / maximumAmount) * 100;

  return Math.min(100, Math.max(0, percent));
};

export {
  formatOrderBookAmount,
  formatOrderBookTotal,
  formatOrderBookPrice
} from "./marketNumberPresentation";

export const formatSpreadValue = (value: number): string => formatSpread(value);

export const formatPressurePercent = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return `${value.toFixed(1)}%`;
};

export const formatLastUpdatedUtc = (timestamp: number): string => {
  if (!Number.isFinite(timestamp) || timestamp < 0) {
    return "Last updated unavailable";
  }

  const date = new Date(timestamp);
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  const seconds = date.getUTCSeconds().toString().padStart(2, "0");
  const milliseconds = date.getUTCMilliseconds().toString().padStart(3, "0");

  return `Last updated ${hours}:${minutes}:${seconds}.${milliseconds} UTC`;
};

export const getPairAssetLabels = (
  pair: PairSymbol
): { baseAsset: string; quoteAsset: string } => {
  if (pair.endsWith("USDT") && pair.length > 4) {
    return {
      baseAsset: pair.slice(0, -4),
      quoteAsset: "USDT"
    };
  }

  return {
    baseAsset: pair,
    quoteAsset: "USDT"
  };
};

export const formatPairDisplayLabel = (
  displayName: string | undefined,
  pair: PairSymbol
): string => displayName ?? pair;

export const shouldShowLastKnownLabel = (
  connectionStatus: MarketConnectionStatus,
  hasSnapshot: boolean
): boolean => hasSnapshot && connectionStatus !== "live";

export const formatMarketDetailsStatusLabel = (
  connectionStatus: MarketConnectionStatus,
  hasSnapshot: boolean
): string => {
  if (!hasSnapshot) {
    if (connectionStatus === "connected" || connectionStatus === "live") {
      return "Connected, waiting for data";
    }

    if (connectionStatus === "connecting") {
      return "Connection: Connecting";
    }

    if (connectionStatus === "reconnecting") {
      return "Reconnecting";
    }

    if (connectionStatus === "paused") {
      return "Paused";
    }

    return "Waiting for live market data";
  }

  switch (connectionStatus) {
    case "live":
      return formatConnectionStatusLabel("live");
    case "connected":
      return formatConnectionStatusLabel("connected");
    case "connecting":
      return formatConnectionStatusLabel("connecting");
    case "reconnecting":
      return "Reconnecting";
    case "paused":
      return "Paused";
    case "disconnected":
    case "idle":
    default:
      return "Disconnected — showing last known data";
  }
};

export const formatMarketDetailsPrice = (
  price: number | undefined,
  hasSnapshot: boolean
): string => {
  if (!hasSnapshot || price === undefined) {
    return "Waiting for live market data";
  }

  return formatMarketPrice(price);
};

export const buildMarketDetailsChangePresentation = (
  change: number | undefined,
  hasSnapshot: boolean
): Change24hPresentation => {
  if (!hasSnapshot || change === undefined) {
    return {
      direction: "unavailable",
      displayText: "Waiting for live market data",
      accessibilityLabel: "24-hour change unavailable",
      showTriangle: false,
      tone: "muted",
      roundedPercent: null
    };
  }

  return formatChange24hPresentation(change);
};

export const formatMarketDetailsChange = (
  change: number | undefined,
  hasSnapshot: boolean
): string => buildMarketDetailsChangePresentation(change, hasSnapshot).displayText;

export type MarketDirectionTone = "positive" | "negative" | "neutral" | "unavailable";

export const deriveMarketDirectionTone = (
  change: number | undefined,
  hasSnapshot: boolean
): MarketDirectionTone => {
  if (!hasSnapshot || change === undefined) {
    return "unavailable";
  }

  const direction = deriveChange24hDirection(change);

  if (direction === "unavailable") {
    return "unavailable";
  }

  return direction;
};

export const derivePriceTone = deriveMarketDirectionTone;

export const DEPTH_SUMMARY_COLUMNS_PER_SIDE = 10;

export const DEFAULT_MINIMUM_VISIBLE_DEPTH_PERCENT = 4;

export const computeRenderableDepthHeight = (
  heightPercent: number,
  minimumVisiblePercent = DEFAULT_MINIMUM_VISIBLE_DEPTH_PERCENT
): number => {
  if (!Number.isFinite(heightPercent) || heightPercent <= 0) {
    return 0;
  }

  const minimum =
    Number.isFinite(minimumVisiblePercent) && minimumVisiblePercent > 0
      ? minimumVisiblePercent
      : 0;

  if (minimum > 0 && heightPercent < minimum) {
    return Math.min(100, minimum);
  }

  return Math.min(100, heightPercent);
};

export type DepthSummaryColumn = {
  cumulativeQuantity: number;
  heightPercent: number;
};

export const buildCumulativeDepthColumns = (
  levels: readonly OrderBookLevel[],
  columnCount = DEPTH_SUMMARY_COLUMNS_PER_SIDE
): readonly DepthSummaryColumn[] => {
  if (columnCount <= 0 || levels.length === 0) {
    return Array.from({ length: Math.max(0, columnCount) }, () => ({
      cumulativeQuantity: 0,
      heightPercent: 0
    }));
  }

  const boundedLevels = levels.slice(0, columnCount);
  let runningTotal = 0;
  const cumulativeTotals: number[] = [];

  for (const level of boundedLevels) {
    const quantity = Number.isFinite(level.quantity) ? Math.max(0, level.quantity) : 0;
    runningTotal += quantity;
    cumulativeTotals.push(runningTotal);
  }

  while (cumulativeTotals.length < columnCount) {
    cumulativeTotals.push(runningTotal);
  }

  const maximum = cumulativeTotals[cumulativeTotals.length - 1] ?? 0;

  return cumulativeTotals.map((cumulativeQuantity) => ({
    cumulativeQuantity,
    heightPercent:
      maximum > 0
        ? Math.min(100, Math.max(0, (cumulativeQuantity / maximum) * 100))
        : 0
  }));
};

export type PressureQualitativeLabel = "Buy heavy" | "Sell heavy" | "Balanced";

export const classifyPressureLabel = (
  buyPressure: number,
  sellPressure: number
): PressureQualitativeLabel => {
  if (!Number.isFinite(buyPressure) || !Number.isFinite(sellPressure)) {
    return "Balanced";
  }

  if (buyPressure >= 55) {
    return "Buy heavy";
  }

  if (sellPressure >= 55) {
    return "Sell heavy";
  }

  return "Balanced";
};

export const formatFixtureVolume = (value: number): string =>
  formatVolume(value, true);

export const formatFixturePrice = (value: number): string =>
  formatHighLowPrice(value);

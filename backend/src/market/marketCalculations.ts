import type { OrderBookLevel } from "@pulsecrypto/shared";
import type { OrderBookSide, RawNumericValue, RawOrderBookLevel } from "./MarketTypes";

export const DEFAULT_ORDER_BOOK_DEPTH = 20;

export type PressureResult = {
  buyPressure: number;
  sellPressure: number;
};

export const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : undefined;
};

export const toPositiveFiniteNumber = (
  value: RawNumericValue
): number | undefined => {
  const parsed = toFiniteNumber(value);

  return parsed !== undefined && parsed > 0 ? parsed : undefined;
};

export const toNonNegativeFiniteNumber = (
  value: RawNumericValue
): number | undefined => {
  const parsed = toFiniteNumber(value);

  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
};

export const toNonNegativeTimestamp = (
  value: RawNumericValue
): number | undefined => {
  const parsed = toNonNegativeFiniteNumber(value);

  return parsed !== undefined ? Math.floor(parsed) : undefined;
};

const getRawLevelValues = (
  level: RawOrderBookLevel
): { price: RawNumericValue; quantity: RawNumericValue } => {
  return "price" in level
    ? {
        price: level.price,
        quantity: level.quantity
      }
    : {
        price: level[0],
        quantity: level[1]
      };
};

const normalizeDepthLimit = (limit: number): number => {
  if (!Number.isFinite(limit)) {
    return DEFAULT_ORDER_BOOK_DEPTH;
  }

  return Math.max(0, Math.floor(limit));
};

export const normalizeOrderBookLevels = (
  levels: readonly RawOrderBookLevel[],
  side: OrderBookSide,
  depthLimit = DEFAULT_ORDER_BOOK_DEPTH
): OrderBookLevel[] => {
  const normalized = levels.flatMap((level): OrderBookLevel[] => {
    const { price: rawPrice, quantity: rawQuantity } = getRawLevelValues(level);
    const price = toPositiveFiniteNumber(rawPrice);
    const quantity = toPositiveFiniteNumber(rawQuantity);

    if (price === undefined || quantity === undefined) {
      return [];
    }

    return [
      {
        price,
        quantity,
        total: price * quantity
      }
    ];
  });

  normalized.sort((left, right) =>
    side === "bid" ? right.price - left.price : left.price - right.price
  );

  return normalized.slice(0, normalizeDepthLimit(depthLimit));
};

export const computeSpread = (
  bids: readonly OrderBookLevel[],
  asks: readonly OrderBookLevel[]
): number | undefined => {
  const bestBid = bids[0];
  const bestAsk = asks[0];

  if (bestBid === undefined || bestAsk === undefined) {
    return undefined;
  }

  return bestAsk.price - bestBid.price;
};

export const computePressure = (
  bids: readonly OrderBookLevel[],
  asks: readonly OrderBookLevel[]
): PressureResult => {
  const totalBidQuantity = bids.reduce(
    (sum, level) => sum + level.quantity,
    0
  );
  const totalAskQuantity = asks.reduce(
    (sum, level) => sum + level.quantity,
    0
  );
  const totalQuantity = totalBidQuantity + totalAskQuantity;

  if (totalQuantity === 0) {
    return {
      buyPressure: 0,
      sellPressure: 0
    };
  }

  const buyPressure = (totalBidQuantity / totalQuantity) * 100;

  return {
    buyPressure,
    sellPressure: 100 - buyPressure
  };
};

import { isSupportedPairSymbol } from "@pulsecrypto/shared";
import type {
  MarketDepthUpdate,
  MarketTickerUpdate,
  RawNumericValue,
  RawOrderBookLevel
} from "../market/MarketTypes";
import {
  toFiniteNumber,
  toNonNegativeFiniteNumber,
  toNonNegativeTimestamp,
  toPositiveFiniteNumber
} from "../market/marketCalculations";
import {
  BINANCE_DEPTH_STREAM_SUFFIX,
  BINANCE_TICKER_STREAM_SUFFIX
} from "./BinanceStreamNames";

export type ParsedBinanceMessage =
  | {
      type: "ticker";
      update: MarketTickerUpdate;
    }
  | {
      type: "depth";
      update: MarketDepthUpdate;
    };

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseJsonIfNeeded = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
};

const asRawNumericValue = (value: unknown): RawNumericValue | undefined =>
  typeof value === "number" || typeof value === "string" ? value : undefined;

const parseFinite = (value: unknown): number | undefined => {
  const rawValue = asRawNumericValue(value);

  return rawValue === undefined ? undefined : toFiniteNumber(rawValue);
};

const parsePositive = (value: unknown): number | undefined => {
  const rawValue = asRawNumericValue(value);

  return rawValue === undefined ? undefined : toPositiveFiniteNumber(rawValue);
};

const parseNonNegative = (value: unknown): number | undefined => {
  const rawValue = asRawNumericValue(value);

  return rawValue === undefined
    ? undefined
    : toNonNegativeFiniteNumber(rawValue);
};

const parseTimestamp = (value: unknown): number | undefined => {
  const rawValue = asRawNumericValue(value);

  return rawValue === undefined ? undefined : toNonNegativeTimestamp(rawValue);
};

const pairFromStream = (stream: string): string | undefined => {
  const [pair] = stream.split("@");

  return pair === undefined || pair === "" ? undefined : pair.toUpperCase();
};

const parseTicker = (data: UnknownRecord): MarketTickerUpdate | undefined => {
  if (typeof data.s !== "string" || !isSupportedPairSymbol(data.s)) {
    return undefined;
  }

  const price = parsePositive(data.c);
  const change24hPercent = parseFinite(data.P);
  const high24h = parseNonNegative(data.h);
  const low24h = parseNonNegative(data.l);
  const volume24h = parseNonNegative(data.v);
  const timestamp = parseTimestamp(data.E);

  if (
    price === undefined ||
    change24hPercent === undefined ||
    high24h === undefined ||
    low24h === undefined ||
    volume24h === undefined ||
    timestamp === undefined
  ) {
    return undefined;
  }

  return {
    pair: data.s,
    price,
    change24hPercent,
    high24h,
    low24h,
    volume24h,
    timestamp
  };
};

const parseDepthLevels = (
  levels: unknown
): readonly RawOrderBookLevel[] | undefined => {
  if (!Array.isArray(levels)) {
    return undefined;
  }

  const parsedLevels: RawOrderBookLevel[] = [];

  for (const level of levels) {
    if (!Array.isArray(level) || level.length < 2) {
      return undefined;
    }

    const price = parsePositive(level[0]);
    const quantity = parsePositive(level[1]);

    if (price === undefined || quantity === undefined) {
      return undefined;
    }

    parsedLevels.push([price, quantity]);
  }

  return parsedLevels;
};

const parseDepth = (
  stream: string,
  data: UnknownRecord,
  receivedAtMs: number
): MarketDepthUpdate | undefined => {
  const pair = pairFromStream(stream);

  if (pair === undefined || !isSupportedPairSymbol(pair)) {
    return undefined;
  }

  const timestamp = toNonNegativeTimestamp(receivedAtMs);

  if (timestamp === undefined) {
    return undefined;
  }

  const bids = parseDepthLevels(data.bids);
  const asks = parseDepthLevels(data.asks);

  if (bids === undefined || asks === undefined) {
    return undefined;
  }

  return {
    pair,
    bids,
    asks,
    timestamp
  };
};

export const parseBinanceCombinedMessage = (
  message: unknown,
  receivedAtMs: number
): ParsedBinanceMessage | undefined => {
  const parsedMessage = parseJsonIfNeeded(message);

  if (!isRecord(parsedMessage) || typeof parsedMessage.stream !== "string") {
    return undefined;
  }

  const data = parsedMessage.data;

  if (!isRecord(data)) {
    return undefined;
  }

  if (
    parsedMessage.stream.endsWith(`@${BINANCE_TICKER_STREAM_SUFFIX}`) ||
    data.e === "24hrTicker"
  ) {
    const update = parseTicker(data);

    return update === undefined
      ? undefined
      : {
          type: "ticker",
          update
        };
  }

  if (parsedMessage.stream.includes(`@${BINANCE_DEPTH_STREAM_SUFFIX}`)) {
    const update = parseDepth(parsedMessage.stream, data, receivedAtMs);

    return update === undefined
      ? undefined
      : {
          type: "depth",
          update
        };
  }

  return undefined;
};

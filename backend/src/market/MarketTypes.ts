import type {
  OrderBookLevel,
  PairSymbol,
  SupportedPair
} from "@pulsecrypto/shared";

export type RawNumericValue = number | string;

export type RawOrderBookLevel =
  | {
      price: RawNumericValue;
      quantity: RawNumericValue;
    }
  | readonly [RawNumericValue, RawNumericValue];

export type OrderBookSide = "bid" | "ask";

export type MarketTickerUpdate = {
  pair: string;
  price: RawNumericValue;
  change24hPercent: RawNumericValue;
  high24h: RawNumericValue;
  low24h: RawNumericValue;
  volume24h: RawNumericValue;
  timestamp: RawNumericValue;
};

export type MarketTickerState = {
  price: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
};

export type MarketDepthUpdate = {
  pair: string;
  bids: readonly RawOrderBookLevel[];
  asks: readonly RawOrderBookLevel[];
  timestamp: RawNumericValue;
  depthLimit?: number;
};

export type MarketDepthState = {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  timestamp: number;
};

export type MarketPairState = Pick<SupportedPair, "pair" | "displayName"> & {
  pair: PairSymbol;
  ticker?: MarketTickerState;
  depth?: MarketDepthState;
};

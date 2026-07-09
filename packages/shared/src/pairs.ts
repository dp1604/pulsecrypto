import { z } from "zod";

export const SUPPORTED_PAIR_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "DOGEUSDT",
  "XRPUSDT"
] as const;

export type PairSymbol = (typeof SUPPORTED_PAIR_SYMBOLS)[number];

export const TRADING_STATUS_VALUES = ["TRADING"] as const;

export type TradingStatus = (typeof TRADING_STATUS_VALUES)[number];

export const PairSymbolSchema = z.enum(SUPPORTED_PAIR_SYMBOLS);

export const TradingStatusSchema = z.enum(TRADING_STATUS_VALUES);

export type SupportedPair = {
  pair: PairSymbol;
  displayName: string;
  tradingStatus: TradingStatus;
};

export const SUPPORTED_PAIRS = [
  {
    pair: "BTCUSDT",
    displayName: "BTC / USDT",
    tradingStatus: "TRADING"
  },
  {
    pair: "ETHUSDT",
    displayName: "ETH / USDT",
    tradingStatus: "TRADING"
  },
  {
    pair: "SOLUSDT",
    displayName: "SOL / USDT",
    tradingStatus: "TRADING"
  },
  {
    pair: "DOGEUSDT",
    displayName: "DOGE / USDT",
    tradingStatus: "TRADING"
  },
  {
    pair: "XRPUSDT",
    displayName: "XRP / USDT",
    tradingStatus: "TRADING"
  }
] as const satisfies readonly SupportedPair[];

export const isSupportedPairSymbol = (value: string): value is PairSymbol =>
  SUPPORTED_PAIR_SYMBOLS.includes(value as PairSymbol);

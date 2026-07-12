import type { PairSymbol } from "@pulsecrypto/shared";

export type MarketsStackParamList = {
  Watchlist: undefined;
  MarketDetails: {
    pair: PairSymbol;
  };
};

import {
  type PairMeta,
  type PairSymbol,
  SUPPORTED_PAIRS
} from "@pulsecrypto/shared";

type MockPairMarketStats = Pick<PairMeta, "high24h" | "low24h" | "volume24h">;

const MOCK_PAIR_MARKET_STATS: Record<PairSymbol, MockPairMarketStats> = {
  BTCUSDT: {
    high24h: 110000,
    low24h: 105000,
    volume24h: 18250.32
  },
  ETHUSDT: {
    high24h: 4200,
    low24h: 3950,
    volume24h: 256900.45
  },
  SOLUSDT: {
    high24h: 185,
    low24h: 171,
    volume24h: 890120.77
  },
  DOGEUSDT: {
    high24h: 0.21,
    low24h: 0.19,
    volume24h: 145002340.11
  },
  XRPUSDT: {
    high24h: 0.64,
    low24h: 0.59,
    volume24h: 96300120.4
  }
};

export const getPairMetadata = (): PairMeta[] =>
  SUPPORTED_PAIRS.map((pair) => ({
    pair: pair.pair,
    displayName: pair.displayName,
    tradingStatus: pair.tradingStatus,
    ...MOCK_PAIR_MARKET_STATS[pair.pair]
  }));

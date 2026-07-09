import {
  isSupportedPairSymbol,
  type PairSymbol,
  SUPPORTED_PAIR_SYMBOLS
} from "@pulsecrypto/shared";

export const BINANCE_SPOT_WS_BASE_URL = "wss://stream.binance.com:9443";
export const BINANCE_DEPTH_STREAM_SUFFIX = "depth20@100ms";
export const BINANCE_TICKER_STREAM_SUFFIX = "ticker";

export type BuildBinanceCombinedStreamUrlOptions = {
  baseUrl?: string | undefined;
  streamNames?: readonly string[] | undefined;
};

const normalizeSupportedPair = (pair: string): PairSymbol | undefined => {
  const normalized = pair.toUpperCase();

  return isSupportedPairSymbol(normalized) ? normalized : undefined;
};

export const toBinancePairName = (pair: PairSymbol): string =>
  pair.toLowerCase();

export const buildBinanceStreamNames = (
  pairs: readonly string[] = SUPPORTED_PAIR_SYMBOLS
): string[] => {
  const seenPairs = new Set<PairSymbol>();
  const streamNames: string[] = [];

  for (const pair of pairs) {
    const supportedPair = normalizeSupportedPair(pair);

    if (supportedPair === undefined || seenPairs.has(supportedPair)) {
      continue;
    }

    seenPairs.add(supportedPair);

    const binancePair = toBinancePairName(supportedPair);

    streamNames.push(
      `${binancePair}@${BINANCE_DEPTH_STREAM_SUFFIX}`,
      `${binancePair}@${BINANCE_TICKER_STREAM_SUFFIX}`
    );
  }

  return streamNames;
};

export const buildBinanceCombinedStreamUrl = (
  options: BuildBinanceCombinedStreamUrlOptions = {}
): string => {
  const baseUrl = (options.baseUrl ?? BINANCE_SPOT_WS_BASE_URL).replace(
    /\/+$/,
    ""
  );
  const streamNames = options.streamNames ?? buildBinanceStreamNames();

  return `${baseUrl}/stream?streams=${streamNames.join("/")}`;
};

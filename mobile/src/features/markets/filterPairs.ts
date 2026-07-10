import type { PairMeta } from "@pulsecrypto/shared";

const deriveBaseAsset = (pair: string): string => {
  if (pair.endsWith("USDT")) {
    return pair.slice(0, -4);
  }

  return pair;
};

const deriveQuoteAsset = (pair: string): string => {
  if (pair.endsWith("USDT")) {
    return "USDT";
  }

  return "";
};

const matchesQuery = (item: PairMeta, normalizedQuery: string): boolean => {
  const pair = item.pair.toLowerCase();
  const displayName = item.displayName.toLowerCase();
  const baseAsset = deriveBaseAsset(item.pair).toLowerCase();
  const quoteAsset = deriveQuoteAsset(item.pair).toLowerCase();

  return (
    pair.includes(normalizedQuery) ||
    displayName.includes(normalizedQuery) ||
    baseAsset.includes(normalizedQuery) ||
    quoteAsset.includes(normalizedQuery)
  );
};

export const filterPairs = (items: readonly PairMeta[], query: string): PairMeta[] => {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0) {
    return [...items];
  }

  return items.filter((item) => matchesQuery(item, normalizedQuery));
};

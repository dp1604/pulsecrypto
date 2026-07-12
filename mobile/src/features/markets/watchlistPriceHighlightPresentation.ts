import { SUPPORTED_PAIR_SYMBOLS } from "@pulsecrypto/shared";
import type { WatchlistDisplayValuesAll } from "./marketMotionPresentation";

export const WATCHLIST_PRICE_HIGHLIGHT_DURATION_MS = 180;

export type WatchlistPriceHighlightDirection = "increase" | "decrease" | "none";

export type WatchlistPriceHighlightMap = Record<
  (typeof SUPPORTED_PAIR_SYMBOLS)[number],
  WatchlistPriceHighlightDirection
>;

export const WATCHLIST_PRICE_DISPLAY_INDEXES = [0, 2, 4, 6, 8] as const;

export const createNeutralWatchlistPriceHighlightMap =
  (): WatchlistPriceHighlightMap =>
    SUPPORTED_PAIR_SYMBOLS.reduce<WatchlistPriceHighlightMap>((accumulator, pair) => {
      accumulator[pair] = "none";
      return accumulator;
    }, {} as WatchlistPriceHighlightMap);

export const deriveWatchlistPriceHighlightDirection = (
  previousPrice: number | undefined,
  nextPrice: number | undefined
): WatchlistPriceHighlightDirection => {
  if (previousPrice === undefined || nextPrice === undefined) {
    return "none";
  }

  if (!Number.isFinite(previousPrice) || !Number.isFinite(nextPrice)) {
    return "none";
  }

  if (nextPrice > previousPrice) {
    return "increase";
  }

  if (nextPrice < previousPrice) {
    return "decrease";
  }

  return "none";
};

export const deriveWatchlistPriceHighlightMap = (
  previousValues: WatchlistDisplayValuesAll | null,
  nextValues: WatchlistDisplayValuesAll
): WatchlistPriceHighlightMap => {
  const highlights = createNeutralWatchlistPriceHighlightMap();

  if (previousValues === null) {
    return highlights;
  }

  WATCHLIST_PRICE_DISPLAY_INDEXES.forEach((priceIndex, pairIndex) => {
    const pair = SUPPORTED_PAIR_SYMBOLS[pairIndex];
    if (pair === undefined) {
      return;
    }

    highlights[pair] = deriveWatchlistPriceHighlightDirection(
      previousValues[priceIndex],
      nextValues[priceIndex]
    );
  });

  return highlights;
};

export const watchlistPriceHighlightMapHasActiveDirection = (
  highlights: WatchlistPriceHighlightMap
): boolean =>
  Object.values(highlights).some(
    (direction) => direction === "increase" || direction === "decrease"
  );

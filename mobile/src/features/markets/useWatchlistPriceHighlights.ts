import { useEffect, useRef, useState } from "react";
import type { WatchlistDisplayValuesAll } from "./marketMotionPresentation";
import {
  createNeutralWatchlistPriceHighlightMap,
  deriveWatchlistPriceHighlightMap,
  WATCHLIST_PRICE_HIGHLIGHT_DURATION_MS,
  watchlistPriceHighlightMapHasActiveDirection,
  type WatchlistPriceHighlightMap
} from "./watchlistPriceHighlightPresentation";

export const useWatchlistPriceHighlights = (
  displayValuesAll: WatchlistDisplayValuesAll
): WatchlistPriceHighlightMap => {
  const previousValuesRef = useRef<WatchlistDisplayValuesAll | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlights, setHighlights] = useState<WatchlistPriceHighlightMap>(
    createNeutralWatchlistPriceHighlightMap
  );

  useEffect(() => {
    const previousValues = previousValuesRef.current;
    const nextHighlights = deriveWatchlistPriceHighlightMap(
      previousValues,
      displayValuesAll
    );

    previousValuesRef.current = displayValuesAll;

    if (!watchlistPriceHighlightMapHasActiveDirection(nextHighlights)) {
      return;
    }

    if (clearTimerRef.current !== null) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }

    setHighlights(nextHighlights);

    clearTimerRef.current = setTimeout(() => {
      setHighlights(createNeutralWatchlistPriceHighlightMap());
      clearTimerRef.current = null;
    }, WATCHLIST_PRICE_HIGHLIGHT_DURATION_MS);
  }, [displayValuesAll]);

  useEffect(
    () => () => {
      if (clearTimerRef.current !== null) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    },
    []
  );

  return highlights;
};

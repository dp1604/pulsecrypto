import { SUPPORTED_PAIR_SYMBOLS } from "@pulsecrypto/shared";
import {
  CHANGE_24H_DISPLAY_FRACTION_DIGITS,
  resolveMarketPriceFractionDigits,
  roundChange24hPercent
} from "./marketNumberPresentation";

export type PriceMovementDirection = "increase" | "decrease" | "equal" | "none";
export type PriceMotionMode = "animated" | "instant";

/** Native-driver opacity flash stays under the 250ms publication interval. */
export const PRICE_TICK_OPACITY_IN_MS = 60;
export const PRICE_TICK_OPACITY_HOLD_MS = 60;
export const PRICE_TICK_OPACITY_OUT_MS = 120;
export const PRICE_TICK_OPACITY_TOTAL_MS =
  PRICE_TICK_OPACITY_IN_MS + PRICE_TICK_OPACITY_HOLD_MS + PRICE_TICK_OPACITY_OUT_MS;

/** Watchlist instant flash hold — visible without interpolated frames. */
export const PRICE_TICK_INSTANT_HOLD_MS = 160;

/** Minimum interval between informational price-direction flashes per component. */
export const PRICE_TICK_FLASH_MIN_INTERVAL_MS = 1500;

const roundToFractionDigits = (value: number, fractionDigits: number): number => {
  const factor = 10 ** fractionDigits;
  return Math.round(value * factor) / factor;
};

/** Rounds price to the precision rendered on the Watchlist. */
export const roundDisplayPrice = (value: number): number =>
  roundToFractionDigits(value, resolveMarketPriceFractionDigits(value));

/** Rounds 24h change to the two-decimal percentage shown on the Watchlist. */
export const roundDisplayChange24h = (value: number): number =>
  roundChange24hPercent(value);

export type WatchlistDisplayValues = readonly [
  displayPrice: number | undefined,
  displayChange24h: number | undefined
];

/** Flat tuple of all five supported pairs in SUPPORTED_PAIR_SYMBOLS order. */
export type WatchlistDisplayValuesAll = readonly [
  number | undefined,
  number | undefined,
  number | undefined,
  number | undefined,
  number | undefined,
  number | undefined,
  number | undefined,
  number | undefined,
  number | undefined,
  number | undefined
];

export const WATCHLIST_DISPLAY_PRIMITIVE_COUNT =
  SUPPORTED_PAIR_SYMBOLS.length * 2;

export const selectWatchlistDisplayValuesByPair =
  (pair: string) =>
  (state: { snapshotsByPair: Record<string, { price?: number; change24hPercent?: number } | undefined> }): WatchlistDisplayValues => {
    const snapshot = state.snapshotsByPair[pair];
    if (snapshot === undefined) {
      return [undefined, undefined];
    }

    const displayPrice =
      typeof snapshot.price === "number" && Number.isFinite(snapshot.price)
        ? roundDisplayPrice(snapshot.price)
        : undefined;
    const displayChange24h =
      typeof snapshot.change24hPercent === "number" &&
      Number.isFinite(snapshot.change24hPercent)
        ? roundDisplayChange24h(snapshot.change24hPercent)
        : undefined;

    return [displayPrice, displayChange24h];
  };

export const selectWatchlistDisplayValuesAll =
  (state: {
    snapshotsByPair: Record<
      string,
      { price?: number; change24hPercent?: number } | undefined
    >;
  }): WatchlistDisplayValuesAll => {
    const values: (number | undefined)[] = [];

    for (const pair of SUPPORTED_PAIR_SYMBOLS) {
      const [displayPrice, displayChange24h] =
        selectWatchlistDisplayValuesByPair(pair)(state);
      values.push(displayPrice, displayChange24h);
    }

    return values as unknown as WatchlistDisplayValuesAll;
  };

export const watchlistDisplayValuesAllEqual = (
  previous: WatchlistDisplayValuesAll,
  next: WatchlistDisplayValuesAll
): boolean => {
  if (previous.length !== next.length) {
    return false;
  }

  for (let index = 0; index < previous.length; index += 1) {
    if (previous[index] !== next[index]) {
      return false;
    }
  }

  return true;
};

export const resolveWatchlistDisplayValuesForPair = (
  allValues: WatchlistDisplayValuesAll,
  pair: string
): WatchlistDisplayValues => {
  const pairIndex = SUPPORTED_PAIR_SYMBOLS.indexOf(pair as never);

  if (pairIndex < 0) {
    return [undefined, undefined];
  }

  const offset = pairIndex * 2;
  return [allValues[offset], allValues[offset + 1]];
};

export const watchlistDisplayValuesEqual = (
  previous: WatchlistDisplayValues,
  next: WatchlistDisplayValues
): boolean =>
  previous[0] === next[0] && previous[1] === next[1];

export const isSubprecisionPriceChange = (
  previousRaw: number,
  nextRaw: number
): boolean => roundDisplayPrice(previousRaw) === roundDisplayPrice(nextRaw);

export const isSubprecisionChange24hChange = (
  previousRaw: number,
  nextRaw: number
): boolean =>
  roundDisplayChange24h(previousRaw) === roundDisplayChange24h(nextRaw);

export const CHANGE_24H_DISPLAY_PRECISION = CHANGE_24H_DISPLAY_FRACTION_DIGITS;

/** Legacy color-interpolation constants retained for regression tests only. */
export const PRICE_TICK_COLOR_IN_MS = PRICE_TICK_OPACITY_IN_MS;
export const PRICE_TICK_COLOR_HOLD_MS = PRICE_TICK_OPACITY_HOLD_MS;
export const PRICE_TICK_COLOR_OUT_MS = PRICE_TICK_OPACITY_OUT_MS;
export const PRICE_TICK_COLOR_TOTAL_MS = PRICE_TICK_OPACITY_TOTAL_MS;
export const PRICE_TICK_REDUCED_MOTION_HOLD_MS = 200;
export const DEPTH_TRANSITION_DURATION_MS = 100;
export const DEPTH_MIN_CHANGE_THRESHOLD_PERCENT = 0.5;

export const isValidMotionPrice = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const classifyPriceMovement = (
  previousPrice: number | null,
  nextPrice: number | null,
  resetOccurred: boolean
): PriceMovementDirection => {
  if (resetOccurred) {
    return "none";
  }

  if (!isValidMotionPrice(nextPrice)) {
    return "none";
  }

  if (!isValidMotionPrice(previousPrice)) {
    return "none";
  }

  if (nextPrice > previousPrice) {
    return "increase";
  }

  if (nextPrice < previousPrice) {
    return "decrease";
  }

  return "equal";
};

export const shouldTriggerPriceFlash = (
  movement: PriceMovementDirection,
  lastFlashAt: number | null,
  now: number,
  minIntervalMs = PRICE_TICK_FLASH_MIN_INTERVAL_MS
): boolean => {
  if (movement !== "increase" && movement !== "decrease") {
    return false;
  }

  if (lastFlashAt === null) {
    return true;
  }

  return now - lastFlashAt >= minIntervalMs;
};

export const clampDepthTargetPercent = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
};

export const hasMeaningfulDepthChange = (
  previousPercent: number,
  nextPercent: number
): boolean => {
  const previous = clampDepthTargetPercent(previousPercent);
  const next = clampDepthTargetPercent(nextPercent);

  return Math.abs(next - previous) >= DEPTH_MIN_CHANGE_THRESHOLD_PERCENT;
};

export const shouldAnimateDepthTransition = (
  previousPercent: number,
  nextPercent: number,
  isFirstRender: boolean,
  reduceMotionEnabled: boolean
): boolean => {
  if (isFirstRender || reduceMotionEnabled) {
    return false;
  }

  return hasMeaningfulDepthChange(previousPercent, nextPercent);
};

export const resolveDepthAnimationTarget = (
  nextPercent: number,
  reduceMotionEnabled: boolean
): number => clampDepthTargetPercent(nextPercent);

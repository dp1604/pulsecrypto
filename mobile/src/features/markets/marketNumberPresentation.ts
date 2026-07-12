export const MARKET_NUMBER_UNAVAILABLE = "—";

export const CHANGE_24H_DISPLAY_FRACTION_DIGITS = 2;

const isValidNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export const formatGroupedDecimal = (
  value: number,
  fractionDigits: number,
  options?: { minimumFractionDigits?: number }
): string => {
  if (!isValidNumber(value)) {
    return MARKET_NUMBER_UNAVAILABLE;
  }

  const minimumFractionDigits =
    options?.minimumFractionDigits ?? fractionDigits;

  return value.toLocaleString("en-US", {
    useGrouping: true,
    minimumFractionDigits,
    maximumFractionDigits: fractionDigits
  });
};

export const resolveMarketPriceFractionDigits = (value: number): number => {
  const abs = Math.abs(value);

  if (abs >= 1_000) {
    return 2;
  }

  if (abs >= 1) {
    return 4;
  }

  if (abs >= 0.01) {
    return 6;
  }

  return 8;
};

export const formatMarketPrice = (value: number | undefined): string => {
  if (!isValidNumber(value)) {
    return MARKET_NUMBER_UNAVAILABLE;
  }

  if (value === 0) {
    return formatGroupedDecimal(0, 2);
  }

  return formatGroupedDecimal(value, resolveMarketPriceFractionDigits(value));
};

export const formatOrderBookPrice = (value: number): string => {
  if (!isValidNumber(value)) {
    return MARKET_NUMBER_UNAVAILABLE;
  }

  return formatGroupedDecimal(value, 2);
};

export const formatOrderBookAmount = (value: number): string => {
  if (!isValidNumber(value)) {
    return MARKET_NUMBER_UNAVAILABLE;
  }

  if (value === 0) {
    return formatGroupedDecimal(0, 5);
  }

  const abs = Math.abs(value);

  if (abs >= 1_000 || abs >= 1 || abs >= 0.01) {
    return formatGroupedDecimal(value, 5);
  }

  return formatGroupedDecimal(value, 8);
};

export const formatOrderBookTotal = (value: number): string => {
  if (!isValidNumber(value)) {
    return MARKET_NUMBER_UNAVAILABLE;
  }

  if (value === 0) {
    return formatGroupedDecimal(0, 2);
  }

  if (Math.abs(value) >= 1) {
    return formatGroupedDecimal(value, 2);
  }

  return formatGroupedDecimal(value, 4);
};

export const formatHighLowPrice = (value: number): string => {
  if (!isValidNumber(value)) {
    return MARKET_NUMBER_UNAVAILABLE;
  }

  return formatGroupedDecimal(value, 2);
};

export const formatVolume = (value: number, compact = false): string => {
  if (!isValidNumber(value)) {
    return MARKET_NUMBER_UNAVAILABLE;
  }

  if (compact) {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(2)}K`;
    }
  }

  return formatGroupedDecimal(value, 2);
};

export const formatSpread = (value: number): string => formatMarketPrice(value);

export const formatPercentage = (value: number): string => {
  if (!isValidNumber(value)) {
    return MARKET_NUMBER_UNAVAILABLE;
  }

  const rounded = roundChange24hPercent(value);
  const formatted = rounded.toFixed(CHANGE_24H_DISPLAY_FRACTION_DIGITS);

  if (rounded > 0) {
    return `+${formatted}%`;
  }

  if (rounded < 0) {
    return `${formatted}%`;
  }

  return "0.00%";
};

export const formatCompactDepthQuantity = (
  value: number,
  asset: string
): string => {
  const symbol = asset.trim() ? asset.trim().replace(/\s+/g, " ").toUpperCase() : "—";

  if (!isValidNumber(value) || value <= 0) {
    return MARKET_NUMBER_UNAVAILABLE;
  }

  if (value >= 1_000) {
    const thousands = value / 1_000;
    const formatted =
      thousands >= 10 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${formatted}k ${symbol}`;
  }

  if (value >= 1) {
    const formatted = value >= 100 ? value.toFixed(0) : value.toFixed(2);
    return `${formatted} ${symbol}`;
  }

  return `${value.toFixed(2)} ${symbol}`;
};

export type Change24hDirection = "positive" | "negative" | "neutral" | "unavailable";

export type Change24hTone = "buy" | "sell" | "primary" | "muted";

export type Change24hPresentation = {
  direction: Change24hDirection;
  displayText: string;
  accessibilityLabel: string;
  showTriangle: boolean;
  tone: Change24hTone;
  roundedPercent: number | null;
};

export const roundChange24hPercent = (value: number): number => {
  const factor = 10 ** CHANGE_24H_DISPLAY_FRACTION_DIGITS;
  return Math.round(value * factor) / factor;
};

export const deriveChange24hDirection = (
  value: number | undefined
): Change24hDirection => {
  if (!isValidNumber(value)) {
    return "unavailable";
  }

  const rounded = roundChange24hPercent(value);

  if (rounded > 0) {
    return "positive";
  }

  if (rounded < 0) {
    return "negative";
  }

  return "neutral";
};

export const resolveChange24hTone = (
  direction: Change24hDirection
): Change24hTone => {
  switch (direction) {
    case "positive":
      return "buy";
    case "negative":
      return "sell";
    case "neutral":
      return "primary";
    default:
      return "muted";
  }
};

export const formatRoundedChange24hPercent = (value: number): string =>
  `${Math.abs(roundChange24hPercent(value)).toFixed(
    CHANGE_24H_DISPLAY_FRACTION_DIGITS
  )}%`;

export const formatChange24hPresentation = (
  value: number | undefined
): Change24hPresentation => {
  const direction = deriveChange24hDirection(value);

  if (direction === "unavailable") {
    return {
      direction,
      displayText: MARKET_NUMBER_UNAVAILABLE,
      accessibilityLabel: "24-hour change unavailable",
      showTriangle: false,
      tone: "muted",
      roundedPercent: null
    };
  }

  const rounded = roundChange24hPercent(value as number);
  const tone = resolveChange24hTone(direction);

  if (direction === "neutral") {
    return {
      direction,
      displayText: "0.00%",
      accessibilityLabel: "No 24-hour change",
      showTriangle: false,
      tone,
      roundedPercent: rounded
    };
  }

  const absolutePercent = Math.abs(rounded).toFixed(
    CHANGE_24H_DISPLAY_FRACTION_DIGITS
  );

  if (direction === "positive") {
    return {
      direction,
      displayText: `▲ ${absolutePercent}%`,
      accessibilityLabel: `Up ${absolutePercent} percent over 24 hours`,
      showTriangle: true,
      tone,
      roundedPercent: rounded
    };
  }

  return {
    direction,
    displayText: `▼ ${absolutePercent}%`,
    accessibilityLabel: `Down ${absolutePercent} percent over 24 hours`,
    showTriangle: true,
    tone,
    roundedPercent: rounded
  };
};

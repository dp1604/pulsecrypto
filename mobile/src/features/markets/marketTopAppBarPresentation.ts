import type { MarketConnectionStatus } from "./marketWebSocketClient";

export type TopAppBarConnectionTone =
  | "connected"
  | "warning"
  | "muted"
  | "error";

export type TopAppBarConnectionPresentation = {
  statusLabel: string;
  tone: TopAppBarConnectionTone;
  dotColorKey: TopAppBarConnectionTone;
  signalTintKey: TopAppBarConnectionTone;
  accessibilityLabel: string;
};

export const MARKET_TOP_APP_BAR_HEIGHT_DP = 56;
export const MARKET_TOP_APP_BAR_HORIZONTAL_PADDING_DP = 16;
export const MARKET_TOP_APP_BAR_BACK_WIDTH_DP = 21;
export const MARKET_TOP_APP_BAR_BACK_HEIGHT_DP = 21;
export const MARKET_TOP_APP_BAR_SIGNAL_WIDTH_DP = 20;
export const MARKET_TOP_APP_BAR_SIGNAL_HEIGHT_DP = 15;
export const MARKET_TOP_APP_BAR_TITLE_FONT_SIZE_DP = 17;

export const deriveTopAppBarConnectionPresentation = (
  status: MarketConnectionStatus,
  reconnectAttempt = 0
): TopAppBarConnectionPresentation => {
  switch (status) {
    case "live":
      return {
        statusLabel: "CONNECTED",
        tone: "connected",
        dotColorKey: "connected",
        signalTintKey: "connected",
        accessibilityLabel: "Market connection connected"
      };
    case "connected":
      return {
        statusLabel: "CONNECTING",
        tone: "warning",
        dotColorKey: "warning",
        signalTintKey: "warning",
        accessibilityLabel: "Market connection connecting"
      };
    case "connecting":
      return {
        statusLabel: "CONNECTING",
        tone: "warning",
        dotColorKey: "warning",
        signalTintKey: "warning",
        accessibilityLabel: "Market connection connecting"
      };
    case "reconnecting":
      return {
        statusLabel: "RECONNECTING",
        tone: "warning",
        dotColorKey: "warning",
        signalTintKey: "warning",
        accessibilityLabel: `Market connection reconnecting attempt ${reconnectAttempt}`
      };
    case "paused":
      return {
        statusLabel: "PAUSED",
        tone: "muted",
        dotColorKey: "muted",
        signalTintKey: "muted",
        accessibilityLabel: "Market connection paused"
      };
    case "disconnected":
      return {
        statusLabel: "DISCONNECTED",
        tone: "error",
        dotColorKey: "error",
        signalTintKey: "error",
        accessibilityLabel: "Market connection disconnected"
      };
    case "idle":
    default:
      return {
        statusLabel: "DISCONNECTED",
        tone: "muted",
        dotColorKey: "muted",
        signalTintKey: "muted",
        accessibilityLabel: "Market connection disconnected"
      };
  }
};

export const resolveTopAppBarToneColor = (
  tone: TopAppBarConnectionTone,
  palette: {
    buy: string;
    warning: string;
    textMuted: string;
    sell: string;
  }
): string => {
  switch (tone) {
    case "connected":
      return palette.buy;
    case "warning":
      return palette.warning;
    case "error":
      return palette.sell;
    case "muted":
    default:
      return palette.textMuted;
  }
};

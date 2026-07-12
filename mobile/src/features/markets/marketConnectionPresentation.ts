import type { MarketConnectionStatus } from "./marketWebSocketClient";

export type ConnectionTone =
  | "positive"
  | "warning"
  | "neutral"
  | "muted"
  | "negative";

export type MarketConnectionPresentation = {
  compactLabel: string;
  tone: ConnectionTone;
  showLastKnown: boolean;
  showPersistentAlert: boolean;
  persistentAlertMessage: string | null;
  showRetry: boolean;
  accessibilityLabel: string;
  reconnectAttemptSuffix: string | null;
};

export type MarketConnectionPresentationInput = {
  status: MarketConnectionStatus;
  hasSnapshot: boolean;
  reconnectAttempt: number;
  connectionErrorMessage: string | null;
};

const RECONNECT_ATTEMPT_LABEL_THRESHOLD = 2;

const hasPersistentError = (
  status: MarketConnectionStatus,
  connectionErrorMessage: string | null
): boolean => {
  if (connectionErrorMessage === null || connectionErrorMessage.trim() === "") {
    return false;
  }

  return status === "disconnected" || status === "idle";
};

const formatReconnectSuffix = (reconnectAttempt: number): string | null => {
  if (reconnectAttempt < RECONNECT_ATTEMPT_LABEL_THRESHOLD) {
    return null;
  }

  return ` · ${reconnectAttempt}`;
};

export const deriveMarketConnectionPresentation = (
  input: MarketConnectionPresentationInput
): MarketConnectionPresentation => {
  const { status, hasSnapshot, reconnectAttempt, connectionErrorMessage } = input;
  const persistentError = hasPersistentError(status, connectionErrorMessage);
  const reconnectSuffix = formatReconnectSuffix(reconnectAttempt);

  switch (status) {
    case "live":
      return {
        compactLabel: "LIVE",
        tone: "positive",
        showLastKnown: false,
        showPersistentAlert: false,
        persistentAlertMessage: null,
        showRetry: false,
        accessibilityLabel: "Connection live",
        reconnectAttemptSuffix: null
      };
    case "connected":
      return {
        compactLabel: "SYNCING",
        tone: "neutral",
        showLastKnown: hasSnapshot,
        showPersistentAlert: false,
        persistentAlertMessage: null,
        showRetry: false,
        accessibilityLabel: hasSnapshot
          ? "Connection syncing, showing last known values"
          : "Connection syncing, waiting for live data",
        reconnectAttemptSuffix: null
      };
    case "connecting":
      return {
        compactLabel: "CONNECTING",
        tone: "neutral",
        showLastKnown: hasSnapshot,
        showPersistentAlert: false,
        persistentAlertMessage: null,
        showRetry: false,
        accessibilityLabel: hasSnapshot
          ? "Connection connecting, showing last known values"
          : "Connection connecting",
        reconnectAttemptSuffix: null
      };
    case "reconnecting": {
      const label = "RECONNECTING";
      return {
        compactLabel: label,
        tone: "warning",
        showLastKnown: hasSnapshot,
        showPersistentAlert: false,
        persistentAlertMessage: null,
        showRetry: false,
        accessibilityLabel: hasSnapshot
          ? `Connection reconnecting attempt ${reconnectAttempt}, showing last known values`
          : `Connection reconnecting attempt ${reconnectAttempt}`,
        reconnectAttemptSuffix: reconnectSuffix
      };
    }
    case "paused":
      return {
        compactLabel: "PAUSED",
        tone: "muted",
        showLastKnown: hasSnapshot,
        showPersistentAlert: false,
        persistentAlertMessage: null,
        showRetry: false,
        accessibilityLabel: hasSnapshot
          ? "Connection paused, showing last known values"
          : "Connection paused",
        reconnectAttemptSuffix: null
      };
    case "disconnected":
      return {
        compactLabel: "OFFLINE",
        tone: "negative",
        showLastKnown: hasSnapshot,
        showPersistentAlert: persistentError,
        persistentAlertMessage: persistentError ? connectionErrorMessage : null,
        showRetry: true,
        accessibilityLabel: hasSnapshot
          ? "Connection offline, showing last known values"
          : "Connection offline",
        reconnectAttemptSuffix: null
      };
    case "idle":
    default:
      return {
        compactLabel: "OFFLINE",
        tone: "muted",
        showLastKnown: false,
        showPersistentAlert: persistentError,
        persistentAlertMessage: persistentError ? connectionErrorMessage : null,
        showRetry: persistentError,
        accessibilityLabel: persistentError
          ? "Connection offline with configuration error"
          : "Connection offline",
        reconnectAttemptSuffix: null
      };
  }
};

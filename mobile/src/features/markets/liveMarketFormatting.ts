import type { MarketConnectionStatus } from "./marketWebSocketClient";

export const formatLivePrice = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value === 0) {
    return "0";
  }

  const abs = Math.abs(value);

  if (abs >= 1_000) {
    return value.toFixed(2);
  }

  if (abs >= 1) {
    return value.toFixed(4);
  }

  if (abs >= 0.01) {
    return value.toFixed(6);
  }

  return value.toFixed(8);
};

export const formatChange24hPercent = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (value > 0) {
    return `+${value.toFixed(2)}%`;
  }

  if (value < 0) {
    return `${value.toFixed(2)}%`;
  }

  return "0.00%";
};

export const formatConnectionStatusLabel = (
  status: MarketConnectionStatus
): string => {
  switch (status) {
    case "connecting":
      return "Connection: Connecting";
    case "connected":
      return "Connection: Connected, waiting for data";
    case "live":
      return "Connection: Live";
    case "reconnecting":
      return "Connection: Reconnecting";
    case "paused":
      return "Connection: Paused";
    case "disconnected":
    case "idle":
    default:
      return "Connection: Disconnected";
  }
};

import type { MarketConnectionStatus } from "./marketWebSocketClient";
import {
  formatMarketPrice,
  formatPercentage
} from "./marketNumberPresentation";

export const formatLivePrice = (value: number): string => formatMarketPrice(value);

export const formatChange24hPercent = (value: number): string =>
  formatPercentage(value);

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

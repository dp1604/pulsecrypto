import { Platform } from "react-native";
import { resolveApiBaseUrl } from "./apiBaseUrl";
import { resolveWebSocketUrl } from "./webSocketUrl";

export const getApiBaseUrl = (): string =>
  resolveApiBaseUrl({
    envValue: process.env.EXPO_PUBLIC_API_BASE_URL,
    isDevelopment: __DEV__,
    platformOs: Platform.OS
  });

export const getWebSocketUrl = (): string =>
  resolveWebSocketUrl({
    envValue: process.env.EXPO_PUBLIC_WS_URL,
    isDevelopment: __DEV__,
    platformOs: Platform.OS
  });

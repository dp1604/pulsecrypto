import { Platform } from "react-native";
import { resolveApiBaseUrl } from "./apiBaseUrl";

export const getApiBaseUrl = (): string =>
  resolveApiBaseUrl({
    envValue: process.env.EXPO_PUBLIC_API_BASE_URL,
    isDevelopment: __DEV__,
    platformOs: Platform.OS
  });

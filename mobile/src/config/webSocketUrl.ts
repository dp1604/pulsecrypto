import { ApiError } from "../api/errors";
import { DEFAULT_BACKEND_WS_PORT } from "./constants";

export type ResolveWebSocketUrlInput = {
  envValue?: string | undefined;
  isDevelopment: boolean;
  platformOs?: string;
};

const normalizePathname = (pathname: string): string => {
  if (pathname === "/" || pathname === "") {
    return "";
  }

  return pathname.replace(/\/+$/, "");
};

const formatValidatedWebSocketUrl = (parsed: URL): string => {
  const pathname = normalizePathname(parsed.pathname);

  return `${parsed.protocol}//${parsed.host}${pathname}`;
};

export const validateWebSocketUrl = (
  value: string,
  options?: { requireSecure?: boolean }
): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new ApiError(
      "configuration",
      "WebSocket URL must not be empty."
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ApiError(
      "configuration",
      "WebSocket URL must be an absolute ws or wss URL."
    );
  }

  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new ApiError(
      "configuration",
      "WebSocket URL must use ws or wss."
    );
  }

  const isLoopbackHost =
    parsed.hostname === "127.0.0.1" ||
    parsed.hostname === "10.0.2.2" ||
    parsed.hostname === "localhost";

  if (options?.requireSecure && parsed.protocol !== "wss:" && !isLoopbackHost) {
    throw new ApiError(
      "configuration",
      "WebSocket URL must use wss in non-development builds."
    );
  }

  if (parsed.username || parsed.password) {
    throw new ApiError(
      "configuration",
      "WebSocket URL must not include credentials."
    );
  }

  if (parsed.search) {
    throw new ApiError(
      "configuration",
      "WebSocket URL must not include a query string."
    );
  }

  if (parsed.hash) {
    throw new ApiError(
      "configuration",
      "WebSocket URL must not include a fragment."
    );
  }

  return formatValidatedWebSocketUrl(parsed);
};

export const resolveWebSocketUrl = ({
  envValue,
  isDevelopment,
  platformOs
}: ResolveWebSocketUrlInput): string => {
  if (envValue !== undefined && envValue.trim() !== "") {
    return validateWebSocketUrl(envValue, {
      requireSecure: !isDevelopment
    });
  }

  if (isDevelopment) {
    if (platformOs === "android") {
      return `ws://10.0.2.2:${DEFAULT_BACKEND_WS_PORT}`;
    }

    return `ws://127.0.0.1:${DEFAULT_BACKEND_WS_PORT}`;
  }

  throw new ApiError(
    "configuration",
    "EXPO_PUBLIC_WS_URL is required in non-development builds."
  );
};

import { ApiError } from "../api/errors";
import { DEFAULT_BACKEND_HTTP_PORT } from "./constants";

export type ResolveApiBaseUrlInput = {
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

const formatValidatedBaseUrl = (parsed: URL): string => {
  const pathname = normalizePathname(parsed.pathname);

  return `${parsed.protocol}//${parsed.host}${pathname}`;
};

export const validateApiBaseUrl = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new ApiError(
      "configuration",
      "API base URL must not be empty."
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new ApiError(
      "configuration",
      "API base URL must be an absolute http or https URL."
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ApiError(
      "configuration",
      "API base URL must use http or https."
    );
  }

  if (parsed.username || parsed.password) {
    throw new ApiError(
      "configuration",
      "API base URL must not include credentials."
    );
  }

  if (parsed.search) {
    throw new ApiError(
      "configuration",
      "API base URL must not include a query string."
    );
  }

  if (parsed.hash) {
    throw new ApiError(
      "configuration",
      "API base URL must not include a fragment."
    );
  }

  return formatValidatedBaseUrl(parsed);
};

export const joinApiUrl = (baseUrl: string, path: string): string => {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
};

export const resolveApiBaseUrl = ({
  envValue,
  isDevelopment,
  platformOs
}: ResolveApiBaseUrlInput): string => {
  if (envValue !== undefined && envValue.trim() !== "") {
    return validateApiBaseUrl(envValue);
  }

  if (isDevelopment) {
    if (platformOs === "android") {
      return `http://10.0.2.2:${DEFAULT_BACKEND_HTTP_PORT}`;
    }

    return `http://127.0.0.1:${DEFAULT_BACKEND_HTTP_PORT}`;
  }

  throw new ApiError(
    "configuration",
    "EXPO_PUBLIC_API_BASE_URL is required in non-development builds."
  );
};

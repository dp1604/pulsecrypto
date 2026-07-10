export type ApiErrorCategory =
  | "configuration"
  | "timeout"
  | "network"
  | "http"
  | "contract"
  | "aborted"
  | "unknown";

export class ApiError extends Error {
  readonly category: ApiErrorCategory;
  readonly statusCode?: number;

  constructor(
    category: ApiErrorCategory,
    message: string,
    statusCode?: number
  ) {
    super(message);
    this.name = "ApiError";
    this.category = category;
    this.statusCode = statusCode;
  }
}

const USER_FACING_MESSAGES: Record<ApiErrorCategory, string> = {
  configuration:
    "The app is not configured with a valid API base URL. Set EXPO_PUBLIC_API_BASE_URL and restart.",
  timeout: "The market metadata request timed out. Check your connection and try again.",
  network:
    "Unable to reach the PulseCrypto backend. Confirm the backend is running and reachable.",
  http: "The backend returned an unexpected response. Try again shortly.",
  contract:
    "The backend returned metadata in an unexpected format. Try again after updating the app.",
  aborted: "The request was cancelled.",
  unknown: "Something went wrong while loading market metadata. Try again."
};

export const toUserFacingMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.category === "aborted") {
      return USER_FACING_MESSAGES.aborted;
    }

    if (error.category === "http" && error.statusCode !== undefined) {
      return `${USER_FACING_MESSAGES.http} (HTTP ${error.statusCode}).`;
    }

    return USER_FACING_MESSAGES[error.category];
  }

  return USER_FACING_MESSAGES.unknown;
};

export const isAbortError = (error: unknown): boolean =>
  error instanceof ApiError && error.category === "aborted";

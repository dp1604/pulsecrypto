import { joinApiUrl } from "../config/apiBaseUrl";
import { ApiError } from "./errors";

export const DEFAULT_HTTP_TIMEOUT_MS = 10_000;

export type HttpGetOptions = {
  path: string;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export type HttpClient = {
  getJson: (options: HttpGetOptions) => Promise<unknown>;
};

type AbortOrigin = "caller" | "timeout" | null;

type CombinedAbortSignal = {
  signal: AbortSignal;
  cleanup: () => void;
  abortedByTimeout: () => boolean;
  abortedByCaller: () => boolean;
};

const isAbortLikeError = (error: unknown): boolean => {
  if (error instanceof Error && error.name === "AbortError") {
    return true;
  }

  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return false;
};

export const createCombinedAbortSignal = (
  timeoutMs: number,
  callerSignal?: AbortSignal
): CombinedAbortSignal => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new ApiError(
      "configuration",
      "timeoutMs must be a positive finite number."
    );
  }

  if (callerSignal?.aborted) {
    return {
      signal: callerSignal,
      cleanup: () => undefined,
      abortedByTimeout: () => false,
      abortedByCaller: () => true
    };
  }

  const timeoutController = new AbortController();
  let abortOrigin: AbortOrigin = null;
  const listeners: Array<{
    signal: AbortSignal;
    handler: () => void;
  }> = [];

  const setAbortOrigin = (origin: Exclude<AbortOrigin, null>) => {
    if (abortOrigin === null) {
      abortOrigin = origin;
    }
  };

  const addListener = (signal: AbortSignal, handler: () => void) => {
    signal.addEventListener("abort", handler);
    listeners.push({ signal, handler });
  };

  const removeListeners = () => {
    for (const { signal, handler } of listeners) {
      signal.removeEventListener("abort", handler);
    }

    listeners.length = 0;
  };

  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) {
      return;
    }

    cleanedUp = true;

    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }

    removeListeners();
  };

  if (!callerSignal) {
    timeoutId = setTimeout(() => {
      setAbortOrigin("timeout");
      timeoutController.abort(new ApiError("timeout", "Request timed out."));
    }, timeoutMs);

    return {
      signal: timeoutController.signal,
      cleanup,
      abortedByTimeout: () => abortOrigin === "timeout",
      abortedByCaller: () => false
    };
  }

  const composedController = new AbortController();

  timeoutId = setTimeout(() => {
    setAbortOrigin("timeout");
    timeoutController.abort(new ApiError("timeout", "Request timed out."));
  }, timeoutMs);

  addListener(timeoutController.signal, () => {
    if (!composedController.signal.aborted) {
      composedController.abort(timeoutController.signal.reason);
    }
  });

  addListener(callerSignal, () => {
    setAbortOrigin("caller");
    if (!composedController.signal.aborted) {
      composedController.abort(callerSignal.reason);
    }
  });

  if (timeoutController.signal.aborted) {
    composedController.abort(timeoutController.signal.reason);
  }

  if (callerSignal.aborted) {
    setAbortOrigin("caller");
    composedController.abort(callerSignal.reason);
  }

  return {
    signal: composedController.signal,
    cleanup,
    abortedByTimeout: () => abortOrigin === "timeout",
    abortedByCaller: () => abortOrigin === "caller"
  };
};

export const createHttpClient = (
  baseUrl: string,
  fetchImpl: typeof fetch = fetch
): HttpClient => ({
  async getJson({
    path,
    signal,
    timeoutMs = DEFAULT_HTTP_TIMEOUT_MS
  }: HttpGetOptions): Promise<unknown> {
    const combined = createCombinedAbortSignal(timeoutMs, signal);

    try {
      if (combined.abortedByCaller()) {
        throw new ApiError("aborted", "Request was aborted.");
      }

      if (combined.abortedByTimeout()) {
        throw new ApiError("timeout", "Request timed out.");
      }

      if (combined.signal.aborted) {
        throw new ApiError("aborted", "Request was aborted.");
      }

      const response = await fetchImpl(joinApiUrl(baseUrl, path), {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        signal: combined.signal
      });

      if (!response.ok) {
        throw new ApiError(
          "http",
          `Request failed with status ${response.status}.`,
          response.status
        );
      }

      try {
        return await response.json();
      } catch {
        throw new ApiError("contract", "Response was not valid JSON.");
      }
    } catch (error) {
      if (combined.abortedByTimeout()) {
        throw new ApiError("timeout", "Request timed out.");
      }

      if (combined.abortedByCaller()) {
        throw new ApiError("aborted", "Request was aborted.");
      }

      if (error instanceof ApiError) {
        throw error;
      }

      if (combined.signal.aborted || isAbortLikeError(error)) {
        throw new ApiError("aborted", "Request was aborted.");
      }

      throw new ApiError("network", "Network request failed.");
    } finally {
      combined.cleanup();
    }
  }
});

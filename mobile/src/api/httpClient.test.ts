import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./errors";
import {
  createCombinedAbortSignal,
  createHttpClient
} from "./httpClient";

const createTrackingSignal = () => {
  const listeners = new Map<string, Set<() => void>>();
  let aborted = false;

  const signal = {
    get aborted() {
      return aborted;
    },
    addEventListener: (event: string, handler: () => void) => {
      const handlers = listeners.get(event) ?? new Set<() => void>();
      handlers.add(handler);
      listeners.set(event, handlers);
    },
    removeEventListener: (event: string, handler: () => void) => {
      listeners.get(event)?.delete(handler);
    },
    abort: () => {
      aborted = true;
      for (const handler of listeners.get("abort") ?? []) {
        handler();
      }
    },
    listenerCount: (event: string) => listeners.get(event)?.size ?? 0
  } as AbortSignal & {
    abort: () => void;
    listenerCount: (event: string) => number;
  };

  return signal;
};

describe("httpClient", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns parsed JSON on success", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });

    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);
    await expect(client.getJson({ path: "/pairs/meta" })).resolves.toEqual({
      ok: true
    });
  });

  it("maps non-2xx responses to HTTP errors", async () => {
    const fetchImpl = async () =>
      new Response("not found", {
        status: 404
      });

    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(client.getJson({ path: "/pairs/meta" })).rejects.toMatchObject({
      category: "http",
      statusCode: 404
    });
  });

  it("maps network failures to network errors", async () => {
    const fetchImpl = async () => {
      throw new TypeError("Network request failed");
    };

    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(client.getJson({ path: "/pairs/meta" })).rejects.toMatchObject({
      category: "network"
    });
  });

  it("maps timeouts to timeout errors", async () => {
    const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        });
      });

    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(
      client.getJson({ path: "/pairs/meta", timeoutMs: 5 })
    ).rejects.toMatchObject({
      category: "timeout"
    });
  });

  it("maps invalid JSON to contract errors", async () => {
    const fetchImpl = async () =>
      new Response("not-json", {
        status: 200
      });

    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(client.getJson({ path: "/pairs/meta" })).rejects.toMatchObject({
      category: "contract"
    });
  });

  it("maps caller aborts to aborted errors", async () => {
    const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
        });
      });

    const controller = new AbortController();
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);
    const request = client.getJson({
      path: "/pairs/meta",
      signal: controller.signal,
      timeoutMs: 1_000
    });

    controller.abort();

    await expect(request).rejects.toMatchObject({
      category: "aborted"
    });
  });

  it("rejects invalid timeout values", async () => {
    const client = createHttpClient("http://127.0.0.1:3000", async () =>
      new Response("{}")
    );

    await expect(
      client.getJson({ path: "/pairs/meta", timeoutMs: 0 })
    ).rejects.toMatchObject({
      category: "configuration"
    });
  });

  it("removes composed listeners after success", async () => {
    const callerSignal = createTrackingSignal();
    const combined = createCombinedAbortSignal(1_000, callerSignal);

    expect(callerSignal.listenerCount("abort")).toBeGreaterThan(0);

    combined.cleanup();

    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("removes composed listeners after HTTP failure", async () => {
    const callerSignal = createTrackingSignal();
    const combined = createCombinedAbortSignal(1_000, callerSignal);

    combined.cleanup();

    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("removes composed listeners after caller abort", async () => {
    const callerSignal = createTrackingSignal();
    const combined = createCombinedAbortSignal(1_000, callerSignal);

    callerSignal.abort();
    combined.cleanup();

    expect(callerSignal.listenerCount("abort")).toBe(0);
    expect(combined.abortedByCaller()).toBe(true);
  });

  it("removes composed listeners after timeout", async () => {
    const callerSignal = createTrackingSignal();
    const combined = createCombinedAbortSignal(5, callerSignal);

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });

    combined.cleanup();

    expect(callerSignal.listenerCount("abort")).toBe(0);
    expect(combined.abortedByTimeout()).toBe(true);
  });

  it("handles already-aborted caller signals", () => {
    const callerSignal = createTrackingSignal();
    callerSignal.abort();

    const combined = createCombinedAbortSignal(1_000, callerSignal);

    expect(combined.abortedByCaller()).toBe(true);
    combined.cleanup();
    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("removes getJson caller listeners after success", async () => {
    const callerSignal = createTrackingSignal();
    const fetchImpl = async () =>
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await client.getJson({
      path: "/pairs/meta",
      signal: callerSignal,
      timeoutMs: 1_000
    });

    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("removes getJson caller listeners after HTTP failure", async () => {
    const callerSignal = createTrackingSignal();
    const fetchImpl = async () =>
      new Response("not found", {
        status: 404
      });
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(
      client.getJson({
        path: "/pairs/meta",
        signal: callerSignal,
        timeoutMs: 1_000
      })
    ).rejects.toMatchObject({
      category: "http"
    });

    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("removes getJson caller listeners after caller abort", async () => {
    const callerSignal = createTrackingSignal();
    const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new TypeError("Network request failed"));
        });
      });
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);
    const request = client.getJson({
      path: "/pairs/meta",
      signal: callerSignal,
      timeoutMs: 1_000
    });

    callerSignal.abort();

    await expect(request).rejects.toMatchObject({
      category: "aborted"
    });
    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("removes getJson caller listeners after timeout", async () => {
    const callerSignal = createTrackingSignal();
    const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("fetch failed"));
        });
      });
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(
      client.getJson({
        path: "/pairs/meta",
        signal: callerSignal,
        timeoutMs: 5
      })
    ).rejects.toMatchObject({
      category: "timeout"
    });

    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("classifies caller abort when fetch rejects with a non-AbortError shape", async () => {
    const callerSignal = createTrackingSignal();
    const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new TypeError("Network request failed"));
        });
      });
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);
    const request = client.getJson({
      path: "/pairs/meta",
      signal: callerSignal,
      timeoutMs: 1_000
    });

    callerSignal.abort();

    await expect(request).rejects.toMatchObject({
      category: "aborted"
    });
  });

  it("classifies timeout when fetch rejects with a non-AbortError shape", async () => {
    const fetchImpl = async (_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new Error("fetch failed"));
        });
      });
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(
      client.getJson({ path: "/pairs/meta", timeoutMs: 5 })
    ).rejects.toMatchObject({
      category: "timeout"
    });
  });

  it("classifies already-aborted caller signals with non-AbortError fetch rejection", async () => {
    const callerSignal = createTrackingSignal();
    callerSignal.abort();

    const fetchImpl = vi.fn(async () => {
      throw new Error("should not run");
    });
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(
      client.getJson({
        path: "/pairs/meta",
        signal: callerSignal,
        timeoutMs: 1_000
      })
    ).rejects.toMatchObject({
      category: "aborted"
    });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("preserves caller as first abort cause when timeout fires later", async () => {
    vi.useFakeTimers();

    const callerSignal = createTrackingSignal();
    const combined = createCombinedAbortSignal(100, callerSignal);

    callerSignal.abort();
    vi.advanceTimersByTime(200);

    expect(combined.abortedByCaller()).toBe(true);
    expect(combined.abortedByTimeout()).toBe(false);
    combined.cleanup();
    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("classifies caller-first abort through getJson when timeout fires later", async () => {
    vi.useFakeTimers();

    const callerSignal = createTrackingSignal();
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new TypeError("Network request failed"));
          });
        })
    );
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);
    const request = client.getJson({
      path: "/pairs/meta",
      signal: callerSignal,
      timeoutMs: 100
    });
    const rejection = expect(request).rejects.toMatchObject({
      category: "aborted"
    });

    callerSignal.abort();
    await rejection;
    vi.advanceTimersByTime(200);

    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("preserves timeout as first abort cause when caller aborts later", async () => {
    vi.useFakeTimers();

    const callerSignal = createTrackingSignal();
    const combined = createCombinedAbortSignal(100, callerSignal);

    vi.advanceTimersByTime(100);
    callerSignal.abort();

    expect(combined.abortedByTimeout()).toBe(true);
    expect(combined.abortedByCaller()).toBe(false);
    combined.cleanup();
    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("classifies timeout-first abort through getJson when caller aborts later", async () => {
    vi.useFakeTimers();

    const callerSignal = createTrackingSignal();
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("fetch failed"));
          });
        })
    );
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);
    const request = client.getJson({
      path: "/pairs/meta",
      signal: callerSignal,
      timeoutMs: 100
    });
    const rejection = expect(request).rejects.toMatchObject({
      category: "timeout"
    });

    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    callerSignal.abort();

    expect(callerSignal.listenerCount("abort")).toBe(0);
  });

  it("leaves no listeners after caller-first abort race cleanup", async () => {
    vi.useFakeTimers();

    const callerSignal = createTrackingSignal();
    const combined = createCombinedAbortSignal(100, callerSignal);

    callerSignal.abort();
    vi.advanceTimersByTime(200);
    combined.cleanup();

    expect(callerSignal.listenerCount("abort")).toBe(0);
    expect(combined.abortedByCaller()).toBe(true);
    expect(combined.abortedByTimeout()).toBe(false);
  });

  it("leaves no listeners after timeout-first abort race cleanup", async () => {
    vi.useFakeTimers();

    const callerSignal = createTrackingSignal();
    const combined = createCombinedAbortSignal(100, callerSignal);

    vi.advanceTimersByTime(100);
    callerSignal.abort();
    combined.cleanup();

    expect(callerSignal.listenerCount("abort")).toBe(0);
    expect(combined.abortedByTimeout()).toBe(true);
    expect(combined.abortedByCaller()).toBe(false);
  });

  it("maps ordinary TypeError network failures when signal is not aborted", async () => {
    const fetchImpl = async () => {
      throw new TypeError("Network request failed");
    };

    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(client.getJson({ path: "/pairs/meta" })).rejects.toMatchObject({
      category: "network"
    });
  });
});

describe("errors", () => {
  it("returns safe user-facing messages", async () => {
    const { toUserFacingMessage } = await import("./errors");

    expect(
      toUserFacingMessage(new ApiError("network", "Network request failed."))
    ).toContain("Unable to reach the PulseCrypto backend");
  });
});

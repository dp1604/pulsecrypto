import { describe, expect, it, vi } from "vitest";
import type { PairMeta } from "@pulsecrypto/shared";
import { ApiError } from "../../api/errors";
import { createMarketsMetadataStore } from "./marketsMetadataStore";

const samplePairs: PairMeta[] = [
  {
    pair: "BTCUSDT",
    displayName: "BTC / USDT",
    tradingStatus: "TRADING",
    high24h: 110000,
    low24h: 105000,
    volume24h: 18250.32
  }
];

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
};

describe("marketsMetadataStore", () => {
  it("moves from idle to loading to success", async () => {
    const fetchPairsMetaImpl = vi.fn(async () => samplePairs);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    const loadPromise = store.getState().load();

    expect(store.getState().status).toBe("loading");
    await loadPromise;

    expect(store.getState()).toMatchObject({
      status: "success",
      items: samplePairs,
      errorMessage: null
    });
    expect(store.getState().lastLoadedAt).not.toBeNull();
  });

  it("passes a real AbortSignal to fetchPairsMeta", async () => {
    const pending = deferred<PairMeta[]>();
    const fetchPairsMetaImpl = vi.fn(
      (_client: unknown, signal?: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return pending.promise;
      }
    );
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    const loadPromise = store.getState().load();
    pending.resolve(samplePairs);
    await loadPromise;
  });

  it("maps an empty response to empty status", async () => {
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl: async () => [],
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();

    expect(store.getState()).toMatchObject({
      status: "empty",
      items: [],
      errorMessage: null
    });
  });

  it("maps failures to a safe error state", async () => {
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl: async () => {
        throw new ApiError("network", "Network request failed.");
      },
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();

    expect(store.getState()).toMatchObject({
      status: "error",
      items: []
    });
    expect(store.getState().errorMessage).toContain(
      "Unable to reach the PulseCrypto backend"
    );
  });

  it("deduplicates duplicate in-flight loads", async () => {
    const pending = deferred<PairMeta[]>();
    const fetchPairsMetaImpl = vi.fn(() => pending.promise);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    const first = store.getState().load();
    const second = store.getState().load();

    expect(second).toBe(first);

    await Promise.resolve();

    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(1);

    pending.resolve(samplePairs);
    await Promise.all([first, second]);

    expect(store.getState().status).toBe("success");
  });

  it("ignores stale responses from an older request", async () => {
    const resolutions: Array<(value: PairMeta[]) => void> = [];
    const fetchPairsMetaImpl = vi.fn(
      () =>
        new Promise<PairMeta[]>((resolve) => {
          resolutions.push(resolve);
        })
    );

    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    void store.getState().load();
    await Promise.resolve();
    const retryPromise = store.getState().retry();

    await vi.waitFor(() => {
      expect(resolutions).toHaveLength(2);
    });

    resolutions[1]?.([
      {
        ...samplePairs[0],
        pair: "ETHUSDT",
        displayName: "ETH / USDT"
      }
    ]);
    await retryPromise;

    expect(store.getState().items[0]?.pair).toBe("ETHUSDT");

    resolutions[0]?.(samplePairs);
    await Promise.resolve();

    expect(store.getState().items[0]?.pair).toBe("ETHUSDT");
  });

  it("aborts the active request on cancel", async () => {
    const pending = deferred<PairMeta[]>();
    let receivedSignal: AbortSignal | undefined;
    const fetchPairsMetaImpl = vi.fn(
      (_client: unknown, signal?: AbortSignal) => {
        receivedSignal = signal;
        return pending.promise;
      }
    );
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    void store.getState().load();
    await Promise.resolve();

    store.getState().cancel();

    expect(receivedSignal?.aborted).toBe(true);
  });

  it("returns to idle when cancel runs without items", async () => {
    const pending = deferred<PairMeta[]>();
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl: () => pending.promise,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    void store.getState().load();
    store.getState().cancel();

    expect(store.getState()).toMatchObject({
      status: "idle",
      errorMessage: null,
      inFlightGeneration: null
    });
  });

  it("returns to success when cancel runs with existing items", async () => {
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl: async () => samplePairs,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();

    const pending = deferred<PairMeta[]>();
    void store.getState().load();
    store.getState().cancel();

    expect(store.getState()).toMatchObject({
      status: "success",
      items: samplePairs,
      errorMessage: null,
      inFlightGeneration: null
    });

    pending.resolve(samplePairs);
  });

  it("never remains loading after cancel", async () => {
    const pending = deferred<PairMeta[]>();
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl: () => pending.promise,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    void store.getState().load();
    store.getState().cancel();
    pending.resolve(samplePairs);
    await Promise.resolve();

    expect(store.getState().status).not.toBe("loading");
  });

  it("aborts the superseded request on retry", async () => {
    const pending = deferred<PairMeta[]>();
    let firstSignal: AbortSignal | undefined;
    const fetchPairsMetaImpl = vi
      .fn()
      .mockImplementationOnce((_client: unknown, signal?: AbortSignal) => {
        firstSignal = signal;
        return pending.promise;
      })
      .mockResolvedValueOnce([
        {
          ...samplePairs[0],
          pair: "ETHUSDT",
          displayName: "ETH / USDT"
        }
      ]);

    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    void store.getState().load();
    await Promise.resolve();
    const retryPromise = store.getState().retry();

    expect(firstSignal?.aborted).toBe(true);
    await retryPromise;
    expect(store.getState().items[0]?.pair).toBe("ETHUSDT");
  });

  it("does not surface intentional aborts as user-facing failures", async () => {
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl: async (_client, signal) => {
        signal?.addEventListener("abort", () => undefined);
        throw new ApiError("aborted", "Request was aborted.");
      },
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    void store.getState().load();
    store.getState().cancel();
    await Promise.resolve();

    expect(store.getState().status).toBe("idle");
    expect(store.getState().errorMessage).toBeNull();
  });

  it("supports retry after an error", async () => {
    const fetchPairsMetaImpl = vi
      .fn()
      .mockRejectedValueOnce(new ApiError("network", "Network request failed."))
      .mockResolvedValueOnce(samplePairs);

    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();
    expect(store.getState().status).toBe("error");

    await store.getState().retry();
    expect(store.getState().status).toBe("success");
    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(2);
  });

  it("handles synchronous configuration failure without rejecting load", async () => {
    const getApiBaseUrlImpl = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new ApiError(
          "configuration",
          "EXPO_PUBLIC_API_BASE_URL is required in non-development builds."
        );
      })
      .mockReturnValue("http://127.0.0.1:3000");
    const fetchPairsMetaImpl = vi.fn(async () => samplePairs);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl
    });

    await expect(store.getState().load()).resolves.toBeUndefined();

    expect(store.getState()).toMatchObject({
      status: "error",
      inFlightGeneration: null
    });
    expect(store.getState().errorMessage).toContain(
      "not configured with a valid API base URL"
    );
    expect(fetchPairsMetaImpl).not.toHaveBeenCalled();

    await store.getState().load();

    expect(getApiBaseUrlImpl).toHaveBeenCalledTimes(2);
    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(1);
    expect(store.getState().status).toBe("success");
  });

  it("recovers from configuration failure through retry", async () => {
    const getApiBaseUrlImpl = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new ApiError("configuration", "API base URL must not be empty.");
      })
      .mockReturnValue("http://127.0.0.1:3000");
    const fetchPairsMetaImpl = vi.fn(async () => samplePairs);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl
    });

    await store.getState().load();
    expect(store.getState().status).toBe("error");

    await store.getState().retry();

    expect(store.getState()).toMatchObject({
      status: "success",
      items: samplePairs,
      errorMessage: null
    });
    expect(getApiBaseUrlImpl).toHaveBeenCalledTimes(2);
  });

  it("handles synchronous adapter throws without rejecting load", async () => {
    const fetchPairsMetaImpl = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new ApiError("contract", "Response did not match the contract.");
      })
      .mockResolvedValueOnce(samplePairs);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await expect(store.getState().load()).resolves.toBeUndefined();

    expect(store.getState()).toMatchObject({
      status: "error",
      inFlightGeneration: null
    });

    await store.getState().retry();

    expect(store.getState().status).toBe("success");
    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(2);
  });

  it("does not let an older finally clear a newer active request", async () => {
    const resolutions: Array<(value: PairMeta[]) => void> = [];
    const fetchPairsMetaImpl = vi.fn(
      () =>
        new Promise<PairMeta[]>((resolve) => {
          resolutions.push(resolve);
        })
    );
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    const firstLoad = store.getState().load();
    await Promise.resolve();
    const retryPromise = store.getState().retry();

    await vi.waitFor(() => {
      expect(resolutions).toHaveLength(2);
    });

    resolutions[1]?.([
      {
        ...samplePairs[0],
        pair: "ETHUSDT",
        displayName: "ETH / USDT"
      }
    ]);
    await retryPromise;

    expect(store.getState().items[0]?.pair).toBe("ETHUSDT");
    expect(store.getState().inFlightGeneration).toBeNull();

    resolutions[0]?.(samplePairs);
    await firstLoad;

    expect(store.getState().items[0]?.pair).toBe("ETHUSDT");
    expect(store.getState().status).toBe("success");
  });

  it("settles load and retry promises when errors are captured into state", async () => {
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl: async () => {
        throw new ApiError("network", "Network request failed.");
      },
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await expect(store.getState().load()).resolves.toBeUndefined();
    await expect(store.getState().retry()).resolves.toBeUndefined();

    expect(store.getState().status).toBe("error");
  });

  it("does not start work when cancelled before the deferred body", async () => {
    const getApiBaseUrlImpl = vi.fn(() => "http://127.0.0.1:3000");
    const fetchPairsMetaImpl = vi.fn(() => deferred<PairMeta[]>().promise);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl
    });

    const loadPromise = store.getState().load();
    store.getState().cancel();
    await loadPromise;

    expect(getApiBaseUrlImpl).not.toHaveBeenCalled();
    expect(fetchPairsMetaImpl).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({
      status: "idle",
      errorMessage: null,
      inFlightGeneration: null
    });
  });

  it("does not start another request when cancelled before deferred body with existing items", async () => {
    const getApiBaseUrlImpl = vi.fn(() => "http://127.0.0.1:3000");
    const fetchPairsMetaImpl = vi.fn(async () => samplePairs);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl
    });

    await store.getState().load();
    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(1);

    const loadPromise = store.getState().load();
    store.getState().cancel();
    await loadPromise;

    expect(getApiBaseUrlImpl).toHaveBeenCalledTimes(1);
    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({
      status: "success",
      items: samplePairs,
      errorMessage: null,
      inFlightGeneration: null
    });
  });

  it("starts only the replacement request when retry runs before the first body", async () => {
    const getApiBaseUrlImpl = vi.fn(() => "http://127.0.0.1:3000");
    const fetchPairsMetaImpl = vi.fn(async (): Promise<PairMeta[]> => [
      {
        ...samplePairs[0],
        pair: "ETHUSDT",
        displayName: "ETH / USDT"
      }
    ]);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl
    });

    const first = store.getState().load();
    const second = store.getState().retry();
    await Promise.all([first, second]);

    expect(getApiBaseUrlImpl).toHaveBeenCalledTimes(1);
    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(1);
    expect(store.getState().items[0]?.pair).toBe("ETHUSDT");
  });

  it("does not let a cancelled pre-start request clear the replacement", async () => {
    const getApiBaseUrlImpl = vi.fn(() => "http://127.0.0.1:3000");
    const fetchPairsMetaImpl = vi.fn(async (): Promise<PairMeta[]> => [
      {
        ...samplePairs[0],
        pair: "ETHUSDT",
        displayName: "ETH / USDT"
      }
    ]);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl
    });

    const first = store.getState().load();
    const second = store.getState().retry();
    await Promise.all([first, second]);

    expect(store.getState().items[0]?.pair).toBe("ETHUSDT");
    expect(store.getState().status).toBe("success");
    expect(getApiBaseUrlImpl).toHaveBeenCalledTimes(1);
    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(1);
  });

  it("deduplicates ordinary loads before the deferred body starts", async () => {
    const getApiBaseUrlImpl = vi.fn(() => "http://127.0.0.1:3000");
    const pending = deferred<PairMeta[]>();
    const fetchPairsMetaImpl = vi.fn(() => pending.promise);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl
    });

    const first = store.getState().load();
    const second = store.getState().load();

    expect(second).toBe(first);

    await Promise.resolve();

    expect(getApiBaseUrlImpl).toHaveBeenCalledTimes(1);
    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(1);

    pending.resolve(samplePairs);
    await Promise.all([first, second]);

    expect(store.getState().status).toBe("success");
  });

  it("retains the list while refresh is pending", async () => {
    const pendingRefresh = deferred<PairMeta[]>();
    let callCount = 0;
    const fetchPairsMetaImpl = vi.fn(() => {
      callCount += 1;

      if (callCount === 1) {
        return Promise.resolve(samplePairs);
      }

      return pendingRefresh.promise;
    });
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();
    const refreshPromise = store.getState().refresh();

    expect(store.getState()).toMatchObject({
      status: "success",
      items: samplePairs,
      isRefreshing: true
    });

    pendingRefresh.resolve(samplePairs);
    await refreshPromise;

    expect(store.getState().isRefreshing).toBe(false);
  });

  it("replaces items after a successful refresh", async () => {
    const fetchPairsMetaImpl = vi
      .fn()
      .mockResolvedValueOnce(samplePairs)
      .mockResolvedValueOnce([
        {
          ...samplePairs[0],
          pair: "ETHUSDT",
          displayName: "ETH / USDT"
        }
      ]);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();
    await store.getState().refresh();

    expect(store.getState().items[0]?.pair).toBe("ETHUSDT");
    expect(store.getState().status).toBe("success");
    expect(store.getState().refreshErrorMessage).toBeNull();
  });

  it("retains items and exposes a non-blocking refresh error", async () => {
    const fetchPairsMetaImpl = vi
      .fn()
      .mockResolvedValueOnce(samplePairs)
      .mockRejectedValueOnce(new ApiError("network", "Network request failed."));
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();
    await store.getState().refresh();

    expect(store.getState()).toMatchObject({
      status: "success",
      items: samplePairs,
      isRefreshing: false
    });
    expect(store.getState().refreshErrorMessage).toContain(
      "Unable to refresh pair metadata"
    );
  });

  it("deduplicates concurrent refresh calls", async () => {
    const pendingRefresh = deferred<PairMeta[]>();
    let callCount = 0;
    const fetchPairsMetaImpl = vi.fn(() => {
      callCount += 1;

      if (callCount === 1) {
        return Promise.resolve(samplePairs);
      }

      return pendingRefresh.promise;
    });
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();
    const first = store.getState().refresh();
    const second = store.getState().refresh();

    expect(second).toBe(first);

    await Promise.resolve();

    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(2);

    pendingRefresh.resolve(samplePairs);
    await Promise.all([first, second]);
  });

  it("delegates refresh without items to the initial load path", async () => {
    const fetchPairsMetaImpl = vi.fn(async () => samplePairs);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().refresh();

    expect(store.getState().status).toBe("success");
    expect(fetchPairsMetaImpl).toHaveBeenCalledTimes(1);
  });

  it("clears refresh errors after a later successful refresh", async () => {
    const fetchPairsMetaImpl = vi
      .fn()
      .mockResolvedValueOnce(samplePairs)
      .mockRejectedValueOnce(new ApiError("network", "Network request failed."))
      .mockResolvedValueOnce(samplePairs);
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();
    await store.getState().refresh();
    expect(store.getState().refreshErrorMessage).not.toBeNull();

    await store.getState().refresh();
    expect(store.getState().refreshErrorMessage).toBeNull();
  });

  it("does not let a stale refresh overwrite newer metadata", async () => {
    const resolutions: Array<(value: PairMeta[]) => void> = [];
    let fetchCount = 0;
    const fetchPairsMetaImpl = vi.fn(() => {
      fetchCount += 1;

      if (fetchCount === 1) {
        return Promise.resolve(samplePairs);
      }

      return new Promise<PairMeta[]>((resolve) => {
        resolutions.push(resolve);
      });
    });
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();
    void store.getState().refresh();
    await Promise.resolve();

    const retryPromise = store.getState().retry();

    await vi.waitFor(() => {
      expect(resolutions).toHaveLength(2);
    });

    resolutions[1]?.([
      {
        ...samplePairs[0],
        pair: "ETHUSDT",
        displayName: "ETH / USDT"
      }
    ]);
    await retryPromise;

    expect(store.getState().items[0]?.pair).toBe("ETHUSDT");

    resolutions[0]?.([
      {
        ...samplePairs[0],
        pair: "SOLUSDT",
        displayName: "SOL / USDT"
      }
    ]);
    await Promise.resolve();

    expect(store.getState().items[0]?.pair).toBe("ETHUSDT");
  });

  it("stops refreshing when cancel runs during refresh", async () => {
    const pendingRefresh = deferred<PairMeta[]>();
    let callCount = 0;
    const fetchPairsMetaImpl = vi.fn(() => {
      callCount += 1;

      if (callCount === 1) {
        return Promise.resolve(samplePairs);
      }

      return pendingRefresh.promise;
    });
    const store = createMarketsMetadataStore({
      fetchPairsMetaImpl,
      getApiBaseUrlImpl: () => "http://127.0.0.1:3000"
    });

    await store.getState().load();
    void store.getState().refresh();
    store.getState().cancel();
    pendingRefresh.resolve(samplePairs);
    await Promise.resolve();

    expect(store.getState()).toMatchObject({
      status: "success",
      isRefreshing: false,
      items: samplePairs
    });
  });
});

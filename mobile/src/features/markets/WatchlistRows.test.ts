import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveWatchlistDisplayValuesForPair,
  selectWatchlistDisplayValuesAll,
  WATCHLIST_DISPLAY_PRIMITIVE_COUNT,
  watchlistDisplayValuesAllEqual
} from "./marketMotionPresentation";

describe("WatchlistRows structure", () => {
  it("owns exactly one live-store subscription for all display values", () => {
    const source = readFileSync(resolve(__dirname, "WatchlistRows.tsx"), "utf8");

    expect(source.match(/useMarketsLiveStore\(/g)?.length).toBe(1);
    expect(source.includes("selectWatchlistDisplayValuesAll")).toBe(true);
    expect(source.includes("useShallow")).toBe(true);
  });

  it("does not subscribe inside row children", () => {
    const liveValues = readFileSync(
      resolve(__dirname, "WatchlistLiveValues.tsx"),
      "utf8"
    );
    const rows = readFileSync(resolve(__dirname, "WatchlistRows.tsx"), "utf8");

    expect(liveValues.includes("useMarketsLiveStore")).toBe(false);
    expect(rows.includes("PairMetadataRow")).toBe(true);
    expect(rows.includes("memo(")).toBe(true);
    expect(rows.includes("ScrollView")).toBe(true);
    expect(rows.includes("RefreshControl")).toBe(true);
    expect(rows.includes("FlatList")).toBe(false);
  });

  it("uses stable keys and passes live values as row props", () => {
    const source = readFileSync(resolve(__dirname, "WatchlistRows.tsx"), "utf8");

    expect(source.includes("key={item.pair}")).toBe(true);
    expect(source.includes("displayPrice={displayPrice}")).toBe(true);
    expect(source.includes("displayChange24h={displayChange24h}")).toBe(true);
    expect(source.includes("resolveWatchlistDisplayValuesForPair")).toBe(true);
  });

  it("memoizes row rendering and keeps callbacks as props", () => {
    const source = readFileSync(resolve(__dirname, "WatchlistRows.tsx"), "utf8");

    expect(source.includes("useCallback")).toBe(true);
    expect(source.includes("useMemo")).toBe(true);
    expect(source.includes("onToggleFavourite")).toBe(true);
    expect(source.includes("onOpenDetails")).toBe(true);
  });

  it("uses ScrollView instead of FlatList in MarketsScreen", () => {
    const screen = readFileSync(
      resolve(__dirname, "../../screens/MarketsScreen.tsx"),
      "utf8"
    );

    expect(screen.includes("WatchlistRows")).toBe(true);
    expect(screen.includes("FlatList")).toBe(false);
    expect(screen.includes("WatchlistLiveValues")).toBe(false);
    expect(screen.includes("useCallback")).toBe(true);
  });
});

describe("selectWatchlistDisplayValuesAll", () => {
  const baseState = {
    snapshotsByPair: {
      BTCUSDT: {
        price: 64_238.1749,
        change24hPercent: 1.23456
      },
      ETHUSDT: {
        price: 3_456.789123,
        change24hPercent: -0.45678
      },
      SOLUSDT: {
        price: 145.678912,
        change24hPercent: 2.1
      },
      DOGEUSDT: {
        price: 0.123456789,
        change24hPercent: -5.55
      },
      XRPUSDT: {
        price: 0.56789123,
        change24hPercent: 0.0012
      }
    }
  } as never;

  it("returns ten display primitives in supported-pair order", () => {
    const all = selectWatchlistDisplayValuesAll(baseState);

    expect(all.length).toBe(WATCHLIST_DISPLAY_PRIMITIVE_COUNT);
    expect(all).toEqual([
      64_238.17,
      1.23,
      3_456.79,
      -0.46,
      145.6789,
      2.1,
      0.123457,
      -5.55,
      0.567891,
      0
    ]);
  });

  it("resolves per-pair tuples from the batch selector output", () => {
    const all = selectWatchlistDisplayValuesAll(baseState);

    expect(resolveWatchlistDisplayValuesForPair(all, "BTCUSDT")).toEqual([
      64_238.17,
      1.23
    ]);
    expect(resolveWatchlistDisplayValuesForPair(all, "XRPUSDT")).toEqual([
      0.567891,
      0
    ]);
    expect(resolveWatchlistDisplayValuesForPair(all, "UNKNOWN")).toEqual([
      undefined,
      undefined
    ]);
  });

  it("stays shallow-equal when only order-book fields change", () => {
    const before = selectWatchlistDisplayValuesAll(baseState);
    const after = selectWatchlistDisplayValuesAll({
      snapshotsByPair: {
        BTCUSDT: {
          price: 64_238.1749,
          change24hPercent: 1.23456,
          bids: [{ price: 1, quantity: 1, total: 1 }]
        },
        ETHUSDT: {
          price: 3_456.789123,
          change24hPercent: -0.45678
        },
        SOLUSDT: {
          price: 145.678912,
          change24hPercent: 2.1
        },
        DOGEUSDT: {
          price: 0.123456789,
          change24hPercent: -5.55
        },
        XRPUSDT: {
          price: 0.56789123,
          change24hPercent: 0.0012
        }
      }
    } as never);

    expect(watchlistDisplayValuesAllEqual(before, after)).toBe(true);
  });

  it("changes when a visible price updates", () => {
    const before = selectWatchlistDisplayValuesAll(baseState);
    const after = selectWatchlistDisplayValuesAll({
      snapshotsByPair: {
        BTCUSDT: {
          price: 64_238.18,
          change24hPercent: 1.23456
        },
        ETHUSDT: {
          price: 3_456.789123,
          change24hPercent: -0.45678
        },
        SOLUSDT: {
          price: 145.678912,
          change24hPercent: 2.1
        },
        DOGEUSDT: {
          price: 0.123456789,
          change24hPercent: -5.55
        },
        XRPUSDT: {
          price: 0.56789123,
          change24hPercent: 0.0012
        }
      }
    } as never);

    expect(watchlistDisplayValuesAllEqual(before, after)).toBe(false);
    expect(after[0]).toBe(64_238.18);
  });

  it("ignores subprecision raw mutations across all pairs", () => {
    const before = selectWatchlistDisplayValuesAll(baseState);
    const after = selectWatchlistDisplayValuesAll({
      snapshotsByPair: {
        BTCUSDT: {
          price: 64_238.171,
          change24hPercent: 1.231
        },
        ETHUSDT: {
          price: 3_456.789123,
          change24hPercent: -0.45678
        },
        SOLUSDT: {
          price: 145.678912,
          change24hPercent: 2.1
        },
        DOGEUSDT: {
          price: 0.123456789,
          change24hPercent: -5.55
        },
        XRPUSDT: {
          price: 0.56789123,
          change24hPercent: 0.0012
        }
      }
    } as never);

    expect(watchlistDisplayValuesAllEqual(before, after)).toBe(true);
  });
});

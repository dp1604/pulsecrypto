import {
  type MarketSnapshot,
  MarketSnapshotSchema,
  type PairSymbol
} from "@pulsecrypto/shared";
import type { MarketPairState } from "./MarketTypes";
import { computePressure, computeSpread } from "./marketCalculations";
import { MarketStateStore } from "./MarketStateStore";

export class MarketSnapshotBuilder {
  constructor(private readonly store: MarketStateStore) {}

  buildPairSnapshot(pair: PairSymbol): MarketSnapshot | undefined {
    const state = this.store.getPairState(pair);

    return state === undefined ? undefined : buildSnapshotFromState(state);
  }

  buildAllSnapshots(): MarketSnapshot[] {
    return this.store.getAllStates().map(buildSnapshotFromState);
  }
}

export const buildSnapshotFromState = (
  state: MarketPairState
): MarketSnapshot => {
  const bids = state.depth?.bids ?? [];
  const asks = state.depth?.asks ?? [];
  const spread = computeSpread(bids, asks);
  const { buyPressure, sellPressure } = computePressure(bids, asks);

  const snapshot = {
    pair: state.pair,
    displayName: state.displayName,
    price: state.ticker?.price ?? 0,
    change24hPercent: state.ticker?.change24hPercent ?? 0,
    // The shared outbound contract requires a numeric non-negative spread.
    // When either side of the book is unavailable, use 0 until live depth exists.
    spread: spread !== undefined && spread >= 0 ? spread : 0,
    buyPressure,
    sellPressure,
    bids,
    asks,
    lastUpdated: Math.max(
      state.ticker?.timestamp ?? 0,
      state.depth?.timestamp ?? 0
    )
  } satisfies MarketSnapshot;

  return MarketSnapshotSchema.parse(snapshot);
};

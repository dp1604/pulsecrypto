import {
  isSupportedPairSymbol,
  type PairSymbol,
  SUPPORTED_PAIRS
} from "@pulsecrypto/shared";
import type {
  MarketDepthState,
  MarketDepthUpdate,
  MarketPairState,
  MarketTickerState,
  MarketTickerUpdate
} from "./MarketTypes";
import {
  DEFAULT_ORDER_BOOK_DEPTH,
  normalizeOrderBookLevels,
  toFiniteNumber,
  toNonNegativeFiniteNumber,
  toNonNegativeTimestamp,
  toPositiveFiniteNumber
} from "./marketCalculations";

export class MarketStateStore {
  private readonly states = new Map<PairSymbol, MarketPairState>();

  constructor() {
    for (const supportedPair of SUPPORTED_PAIRS) {
      this.states.set(supportedPair.pair, {
        pair: supportedPair.pair,
        displayName: supportedPair.displayName
      });
    }
  }

  updateTicker(update: MarketTickerUpdate): boolean {
    if (!isSupportedPairSymbol(update.pair)) {
      return false;
    }

    const ticker = this.normalizeTickerUpdate(update);

    if (ticker === undefined) {
      return false;
    }

    const currentState = this.states.get(update.pair);

    if (currentState === undefined) {
      return false;
    }

    if (
      currentState.ticker !== undefined &&
      ticker.timestamp <= currentState.ticker.timestamp
    ) {
      return false;
    }

    this.states.set(update.pair, {
      ...currentState,
      ticker
    });

    return true;
  }

  updateOrderBook(update: MarketDepthUpdate): boolean {
    if (!isSupportedPairSymbol(update.pair)) {
      return false;
    }

    const currentState = this.states.get(update.pair);

    if (currentState === undefined) {
      return false;
    }

    const timestamp = toNonNegativeTimestamp(update.timestamp);

    if (timestamp === undefined) {
      return false;
    }

    if (
      currentState.depth !== undefined &&
      timestamp <= currentState.depth.timestamp
    ) {
      return false;
    }

    const depthLimit = update.depthLimit ?? DEFAULT_ORDER_BOOK_DEPTH;
    const depth: MarketDepthState = {
      bids: normalizeOrderBookLevels(update.bids, "bid", depthLimit),
      asks: normalizeOrderBookLevels(update.asks, "ask", depthLimit),
      timestamp
    };

    this.states.set(update.pair, {
      ...currentState,
      depth
    });

    return true;
  }

  getPairState(pair: string): MarketPairState | undefined {
    if (!isSupportedPairSymbol(pair)) {
      return undefined;
    }

    const state = this.states.get(pair);

    return state === undefined ? undefined : cloneMarketPairState(state);
  }

  getAllStates(): MarketPairState[] {
    return [...this.states.values()].map(cloneMarketPairState);
  }

  private normalizeTickerUpdate(
    update: MarketTickerUpdate
  ): MarketTickerState | undefined {
    const price = toPositiveFiniteNumber(update.price);
    const change24hPercent = toFiniteNumber(update.change24hPercent);
    const high24h = toNonNegativeFiniteNumber(update.high24h);
    const low24h = toNonNegativeFiniteNumber(update.low24h);
    const volume24h = toNonNegativeFiniteNumber(update.volume24h);
    const timestamp = toNonNegativeTimestamp(update.timestamp);

    if (
      price === undefined ||
      change24hPercent === undefined ||
      high24h === undefined ||
      low24h === undefined ||
      volume24h === undefined ||
      timestamp === undefined
    ) {
      return undefined;
    }

    return {
      price,
      change24hPercent,
      high24h,
      low24h,
      volume24h,
      timestamp
    };
  }
}

const cloneMarketPairState = (state: MarketPairState): MarketPairState => {
  const cloned: MarketPairState = {
    pair: state.pair,
    displayName: state.displayName
  };

  if (state.ticker !== undefined) {
    cloned.ticker = { ...state.ticker };
  }

  if (state.depth !== undefined) {
    cloned.depth = {
      bids: state.depth.bids.map((level) => ({ ...level })),
      asks: state.depth.asks.map((level) => ({ ...level })),
      timestamp: state.depth.timestamp
    };
  }

  return cloned;
};

# ADR-002: Binance Stream Strategy

Status: Accepted

Decision owner: Dinitha Gamage

Scope: PulseCrypto assignment

Date: 2026-07-09

## Context

The assignment requires Binance public market streams for multiple pairs, continuous order book ingestion, current price, spread, buy/sell pressure, bids, asks, timestamp, and 24h metadata such as high, low, and volume.

## Decision

Combine Binance partial-depth streams with ticker streams for the supported pairs.

Partial depth streams:

- `btcusdt@depth20@100ms`
- `ethusdt@depth20@100ms`
- `solusdt@depth20@100ms`
- `dogeusdt@depth20@100ms`
- `xrpusdt@depth20@100ms`

Ticker streams:

- `btcusdt@ticker`
- `ethusdt@ticker`
- `solusdt@ticker`
- `dogeusdt@ticker`
- `xrpusdt@ticker`

Partial-depth data will support bids, asks, spread, and pressure calculations. Ticker-style data will support current price, 24h change, high, low, and volume where needed. Metadata may be mocked if that remains the explicit implementation trade-off, because the assignment permits mocked metadata.

PulseCrypto will not implement full L2 diff-depth sequencing for this assignment. It is a market viewer, not an exchange-grade trading engine.

## Consequences

- The backend owns Binance-specific stream details and keeps mobile clients decoupled from Binance payloads.
- External stream payloads must be validated and normalized before internal use.
- If every raw depth delta is not needed, the backend can prioritize latest-state snapshots for UI responsiveness.
- Avoiding full L2 sequencing reduces correctness guarantees for trading workflows, which are out of scope for this assignment.
- Reconnect, resubscribe, and stale-data behavior must be documented when implemented.

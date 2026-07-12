# ADR-003: Stream Coalescing And Backpressure

Status: Accepted

Decision owner: Dinitha Gamage

Scope: PulseCrypto assignment

Date: 2026-07-09

Implemented: 2026-07-09

## Context

Raw market updates can arrive many times per second. The mobile app should remain smooth during sustained bursts, and slow consumers must not cause unbounded backend memory growth.

## Decision

Use latest-state coalescing with configurable batch broadcasting:

- Keep the latest normalized market state per pair.
- Broadcast all supported pair snapshots from latest state in a compact batch at a configurable interval.
- Use 100ms as the default interval.
- Do not keep unbounded per-client queues.
- Check WebSocket `readyState` and `bufferedAmount` before sending.
- Skip stale sends for slow clients.
- Close persistently unhealthy clients.
- Use heartbeat ping/pong.

Dirty-pair-only broadcasting (sending only pairs whose normalized state changed since the last tick) is a future bandwidth optimization and is not part of the current implementation.

The WebSocket batch envelope is:

```text
type: "market.snapshot.batch"
sentAt: Unix epoch milliseconds
sequence: monotonically increasing number
pairs: array of pair snapshots
```

Each pair snapshot must identify `pair`, `displayName`, `price`, `change24hPercent`, `spread`, `buyPressure`, `sellPressure`, `bids`, `asks`, and `lastUpdated`.

## Implementation Notes

The first backend broadcaster implementation:

- Uses `MarketBroadcaster` with `MarketSnapshotBuilder` and `ClientConnectionManager`.
- Defaults to a 100ms interval via `MARKET_BROADCAST_INTERVAL_MS`.
- Validates outbound payloads with `MarketSnapshotBatchMessageSchema`.
- Skips sends when `readyState !== OPEN` or `bufferedAmount > WS_MAX_BUFFERED_AMOUNT_BYTES`.
- Closes clients after `WS_MAX_CONSECUTIVE_SLOW_TICKS` consecutive skipped ticks.
- Uses heartbeat ping/pong via `ClientConnectionManager` with `WS_HEARTBEAT_INTERVAL_MS`.
- Broadcasts all supported pair snapshots each tick from latest state.
- Dirty-pair-only broadcasting remains a future optimization, not current behavior.

## Consequences

- Mobile clients receive UI-friendly updates instead of every raw Binance event.
- Some intermediate ticks may be dropped by design.
- The WebSocket contract must identify each pair and document timestamp units.
- Tests cover batching cadence, all-pair snapshot delivery, `readyState`/`bufferedAmount` handling, stale-send skipping, heartbeat behavior, and slow-client disconnect behavior.
- Dirty-pair-only broadcasting may be added later as a bandwidth optimization.

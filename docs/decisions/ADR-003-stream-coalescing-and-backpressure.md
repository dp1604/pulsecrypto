# ADR-003: Stream Coalescing And Backpressure

Status: Accepted

Date: 2026-07-09

## Context

Raw market updates can arrive many times per second. The mobile app should remain smooth during sustained bursts, and slow consumers must not cause unbounded backend memory growth.

## Decision

Use latest-state coalescing with configurable batch broadcasting:

- Keep the latest normalized market state per pair.
- Mark pairs as dirty when their normalized state changes.
- Broadcast dirty pairs to connected clients in a compact batch at a configurable interval.
- Use 100ms as the default interval.
- Do not keep unbounded per-client queues.
- Check WebSocket `readyState` and `bufferedAmount` before sending.
- Skip stale sends for slow clients.
- Close persistently unhealthy clients.
- Use heartbeat ping/pong.

The planned WebSocket batch envelope is:

```text
type: "market.snapshot.batch"
sentAt: Unix epoch milliseconds
sequence: monotonically increasing number
pairs: array of pair snapshots
```

Each pair snapshot must identify `pair`, `displayName`, `price`, `change24hPercent`, `spread`, `buyPressure`, `sellPressure`, `bids`, `asks`, and `lastUpdated`.

## Consequences

- Mobile clients receive UI-friendly updates instead of every raw Binance event.
- Some intermediate ticks may be dropped by design.
- The WebSocket contract must identify each pair and document timestamp units.
- Tests must cover batching cadence, dirty-pair flushing, `readyState`/`bufferedAmount` handling, stale-send skipping, heartbeat behavior, and slow-client disconnect behavior.

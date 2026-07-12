# ADR-005: Offline Reconnect Strategy

Status: Accepted

Decision owner: Dinitha Gamage

Scope: PulseCrypto assignment

Date: 2026-07-09

## Context

The assignment requires the app to show current connection status, continue displaying the most recently received data when the backend is unavailable, and automatically reconnect when connectivity is restored. Pull-to-refresh metadata must not interrupt the live WebSocket stream.

## Decision

Plan an offline/reconnect strategy based on last-known valid data:

- Track connection status separately from market data.
- Keep last-known pair snapshots visible during disconnects.
- Mark data freshness through timestamps and connection state rather than clearing the UI.
- Use bounded reconnect attempts with jitter/backoff when implemented.
- Keep metadata refresh on a separate REST path so pull-to-refresh does not restart the WebSocket connection.

## Consequences

- The UI remains useful during temporary backend outages.
- Stale data must be visually distinguishable from live data.
- Reconnect logic must avoid tight loops and duplicate socket subscriptions.
- Metadata failures and WebSocket failures can be handled independently.

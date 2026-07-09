# PulseCrypto Architecture Blueprint

This blueprint describes the intended architecture and current implementation status. Shared contracts, the backend foundation, and pure backend market calculation/state/snapshot utilities are implemented. Binance ingestion, market snapshot broadcasting, and mobile application code have not been implemented yet.

## System Overview

PulseCrypto will be a local real-time market viewer:

1. The backend connects to Binance public market streams.
2. The backend validates, normalizes, coalesces, and batches market data.
3. The backend exposes local REST metadata and WebSocket market batches.
4. The React Native app fetches metadata, subscribes to live batches, and renders watchlist/details screens.
5. The mobile app persists favourites locally and keeps last-known market data visible during disconnects.

Current status:

- Shared contracts/constants exist in `packages/shared/`.
- Backend `GET /health` exists.
- Backend `GET /pairs/meta` exists and returns mocked metadata for supported pairs.
- Backend WebSocket server accepts clients and sends a temporary `connection.ready` acknowledgement.
- Backend market calculation, latest-state store, and snapshot builder utilities exist and are covered by unit tests.
- Binance ingestion and `market.snapshot.batch` broadcasting are not implemented.
- Mobile app code is not scaffolded.

## Boundaries

- `backend/`: Node.js + TypeScript backend foundation, planned market gateway, Binance adapters, stream processing, REST API, WebSocket server, backpressure policy.
- `mobile/`: React Native app, navigation, UI, local persistence, connection lifecycle, rendering performance strategy.
- `packages/shared/`: contracts, constants, schemas, and pure utilities that are safe for both backend and mobile.
- `docs/`: architecture notes, ADRs, setup, validation evidence, assumptions, and trade-offs.

Shared packages must not contain network clients, servers, UI components, persistent stores, or runtime side effects.

## Data Flow

```text
Binance public streams
  -> backend stream adapters
  -> payload validation and normalization
  -> per-pair latest-state cache
  -> 100ms default batch scheduler
  -> compact WebSocket snapshot batch
  -> mobile contract validation
  -> mobile market state stores/selectors
  -> watchlist and detail rendering
```

Metadata flow:

```text
mobile pull-to-refresh
  -> GET /pairs/meta
  -> backend metadata provider, currently mocked
  -> mobile metadata validation
  -> metadata store update
```

The metadata refresh must not interrupt an active WebSocket stream.

The current mobile flow is not implemented yet.

## Planned Binance Stream Strategy

The backend will subscribe to Binance public streams for at least:

- `BTCUSDT`
- `ETHUSDT`
- `SOLUSDT`
- `DOGEUSDT`
- `XRPUSDT`

The planned stream model combines partial-depth/order-book data with ticker-style market data so the app can show price, 24h movement, spread, buy pressure, sell pressure, bids, asks, and timestamps.

Binance data is external and untrusted. The backend must validate shape and numeric ranges before using it.

## Planned WebSocket Batch Strategy

The backend will not forward every raw update directly to mobile clients. Instead:

- Maintain latest normalized state per pair.
- Mark a pair dirty when its normalized state changes.
- Broadcast dirty pairs in one compact `market.snapshot.batch` message on a configurable interval.
- Use 100ms as the default interval.
- Do not keep unbounded per-client queues.
- Check WebSocket `readyState` and `bufferedAmount` before sending.
- Skip stale sends for slow clients.
- Close persistently unhealthy clients.
- Use heartbeat ping/pong.

Planned batch envelope:

```text
type: "market.snapshot.batch"
sentAt: Unix epoch milliseconds
sequence: monotonically increasing number
pairs: array of pair snapshots
```

Each pair snapshot must identify `pair`, `displayName`, `price`, `change24hPercent`, `spread`, `buyPressure`, `sellPressure`, `bids`, `asks`, and `lastUpdated`.

The current WebSocket server does not send this message yet.

## Planned Mobile State Strategy

Mobile state will be separated by ownership and update frequency:

- connection state
- pair metadata
- live market snapshots
- local favourites
- search/filter UI state
- detail-screen selection

High-frequency market updates should update only the affected pair records. Components should subscribe through selectors so unrelated rows and screens do not re-render.

Persisted favourites must be validated when restored. Additional persisted cached state requires explicit approval in a future task.

## Figma Usage

The Pulse Crypto Figma mockup is the official UI/UX source of truth. The preferred inspection path is Figma MCP or equivalent structured access. Screenshots are the fallback when structured inspection is unavailable.

Implementation order:

1. Required assignment flows and states.
2. Figma styling and layout fidelity for those flows.
3. Optional Figma-only surfaces, clearly labeled as P1/P2 or future.

No fake Settings, profile, API-key, security, or telemetry behavior should be implemented solely because a visual appears in Figma.

## Validation Gates

Foundation gate:

- Required docs and ADRs exist.
- Workspace metadata is valid JSON/YAML.
- Shared contracts typecheck.
- Backend foundation typechecks.
- Backend route tests pass.
- No generated app artifacts are introduced.

Backend gate:

- Type checks pass.
- REST contract is validated.
- WebSocket batches are validated.
- Coalescing and slow-consumer behavior are tested.
- Binance adapter handles invalid payloads and reconnect scenarios.

Mobile gate:

- App runs on Android Emulator.
- Watchlist, search, favourites, details, offline, reconnect, and pull-to-refresh are validated.
- State updates remain smooth under sustained backend update bursts.
- Figma-required P0 screens are visually checked.

Delivery gate:

- README documents setup, architecture, assumptions, trade-offs, and AI-assisted workflow.
- Screen recording is produced.
- Known limitations are explicit.

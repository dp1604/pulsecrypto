# PulseCrypto Architecture Blueprint

This blueprint describes the implemented PulseCrypto assignment architecture and clearly separates production-hardening work that remains deferred.

## System Overview

PulseCrypto is a local real-time market viewer:

1. The backend connects to Binance public market streams.
2. The backend validates, normalizes, coalesces, and batches market data.
3. The backend exposes local REST metadata and WebSocket market batches.
4. The React Native app fetches metadata, subscribes to live batches, and renders watchlist and Market Details screens.
5. The mobile app persists favourites locally and keeps last-known market data visible during disconnects.

## Current implementation status

Implemented:

- Shared contracts/constants in `packages/shared/`.
- Backend `GET /health` and `GET /pairs/meta` (mocked metadata fixtures).
- Backend WebSocket server with `connection.ready` and `market.snapshot.batch` broadcasting.
- Binance combined-stream ingestion with defensive parsing and reconnect policy.
- `MarketBroadcaster` at 100ms default interval with slow-consumer protection.
- Client heartbeat ping/pong and bounded skip/close policy for slow consumers.
- Expo SDK 57 mobile app with bottom-tab navigation (Markets default).
- Markets REST metadata loading, local search/filter, AsyncStorage favourites, metadata pull-to-refresh.
- Validated live WebSocket pricing with one mobile live store and 250ms visual publication coalescing.
- Compact connection chip states and last-known snapshot retention during reconnect/pause.
- Typed Markets → Market Details navigation with pair-specific selectors.
- Figma-aligned Trading Terminal Market Details: LAST PRICE animation, Order Book, Market Depth.
- One Watchlist-level Zustand subscription with ten display primitives and bounded five-pair `ScrollView`.
- Watchlist prices briefly flash buy/sell text color on displayed-price increases/decreases via one list-level controller and one clear timer.
- Accessible bookmark favourite toggle on Watchlist rows.
- Market Details Top App Bar uses a back arrow matching `goBack()` navigation.
- Market Depth bid/ask curves join at a shared C1-continuous center valley with divider rendered behind fills and strokes.
- Green/red 24h direction indicators on Watchlist.
- Optimized Android release APK validated on API 35 emulator.
- Terminal, Telemetry, and Settings remain honest placeholder screens.

Deferred:

- iOS project generation and Simulator validation.
- Optional Figma-only surfaces (drawer, profile, API-key UI, security, functional telemetry).
- CI, observability, and production transport hardening.

## Boundaries

- `backend/`: Node.js + TypeScript market gateway, Binance adapters, stream processing, REST API, WebSocket server, and backpressure policy.
- `mobile/`: React Native app, navigation, UI, local persistence, connection lifecycle, rendering performance strategy.
- `packages/shared/`: contracts, constants, schemas, and pure utilities safe for both backend and mobile.
- `docs/`: architecture notes, ADRs, validation evidence, assumptions, and trade-offs.

Shared packages must not contain network clients, servers, UI components, persistent stores, or runtime side effects.

## Data Flow

```text
Binance public streams
  -> backend stream adapters (BinanceStreamClient)
  -> payload validation and normalization
  -> per-pair latest-state cache (MarketStateStore)
  -> 100ms batch scheduler (MarketBroadcaster)
  -> compact WebSocket snapshot batch
  -> mobile contract validation (MarketSnapshotBatchMessageSchema)
  -> one markets live store
  -> 250ms display coalescer (marketDisplayCoalescer)
  -> selector-based rendering
  -> Watchlist batch selector OR Market Details pair selectors
  -> watchlist rows / order book / market depth presentation
```

Metadata flow:

```text
mobile pull-to-refresh
  -> GET /pairs/meta
  -> backend mocked metadata provider
  -> mobile metadata validation
  -> metadata store update (does not interrupt WebSocket stream)
```

## Binance Stream Strategy

The backend connects to Binance public combined streams for:

- `BTCUSDT`
- `ETHUSDT`
- `SOLUSDT`
- `DOGEUSDT`
- `XRPUSDT`

The stream model combines partial-depth/order-book data with ticker-style market data so the backend can maintain price, 24h movement, spread, buy pressure, sell pressure, bids, asks, and timestamps.

Binance data is external and untrusted. The parser validates shape and numeric ranges before updating market state.

## WebSocket Batch Strategy

The backend does not forward every raw update directly to mobile clients:

- Maintain latest normalized state per pair.
- Build all supported pair snapshots from latest state.
- Broadcast snapshots in one compact `market.snapshot.batch` message on a configurable interval.
- Default interval: 100ms (`MARKET_BROADCAST_INTERVAL_MS`).
- No unbounded per-client queues.
- Check WebSocket `readyState` and `bufferedAmount` before sending.
- Skip stale sends for slow clients; close persistently unhealthy clients after consecutive slow ticks.
- Use heartbeat ping/pong.

Batch envelope:

```text
type: "market.snapshot.batch"
sentAt: Unix epoch milliseconds
sequence: monotonically increasing number
pairs: array of pair snapshots
```

Each pair snapshot identifies `pair`, `displayName`, `price`, `change24hPercent`, `spread`, `buyPressure`, `sellPressure`, `bids`, `asks`, and `lastUpdated`.

## Mobile State Strategy

Mobile state is separated by ownership and update frequency:

- connection state (WebSocket lifecycle controller)
- pair metadata (`marketsMetadataStore`)
- live market snapshots (`useMarketsLiveStore`)
- local favourites (`marketsPreferencesStore`)
- search/filter UI state (Markets screen-local)
- detail-screen selection (navigation param: pair symbol)

High-frequency updates flow through one live store. Rendering minimizes blast radius:

- **Watchlist:** one batch selector (`selectWatchlistDisplayValuesAll`) feeding ten display primitives across five rows.
- **Market Details:** pair-specific selectors for price, order book, depth, and connection presentation.
- **Visual publication:** 250ms coalescing decouples UI commits from 100ms backend cadence.

Persisted favourites are validated on read. Additional persisted cached state requires a documented architecture decision.

## Watchlist rendering architecture

Watchlist performance architecture:

- `WatchlistRows` owns the bounded `ScrollView` for five supported pairs.
- Exactly one `useMarketsLiveStore` subscription at Watchlist level.
- `WatchlistLiveValues` is a pure prop-driven view (no store subscription).
- Displayed prices briefly flash buy/sell text color via one list-level highlight controller and one clear timer.
- 24h change uses directional color and ▲/▼ independently of price-highlight timing.
- Bookmark favourite toggle replaces the prior text button.
- Market Details LAST PRICE retains tick-direction color animation.

## Market Details architecture

Market Details reuses the existing WebSocket/live store with pair-specific selectors:

- Compact Figma top app bar with connection chip
- Animated LAST PRICE tick-direction text color
- Inline signed 24h change with positive/negative color
- REST fixture stats with `FIXTURE META` disclosure
- Spread/pressure metrics strip
- Bounded top-10 Order Book with directional depth bars
- SVG Market Depth derived from the same bounded bid/ask levels

Order Book geometry: bids anchor right and expand left; asks anchor left and expand right. Market Depth uses elevated true center-valley geometry with borderless/full-bleed presentation.

## App-state lifecycle and reconnect

- App backgrounding pauses WebSocket transport.
- Foreground resume reconnects without clearing last-known snapshots.
- Reconnect delay uses exponential backoff with jitter (delay capped; retries continue while lifecycle active).
- Connection chip communicates `LIVE`, `SYNCING`, `CONNECTING`, `RECONNECTING`, `PAUSED`, `OFFLINE`.
- `LAST KNOWN` badge during transient reconnect states.

## Runtime strategy

Accepted mobile runtime paths:

- **Development:** Expo development build (`expo-dev-client`) with Metro and `adb reverse`.
- **Release validation:** optimized local release APK on Android Emulator.

Expo Go is not the accepted production-grade runtime path. Generated native folders (`mobile/android`, `mobile/ios`) are produced by CNG and remain gitignored.

Local release evidence used emulator-local HTTP/WS and temporary generated-native cleartext settings. This is assignment validation only—not production transport policy.

## Performance evidence

Sustained release-runtime profiling on optimized release APKs. Classification: **PASS_WITH_PERFORMANCE_RISK**.

Key results (reported per workload, not averaged):

- Idle sparse Watchlist: 63 frames, p99 23ms, 0 frozen
- Controlled interaction: p99 57ms, max 61ms, 0 frozen
- Mixed Watchlist: p99 113ms, max 150ms, 0 frozen, bounded memory
- BTC Details: p99 77ms, max 133ms, 0 frozen, stable memory
- Latest UX-polish release: idle p99 57ms, interaction p99 85ms, 0 frozen (elevated jank %)

See [final-validation.md](./final-validation.md).

## Figma Usage

The Pulse Crypto Figma mockup is the official UI/UX source of truth. See [figma-rules.md](./figma-rules.md).

Implemented P0 surfaces: watchlist, search/filter, favourites, Market Details, offline/reconnect affordance, pull-to-refresh, Figma tab/search assets.

Deferred unless promoted: functional Settings, Telemetry dashboards, drawer navigation, profile/account, API-key/security UI, trading beyond viewing.

## Validation Gates

Foundation gate: PASS

Backend gate: PASS (routes, broadcaster, Binance ingestion, slow-consumer policy tested)

Mobile gate: PASS (P0 screens, reconnect, release APK, performance evidence with disclosed risk)

Delivery gate: PASS (README, architecture, final-validation, submission-handoff, demo artifacts)

## Production hardening (planned)

- Runtime configuration schema and environment validation
- Observability, metrics, structured logging
- Binance stream gap handling beyond assignment scope
- Rate limits, payload limits, WebSocket connection caps
- Contract versioning and compatibility tests
- Mobile crash reporting and performance instrumentation
- CI for linting, typecheck, tests, and Android build validation
- HTTPS/WSS production transport and network-security configuration

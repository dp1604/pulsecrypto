# PulseCrypto

PulseCrypto is a practical-assignment project for a Staff Engineer / Mobile Architect role: a real-time cryptocurrency market viewer with a Node.js + TypeScript backend gateway and a React Native mobile app validated on Android Emulator.

The repository delivers shared TypeScript contracts, a backend market gateway, and a complete Expo React Native mobile experience: Markets watchlist with live WebSocket pricing, search/filter, persisted favourites, pull-to-refresh metadata, bounded reconnect with last-known values, and Figma-aligned Market Details with animated LAST PRICE, Order Book, and Market Depth. Terminal, Telemetry, and Settings remain intentional placeholder screens.

## What this project demonstrates

- Architecture for real-time market data ingestion, processing, and mobile delivery.
- Mobile engineering judgment for smooth rendering under sustained updates.
- Explicit trade-offs around batching, coalescing, offline behavior, and bounded memory.
- Documentation and ADR discipline suitable for senior technical review.
- Controlled AI-assisted development with guardrails against hallucinated APIs, dependency drift, and over-engineering.

## Requirements coverage

| Area | Assignment requirement | Status |
| --- | --- | --- |
| Backend gateway | Node.js service bridging Binance public data to mobile clients | **Implemented** |
| Binance pairs | BTC/USDT, ETH/USDT, SOL/USDT, DOGE/USDT, XRP/USDT | **Implemented** |
| Batching | Configurable broadcast interval, default 100ms | **Implemented** |
| Slow-consumer protection | Prevent unbounded memory growth on slow WebSocket clients | **Implemented** |
| Metadata | `GET /pairs/meta` endpoint | **Implemented** (fixtures disclosed) |
| Android mobile | React Native on Android Emulator | **Implemented** and release-validated |
| Watchlist | Pair, price, 24h change, connection indicator, favourite toggle | **Implemented** |
| Search | Local pair search/filter | **Implemented** |
| Favourites | Persist and restore locally | **Implemented** |
| Details | Price, pressure, spread, bids, asks, timestamp | **Implemented** |
| Reconnect/offline | Last-known data and automatic reconnect | **Implemented** |
| Refresh | Pull-to-refresh metadata without interrupting WebSocket | **Implemented** |
| Performance | Smooth updates under sustained bursts | **Validated** with disclosed risk |
| Delivery documentation | README, architecture, assumptions, trade-offs, AI usage | **Complete** |

P0 assignment requirements take priority over optional visual details from the Figma mockup.

## Performance summary

Release-runtime profiling on the optimized APK classified overall performance as **PASS_WITH_PERFORMANCE_RISK**:

- Zero frozen frames across measured workloads
- Idle sparse Watchlist p99: 23ms (63 frames at 1.4 fps — sparse commit model)
- Controlled interaction p99: 57ms (max 61ms)
- BTC Details p99: 77ms (max 133ms)
- Representative mixed Watchlist p99: 113ms (max 150ms during scroll + search + refresh)
- Memory remained bounded/stable
- Elevated emulator/Android jank counters acknowledged as remaining risk

See [docs/final-validation.md](docs/final-validation.md) for environment, workload table, and limitations. Do not treat modern jank percentage alone as failure when frame durations and responsiveness remain acceptable.

## Architecture overview

Monorepo with clear ownership boundaries:

- `backend/`: REST health/metadata routes, WebSocket server, Binance stream ingestion, latest-state store, 100ms `market.snapshot.batch` broadcasting, slow-consumer protection.
- `mobile/`: Expo React Native app with one live store, 250ms visual publication coalescing, one Watchlist-level batch subscription (ten display primitives), bounded five-pair `ScrollView`, Market Details with animated LAST PRICE, Order Book, Market Depth, and placeholder Terminal/Telemetry/Settings screens.
- `packages/shared/`: shared contracts and constants only — no runtime side effects.
- `docs/`: architecture notes, ADRs, final validation, and submission handoff.

Final Watchlist architecture (STEP-16B):

- One `useMarketsLiveStore` subscription at Watchlist level
- Ten display primitives (price + 24h change × 5 pairs)
- Pure prop-driven `WatchlistLiveValues` rows
- Neutral Watchlist prices; green/red 24h direction with ▲/▼
- Watchlist price flash removed; Market Details alone retains tick-direction animation

## Repository structure

```text
pulsecrypto/
  backend/                 # Node.js market gateway
  mobile/                  # Expo React Native app
  packages/shared/         # Shared contracts and constants
  docs/
    architecture.md
    final-validation.md
    submission-handoff.md
    decisions/             # ADRs
  AGENTS.md
  package.json
  pnpm-workspace.yaml
```

## Backend design

- Fastify HTTP with `GET /health` and `GET /pairs/meta`.
- Mocked metadata generated from shared supported-pair constants (disclosed in UI/docs).
- WebSocket server sends `connection.ready` and validated `market.snapshot.batch` messages.
- Binance combined-stream ingestion with defensive parsing and reconnect policy.
- `MarketBroadcaster` emits latest-state batches every 100ms by default.
- Slow-consumer protection skips high-`bufferedAmount` sends and closes persistently slow clients.
- Client heartbeat ping/pong removes dead connections.

## Mobile architecture

- Expo SDK 57 with bottom-tab navigation (Markets default).
- Markets loads metadata from REST; live pricing from validated WebSocket batches.
- One `useMarketsLiveStore`; 250ms `marketDisplayCoalescer` for visual publication.
- `WatchlistRows` provides one batch subscription and bounded `ScrollView` for five pairs.
- Connection chip: `LIVE`, `SYNCING`, `CONNECTING`, `RECONNECTING`, `PAUSED`, `OFFLINE`.
- Last-known snapshots retained during reconnect; metadata refresh is REST-only.
- Market Details: Figma top app bar, animated LAST PRICE, fixture stats, Order Book, Market Depth.
- Figma tab/search icons from `mobile/assets/figma/` — see [docs/figma-asset-map.md](docs/figma-asset-map.md).
- `expo-dev-client` for development; optimized release APK for final validation.
- **iOS not validated.** Android Emulator (`PulseCrypto_API_35`) is the assignment runtime.
- Authentication, API keys, trading, and functional Settings/Telemetry are not implemented.

## UI reference

Figma mockup: https://www.figma.com/design/JYfr5h2vC9IFKtX3vasmZk/Pulse-Crypto-Mockup?node-id=0-1&p=f

Optional Figma-only surfaces (drawer, profile, API-key UI, shaders, functional telemetry) remain deferred.

## Setup and run

### Static validation

```bash
CI=1 pnpm install --frozen-lockfile --reporter=append-only
pnpm typecheck
pnpm test
cd mobile && pnpm dlx expo-doctor
pnpm exec expo install --check
```

### Backend

```bash
pnpm dev:backend
```

Default endpoints: `http://localhost:3000` (HTTP), `ws://localhost:3001` (WS).

### Mobile development client

```bash
pnpm dev:backend
cd mobile
CI=1 EXPO_NO_GIT_STATUS=1 pnpm exec expo prebuild --clean --platform android   # first time or native dep change
CI=1 pnpm exec expo run:android --device PulseCrypto_API_35 --variant debug
pnpm exec expo start --dev-client --localhost --port 8081
```

`--device` expects the Android Virtual Device name in this workflow, not the adb serial. Reviewers can run `emulator -list-avds` and substitute their installed AVD name.

Environment (with `adb reverse`):

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000
EXPO_PUBLIC_WS_URL=ws://127.0.0.1:3001
```

Generated native folders (`mobile/android`, `mobile/ios`) are gitignored.

### Optimized release APK

SHA-256: `8985e7babce6a343f225be1f6cec4e780a510051110b9e31b191a782b02a2d71`

Local release evidence used emulator-local HTTP/WS and temporary generated-native cleartext settings. This is assignment validation only—not production transport policy.

## Testing

- Backend: 65 tests (routes, market math, Binance ingestion, broadcaster, connection manager)
- Mobile: 435 tests (stores, WebSocket, formatting, presentation, navigation, persistence)
- Workspace: 500 test executions

## Trade-offs

- Latest-state coalescing sacrifices every-tick fidelity for bounded UI-friendly updates.
- Backend gateway keeps mobile simpler and avoids direct Binance coupling.
- Mocked metadata is acceptable by assignment scope and clearly disclosed.
- Market Details passes only pair symbol; live store remains source of truth.
- Order book bounded to top 10 levels for mobile readability.
- Figma fidelity matters, but P0 functional behavior takes precedence over optional chrome.

## AI-assisted development

Governance: `AGENTS.md`, [docs/cursor-development-guide.md](docs/cursor-development-guide.md), ADR-007, and companion docs in `docs/`.

## Known limitations

- Settings, Telemetry, Terminal trading: placeholders only
- iOS: not generated or validated
- Metadata high/low/volume: backend fixtures, not live exchange data
- Performance: PASS_WITH_PERFORMANCE_RISK (mixed Watchlist p99 113ms tail)
- No CI yet
- Production hardening (HTTPS/WSS, observability, crash reporting) deferred

## Delivery documents

- [docs/final-validation.md](docs/final-validation.md) — validation environment, performance table, limitations
- [docs/submission-handoff.md](docs/submission-handoff.md) — reviewer entry points, run instructions, demo flow

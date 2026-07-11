# PulseCrypto

PulseCrypto is a practical-assignment project for a Staff Engineer / Mobile Architect role. The final target is a real-time cryptocurrency market viewer with a Node.js + TypeScript backend gateway and a React Native mobile app running on Android Emulator.

This repository currently has shared TypeScript contracts, a backend market gateway, and an Expo React Native mobile app. The backend exposes `GET /health`, `GET /pairs/meta`, and a local WebSocket server that sends `connection.ready` and `market.snapshot.batch` messages. The mobile app has navigation shell, dark-theme foundation, Markets REST metadata loading from `GET /pairs/meta`, local pair search/filter, AsyncStorage-backed favourites, metadata pull-to-refresh, validated live WebSocket pricing with explicit connection status, live watchlist price and 24-hour change, bounded automatic reconnect, and foreground/background lifecycle handling. Market details, order-book UI, spread/pressure UI, price flash, and terminal functionality are not implemented yet.

## What this project demonstrates

- Architecture for real-time market data ingestion, processing, and mobile delivery.
- Mobile engineering judgment for smooth rendering under sustained updates.
- Explicit trade-offs around batching, coalescing, offline behavior, and bounded memory.
- Documentation and ADR discipline suitable for senior technical review.
- Controlled AI-assisted development with guardrails against hallucinated APIs, dependency drift, and over-engineering.

## Requirements coverage

| Area | Assignment requirement | Stage |
| --- | --- | --- |
| Backend | Node.js service that bridges Binance public market data to mobile clients | Backend gateway implemented; mobile consumes REST pair metadata |
| Backend | TypeScript preferred, Express/Fastify or similar, WebSockets | Backend foundation implemented |
| Backend | Subscribe to BTC/USDT, ETH/USDT, SOL/USDT, DOGE/USDT, XRP/USDT | Binance ingestion foundation implemented |
| Backend | Ingest order book updates and batch processed updates | Implemented |
| Backend | Configurable broadcast interval, default 100ms | Implemented |
| Backend | Slow-consumer protection to prevent unbounded memory growth | Implemented |
| Backend | `GET /pairs/meta` metadata endpoint | Implemented with mocked metadata |
| Mobile | React Native app running on Android Emulator | Foundation plus Markets REST metadata and live WebSocket pricing |
| Mobile | Watchlist with pair, price, 24h change, connection indicator, favourite toggle | Metadata list with live price/change, text connection status, and text favourite toggle implemented |
| Mobile | Search/filter pairs | Implemented on Markets with local query state |
| Mobile | Persist and restore favourites locally | Implemented with versioned AsyncStorage payload |
| Mobile | Market details with price, pressure, spread, bids, asks, timestamp | Planned |
| Mobile | Live updates remain smooth during sustained bursts | Planned |
| Mobile | Offline status, last-known data, automatic reconnect | Live reconnect with last-known values retained; explicit paused/reconnecting states implemented |
| Mobile | Pull-to-refresh metadata without interrupting WebSocket stream | Metadata pull-to-refresh implemented; REST refresh does not replace the WebSocket connection |
| Delivery | README with setup, architecture, assumptions, trade-offs, AI usage | In progress |

P0 assignment requirements take priority over optional visual details from the Figma mockup.

## Architecture overview

The planned system uses a monorepo with clear ownership boundaries:

- `backend/`: implemented market gateway—REST health/metadata routes, WebSocket server, Binance stream ingestion, market-state utilities, and `market.snapshot.batch` broadcasting with slow-consumer protection.
- `mobile/`: Expo React Native foundation with Markets metadata loading from `GET /pairs/meta`, local pair search/filter, AsyncStorage-backed favourites, metadata pull-to-refresh, validated live WebSocket pricing with explicit connection status, and Terminal, Telemetry, and Settings placeholder screens. Market details, price flash, and order-book animations are not implemented yet.
- `packages/shared/`: shared contracts and constants only. It must not contain runtime side effects, backend services, mobile stores, or UI code.
- `docs/`: architecture notes, ADRs, validation notes, assumptions, and implementation evidence.

## Repository structure

```text
pulsecrypto/
  backend/                 # Node.js market gateway (REST, WebSocket, Binance ingestion)
  mobile/                  # Expo React Native app with Markets REST metadata
  packages/
    shared/                # Shared contracts and constants
  docs/
    architecture.md        # Architecture blueprint
    decisions/             # ADRs
    architecture-principles.md
    cursor-development-guide.md
    review-checklist.md
    reporting-template.md
    testing-standard.md
    figma-rules.md
    ui-guidelines.md
  AGENTS.md                # AI coding guardrails (enforcement index)
  package.json             # Root workspace metadata only
  pnpm-workspace.yaml      # Workspace layout
```

## Backend design

Current backend foundation:

- Fastify HTTP server with `GET /health`.
- Fastify HTTP server with `GET /pairs/meta`.
- Metadata is currently mocked and generated from shared supported-pair constants.
- WebSocket server accepts client connections, sends `connection.ready`, and broadcasts validated `market.snapshot.batch` messages.
- Shared TypeScript contracts define supported pairs, REST metadata, and market snapshot batch messages.
- Backend market calculation, latest-state store, and snapshot builder utilities exist with unit tests.
- Binance combined-stream URL construction, defensive message parsing, reconnect policy, and upstream WebSocket ingestion are implemented and wired into `MarketStateStore`.
- `MarketBroadcaster` emits latest-state snapshot batches on a configurable interval (default 100ms).
- Slow-consumer protection skips sends when `bufferedAmount` is high, tracks consecutive slow ticks, and closes persistently slow clients. No per-client queues are maintained.
- Client heartbeat ping/pong removes dead WebSocket connections.

Planned backend responsibilities:

- Bound memory and connection resources under sustained update bursts beyond the current defaults.

## Stream processing and backpressure

The backend uses latest-state coalescing:

- Binance may emit updates faster than the mobile UI should render.
- The backend keeps the most recent processed state per pair in `MarketStateStore`.
- `MarketBroadcaster` emits a compact `market.snapshot.batch` on a configurable interval. The default is 100ms (`MARKET_BROADCAST_INTERVAL_MS`).
- The backend does not forward every raw Binance event and does not keep unbounded per-client queues.
- Slow-consumer protection checks WebSocket `readyState` and `bufferedAmount` before each send.
- If `bufferedAmount` exceeds `WS_MAX_BUFFERED_AMOUNT_BYTES` (default 1,000,000), that client is skipped for the tick.
- Consecutive skipped ticks are tracked per client. After `WS_MAX_CONSECUTIVE_SLOW_TICKS` (default 5), the client is closed and removed.
- Heartbeat ping/pong runs on `WS_HEARTBEAT_INTERVAL_MS` (default 30,000ms) and closes clients that stop responding.

The implementation documents this policy in code, tests, and ADR-003.

## WebSocket contract

The backend currently sends this batched message shape to connected clients:

```json
{
  "type": "market.snapshot.batch",
  "sentAt": 1720802025000,
  "sequence": 42,
  "pairs": [
    {
      "pair": "BTCUSDT",
      "displayName": "BTC / USDT",
      "price": 109235.42,
      "change24hPercent": 1.82,
      "spread": 0.41,
      "buyPressure": 63,
      "sellPressure": 37,
      "bids": [],
      "asks": [],
      "lastUpdated": 1720802025000
    }
  ]
}
```

Contract requirements:

- The envelope uses `type: "market.snapshot.batch"`.
- `sentAt` is a Unix epoch timestamp in milliseconds.
- `sequence` is a monotonically increasing number.
- `pairs` contains pair snapshots.
- Every pair snapshot identifies `pair`, `displayName`, `price`, `change24hPercent`, `spread`, `buyPressure`, `sellPressure`, `bids`, `asks`, and `lastUpdated`.
- Mobile code validates incoming messages before updating state.
- Unknown fields are ignored unless explicitly promoted into the contract.

## REST contract

Implemented endpoint:

```http
GET /pairs/meta
```

Response shape:

```json
{
  "pairs": [
    {
      "pair": "BTCUSDT",
      "displayName": "BTC / USDT",
      "tradingStatus": "TRADING",
      "high24h": 110000,
      "low24h": 105000,
      "volume24h": 12345.67
    }
  ]
}
```

The assignment allows this metadata to be mocked. If mocked values are used, they must be labeled clearly in code and documentation.
At this stage, the backend returns mocked metadata for all supported pairs.

## Mobile architecture

Current mobile foundation:

- Expo SDK 57 TypeScript app under `mobile/` with bottom-tab navigation.
- Default tab is Markets.
- Markets loads supported pair metadata from `GET /pairs/meta` over REST with runtime validation against shared contracts.
- Markets supports local pair search/filter with screen-local query state.
- Favourites persist in AsyncStorage under a versioned key and restore after process restart.
- Metadata pull-to-refresh retains the current list on transient failure and replaces metadata atomically on success.
- Favourite row controls use accessible text labels (`Favourite` / `Favourited`) until approved Figma assets are exported.
- Markets shows validated live price and 24-hour percentage change per pair from `market.snapshot.batch`.
- Markets shows an explicit text connection status (`Connecting`, `Connected, waiting for data`, `Live`, `Reconnecting`, `Paused`, `Disconnected`).
- Live market snapshots are stored in a dedicated live store separate from metadata and favourites.
- Incoming WebSocket payloads are validated with `MarketSnapshotBatchMessageSchema` before state updates.
- Bounded automatic reconnect uses exponential backoff with jitter while the Markets lifecycle is active.
- App backgrounding pauses the WebSocket transport; foreground resume reconnects without clearing last-known snapshots.
- Metadata pull-to-refresh remains REST-only and does not restart or replace the WebSocket connection.
- Terminal, Telemetry, and Settings remain honest placeholder screens.
- Dark Figma-aligned theme tokens are in place.
- `high24h`, `low24h`, and `volume24h` shown on Markets are backend assignment fixtures, not live exchange values.
- Market details, spread/pressure UI, price flash, and order-book animations are not implemented yet.
- Authentication, API keys, and security UX are intentionally not implemented.
- Android Expo Go launch on `PulseCrypto_API_35` is confirmed when started via `pnpm --filter @pulsecrypto/mobile android` (IPv4 Metro binding + `adb reverse`). Use the Expo Go recent-project entry if the first open shows only the developer menu.

Planned mobile responsibilities:

- Market details screen with order book, spread, and pressure.
- Price flash and richer offline UX polish.
- Persist favourites locally and validate persisted data when restoring.
- Use selector-based rendering so high-frequency updates do not force unrelated UI to re-render.

## UI reference and Figma mapping

The Pulse Crypto Figma mockup is the official UI/UX source of truth:

https://www.figma.com/design/JYfr5h2vC9IFKtX3vasmZk/Pulse-Crypto-Mockup?node-id=0-1&p=f

Planned workflow (when implementing P0 mobile UI):

- Inspect Figma through Figma MCP before implementing—see [docs/figma-rules.md](docs/figma-rules.md).
- Use exported Figma icons, SVGs, and images; screenshots are fallback only.
- Map required assignment screens first: watchlist, search/filter, favourites, market details, offline/reconnect status, and pull-to-refresh metadata.
- Treat Figma-only items such as Settings, drawer, profile, API-key UI, telemetry, visual shaders, or security-themed surfaces as P1/P2 or future unless the assignment explicitly requires them.
- Do not implement fake functionality just because it appears in the mockup.

## Performance strategy

Planned performance priorities:

- Backend coalesces updates before broadcasting to reduce message volume.
- WebSocket payloads are bounded and predictable.
- Mobile state is partitioned to minimize re-render blast radius.
- Price and order-book animations are brief and state-driven.
- Lists use virtualization when pair count grows beyond the minimum assignment scope.
- Validation avoids expensive work in render paths.

## Offline and reconnect behavior

Implemented mobile behavior:

- Show explicit text connection status.
- Keep rendering the most recently received valid market data while reconnecting or paused.
- Reconnect automatically with bounded exponential backoff and jitter.
- Avoid clearing user favourites or metadata solely because the socket disconnected.
- Allow pull-to-refresh for metadata without closing or replacing an active WebSocket stream.

## Security and trust boundaries

PulseCrypto uses public market data for the assignment. No authentication, profile, account, trading, API-key, or secure-wallet capability is implemented or claimed.

Trust boundaries:

- Binance stream payloads are external and untrusted.
- Backend REST and WebSocket payloads are untrusted by the mobile app until validated.
- Persisted favourites are untrusted on read.
- Environment variables and local config must not be committed.

## Setup and run instructions

Current validation (backend + shared + mobile foundation):

```bash
pnpm install
pnpm typecheck
pnpm test
cd mobile && pnpm dlx expo-doctor
pnpm exec expo install --check
```

Backend development startup:

```bash
pnpm dev:backend
```

Backend Binance ingestion configuration:

```text
BINANCE_ENABLED=false          # Optional; default is true
BINANCE_STREAM_BASE_URL=...    # Optional; default is wss://stream.binance.com:9443
```

Default local endpoints:

```text
HTTP: http://localhost:3000
WebSocket: ws://localhost:3001
```

Mobile foundation startup:

```bash
pnpm dev:backend
pnpm dev:mobile
pnpm --filter @pulsecrypto/mobile android
```

Mobile API configuration:

```text
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
EXPO_PUBLIC_WS_URL=ws://10.0.2.2:3001
```

Set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WS_URL` when launching Metro for Android Emulator development. In development builds, Android falls back to `http://10.0.2.2:3000` and `ws://10.0.2.2:3001` when the variables are unset. iOS Simulator and other local development fall back to `http://127.0.0.1:3000` and `ws://127.0.0.1:3001`. Non-development builds require explicit values and `wss:` for WebSocket transport.

The `android` script binds Metro to IPv4 (`HOST=127.0.0.1`) so `adb reverse` works with Node 22 on macOS. If Expo Go shows the developer menu first, tap **Continue** or reopen **PulseCrypto** from recent history to reach the Markets screen.

Do not leave an orphaned `react-native-reanimated` install in `node_modules` after removing it from `package.json`. `react-native-gesture-handler` will auto-detect it, bundle Reanimated/Worklets, and Expo Go can crash with a native `libworklets.so` SIGSEGV on startup.

The current mobile app loads supported pair metadata on Markets with loading, success, empty, error, and retry states. Markets also supports local search/filter, persisted favourites, metadata pull-to-refresh, validated live WebSocket pricing, explicit connection status, and live 24-hour change. Market details and terminal functionality are not implemented yet.

Mobile run commands require a running Android Emulator or connected device. Android validation confirms Markets renders five supported pairs from the backend with Terminal, Telemetry, and Settings tabs still available.

## Android Emulator networking notes

The mobile app uses `EXPO_PUBLIC_API_BASE_URL` for backend access and `EXPO_PUBLIC_WS_URL` for live market transport. On Android Emulator, development builds fall back to:

```text
http://10.0.2.2:<backend-http-port>
ws://10.0.2.2:<backend-ws-port>
```

When configured with a pathname prefix, the same prefix is preserved for REST calls such as `/pairs/meta`.

Physical devices will need the host machine LAN IP or another reachable endpoint.

## Testing and validation

Current backend test coverage:

- Backend foundation route tests for `GET /health` and `GET /pairs/meta`.
- Market calculation, latest-state store, and snapshot builder unit tests.
- Binance stream-name construction, combined-message parser, reconnect delay policy, and `BinanceStreamClient` behavior tests.
- `MarketBroadcaster` batching, sequence, slow-consumer skip/close, and integration-style snapshot delivery tests.
- `ClientConnectionManager` tracking, heartbeat, and shutdown cleanup tests.

Current mobile test coverage:

- Runtime API base URL and WebSocket URL validation with development fallback behavior.
- HTTP client timeout, abort, and error mapping behavior.
- Pair metadata API contract validation.
- Markets metadata store load, retry, refresh, cancel, deduplication, and stale-response protection tests.
- Live market WebSocket message parsing, lifecycle controller, live store, and formatting tests.
- Pair filter helper tests.
- Favourites repository validation, normalization, and storage failure tests.
- Markets preferences store hydration, toggle, write-ordering, and race-protection tests.

Planned validation layers:

- Market details and order-book mobile integration tests.
- Backend integration tests for local REST and WebSocket interfaces beyond current unit coverage.
- Mobile integration or component tests for market details and richer offline status.
- Manual Android Emulator screen recording for final delivery.

## Trade-offs considered

- Latest-state coalescing sacrifices every-tick fidelity in favor of bounded, UI-friendly updates.
- A local backend gateway keeps mobile code simpler and avoids direct Binance coupling.
- A monorepo improves contract sharing and reviewability for a small assignment, while preserving backend/mobile boundaries.
- Mocked metadata is acceptable by assignment scope, but live or periodically refreshed metadata may be preferable in production.
- Figma fidelity matters, but P0 functional behavior takes precedence over optional visual-only elements.

## AI-assisted development workflow

AI assistance is allowed by the assignment and expected by the role context. Governance is centralized in `AGENTS.md` and `docs/`:

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Non-negotiable agent rules |
| [docs/cursor-development-guide.md](docs/cursor-development-guide.md) | Cursor sessions, ChatGPT review, Living Governance |
| [docs/architecture-principles.md](docs/architecture-principles.md) | Engineering and architecture philosophy |
| [docs/testing-standard.md](docs/testing-standard.md) | Verification and Android/Expo gates |
| [docs/review-checklist.md](docs/review-checklist.md) | Pre-commit review |
| [docs/reporting-template.md](docs/reporting-template.md) | Mandatory task reports, proof artifacts, review ZIP |
| [docs/figma-rules.md](docs/figma-rules.md) | Figma MCP and P0 UI scope |
| [docs/ui-guidelines.md](docs/ui-guidelines.md) | Mobile UI and performance |

ADR-007 summarizes AI guardrails; operational detail lives in the documents above.

## Known limitations and production hardening

Current limitations:

- Backend runtime exposes HTTP foundation routes, Binance ingestion, and WebSocket `market.snapshot.batch` broadcasting with slow-consumer protection.
- Binance ingestion updates market state, and snapshots are broadcast locally to connected clients.
- Mobile foundation includes Markets REST metadata loading, local search/filter, persisted favourites, metadata pull-to-refresh, validated live WebSocket pricing, explicit connection status, bounded reconnect, and Terminal, Telemetry, and Settings placeholder screens.
- Markets `high24h`, `low24h`, and `volume24h` values are backend assignment fixtures, not live exchange data.
- Market details, spread/pressure UI, price flash, and animations are not implemented.
- Favourite controls use temporary text labels until approved Figma assets are exported.
- Android Expo Go launch is confirmed on `emulator-5554`: Markets renders five supported pairs from the backend with Terminal, Telemetry, and Settings tabs still available.
- Tests cover backend foundation routes, market calculation/state/snapshot utilities, Binance ingestion, broadcaster behavior, client connection management, and mobile REST metadata modules.
- No CI exists yet.

Production hardening topics for later:

- Runtime configuration schema and environment validation.
- Observability, metrics, structured logging, and health checks.
- Binance reconnect/resubscribe policy and stream gap handling.
- Rate limits, payload limits, and WebSocket connection caps.
- Contract versioning and compatibility tests.
- Mobile crash reporting and performance instrumentation.
- CI for linting, type checking, tests, and Android build validation.

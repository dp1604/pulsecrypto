# PulseCrypto

PulseCrypto is a practical-assignment project for a Staff Engineer / Mobile Architect role. The final target is a real-time cryptocurrency market viewer with a Node.js + TypeScript backend gateway and a React Native mobile app running on Android Emulator.

This repository currently has shared TypeScript contracts, a backend foundation, pure market-state utilities, Binance ingestion, and WebSocket market snapshot broadcasting. The backend exposes `GET /health`, `GET /pairs/meta`, and a local WebSocket server that sends `connection.ready` and `market.snapshot.batch` messages. React Native scaffolding, mobile screens, and UI components are not implemented yet.

## What this project demonstrates

- Architecture for real-time market data ingestion, processing, and mobile delivery.
- Mobile engineering judgment for smooth rendering under sustained updates.
- Explicit trade-offs around batching, coalescing, offline behavior, and bounded memory.
- Documentation and ADR discipline suitable for senior technical review.
- Controlled AI-assisted development with guardrails against hallucinated APIs, dependency drift, and over-engineering.

## Requirements coverage

| Area | Assignment requirement | Stage |
| --- | --- | --- |
| Backend | Node.js service that bridges Binance public market data to mobile clients | Backend gateway implemented; mobile consumer planned |
| Backend | TypeScript preferred, Express/Fastify or similar, WebSockets | Backend foundation implemented |
| Backend | Subscribe to BTC/USDT, ETH/USDT, SOL/USDT, DOGE/USDT, XRP/USDT | Binance ingestion foundation implemented |
| Backend | Ingest order book updates and batch processed updates | Implemented |
| Backend | Configurable broadcast interval, default 100ms | Implemented |
| Backend | Slow-consumer protection to prevent unbounded memory growth | Implemented |
| Backend | `GET /pairs/meta` metadata endpoint | Implemented with mocked metadata |
| Mobile | React Native app running on Android Emulator | Planned |
| Mobile | Watchlist with pair, price, 24h change, connection indicator, favourite toggle | Planned |
| Mobile | Search/filter pairs | Planned |
| Mobile | Persist and restore favourites locally | Planned |
| Mobile | Market details with price, pressure, spread, bids, asks, timestamp | Planned |
| Mobile | Live updates remain smooth during sustained bursts | Planned |
| Mobile | Offline status, last-known data, automatic reconnect | Planned |
| Mobile | Pull-to-refresh metadata without interrupting WebSocket stream | Planned |
| Delivery | README with setup, architecture, assumptions, trade-offs, AI usage | In progress |

P0 assignment requirements take priority over optional visual details from the Figma mockup.

## Architecture overview

The planned system uses a monorepo with clear ownership boundaries:

- `backend/`: local market gateway foundation. It exposes REST health/metadata routes, a WebSocket server, Binance stream ingestion, market-state utilities, and `market.snapshot.batch` broadcasting with slow-consumer protection.
- `mobile/`: React Native app. It will consume backend REST metadata and WebSocket market batches, persist favourites locally, and render watchlist/details experiences.
- `packages/shared/`: shared contracts and constants only. It must not contain runtime side effects, backend services, mobile stores, or UI code.
- `docs/`: architecture notes, ADRs, validation notes, assumptions, and implementation evidence.

## Repository structure

```text
pulsecrypto/
  backend/                 # Fastify backend foundation and planned market gateway
  mobile/                  # Planned React Native app
  packages/
    shared/                # Planned contracts/constants only
  docs/
    architecture.md        # Architecture blueprint
    decisions/             # ADRs
  AGENTS.md                # AI coding guardrails
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

Planned endpoint:

```http
GET /pairs/meta
```

Planned response shape:

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

Planned mobile responsibilities:

- Fetch pair metadata over REST.
- Subscribe to live market updates over WebSocket.
- Keep connection state separate from pair metadata, live market snapshots, UI filters, and local favourites.
- Persist favourites locally and validate persisted data when restoring.
- Use selector-based rendering so high-frequency updates do not force unrelated UI to re-render.
- Continue showing last-known data when the backend is unavailable.

The mobile app has not been scaffolded yet.

## UI reference and Figma mapping

The Pulse Crypto Figma mockup is the official UI/UX source of truth:

https://www.figma.com/design/JYfr5h2vC9IFKtX3vasmZk/Pulse-Crypto-Mockup?node-id=0-1&p=f

Planned workflow:

- Inspect Figma through Figma MCP or equivalent structured design access when available.
- Use screenshots as a fallback when structured Figma inspection is unavailable.
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

Planned behavior:

- Show explicit connection status.
- Keep rendering the most recently received valid market data.
- Reconnect automatically with bounded retry behavior.
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

Current foundation-only validation:

```bash
pnpm install
pnpm --filter @pulsecrypto/shared typecheck
pnpm --filter @pulsecrypto/backend typecheck
pnpm --filter @pulsecrypto/backend test
node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json valid')"
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

Mobile run commands will be added after the React Native app is intentionally scaffolded.

## Android Emulator networking notes

When the mobile app is implemented, Android Emulator cannot reach the host machine through `localhost` inside the app. The app should use:

```text
http://10.0.2.2:<backend-port>
ws://10.0.2.2:<backend-port>
```

Physical devices will need the host machine LAN IP or another reachable endpoint.

## Testing and validation

Current backend test coverage:

- Backend foundation route tests for `GET /health` and `GET /pairs/meta`.
- Market calculation, latest-state store, and snapshot builder unit tests.
- Binance stream-name construction, combined-message parser, reconnect delay policy, and `BinanceStreamClient` behavior tests.
- `MarketBroadcaster` batching, sequence, slow-consumer skip/close, and integration-style snapshot delivery tests.
- `ClientConnectionManager` tracking, heartbeat, and shutdown cleanup tests.

Planned validation layers:

- Contract validation for REST and WebSocket payloads on mobile.
- Backend integration tests for local REST and WebSocket interfaces beyond current unit coverage.
- Mobile unit tests for stores/selectors and persistence restoration.
- Mobile integration or component tests for watchlist, search, favourites, details, offline status, reconnect, and pull-to-refresh.
- Manual Android Emulator validation and screen recording for final delivery.

## Trade-offs considered

- Latest-state coalescing sacrifices every-tick fidelity in favor of bounded, UI-friendly updates.
- A local backend gateway keeps mobile code simpler and avoids direct Binance coupling.
- A monorepo improves contract sharing and reviewability for a small assignment, while preserving backend/mobile boundaries.
- Mocked metadata is acceptable by assignment scope, but live or periodically refreshed metadata may be preferable in production.
- Figma fidelity matters, but P0 functional behavior takes precedence over optional visual-only elements.

## AI-assisted development workflow

AI assistance is allowed by the assignment and expected by the role context. This repository uses `AGENTS.md` to constrain agent behavior:

- Make small, reviewable changes.
- Verify APIs and package behavior instead of guessing.
- Avoid adding unapproved dependencies.
- Keep generated code aligned with architecture boundaries.
- Validate after each step.
- Report changed files, commands, results, assumptions, and risks.

## Known limitations and production hardening

Current limitations:

- Backend runtime exposes HTTP foundation routes, Binance ingestion, and WebSocket `market.snapshot.batch` broadcasting with slow-consumer protection.
- Binance ingestion updates market state, and snapshots are broadcast locally to connected clients.
- React Native app is not scaffolded.
- UI screens are not implemented.
- Tests cover backend foundation routes, market calculation/state/snapshot utilities, Binance ingestion, broadcaster behavior, and client connection management.
- No CI exists yet.

Production hardening topics for later:

- Runtime configuration schema and environment validation.
- Observability, metrics, structured logging, and health checks.
- Binance reconnect/resubscribe policy and stream gap handling.
- Rate limits, payload limits, and WebSocket connection caps.
- Contract versioning and compatibility tests.
- Mobile crash reporting and performance instrumentation.
- CI for linting, type checking, tests, and Android build validation.

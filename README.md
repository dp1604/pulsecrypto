# PulseCrypto

PulseCrypto is a real-time cryptocurrency market viewer built as a Staff Engineer / Mobile Architect practical assignment. I designed it as a monorepo with a Node.js + TypeScript backend gateway, shared contracts, and a React Native mobile app validated on Android Emulator.

The system separates ingestion cadence, validated application state, and UI publication so sustained market updates remain bounded and responsive. I used AI-assisted engineering tools to accelerate implementation and review while retaining ownership of architecture, scope, quality gates, and final technical decisions.

## What this project demonstrates

- Real-time market-data architecture from Binance public streams through a backend gateway to mobile clients.
- Mobile engineering judgment under sustained updates: one live store, coalesced display publication, selector-based rendering.
- Explicit trade-offs: latest-state delivery, slow-consumer protection, reconnect/last-known behavior, honest deferred scope.
- Documentation and ADR discipline suitable for senior technical review.
- Governed AI-assisted delivery with validation at trust boundaries.

## Assignment scope

| Area | Requirement | Status |
| --- | --- | --- |
| Backend gateway | Node.js service bridging Binance public data | **Implemented** |
| Supported pairs | BTC, ETH, SOL, DOGE, XRP (USDT) | **Implemented** |
| Batching | 100ms latest-state broadcast | **Implemented** |
| Slow-consumer protection | Bounded memory on slow WebSocket clients | **Implemented** |
| Metadata | `GET /pairs/meta` | **Implemented** (fixtures disclosed) |
| Android mobile | React Native on Android Emulator | **Implemented**, release-validated |
| Watchlist | Live prices, 24h change, favourites, search | **Implemented** |
| Market Details | Price, order book, market depth, reconnect | **Implemented** |
| Performance | Evidence under sustained updates | **Validated** with disclosed risk |
| Documentation | Architecture, assumptions, trade-offs, AI disclosure | **Complete** |

P0 assignment requirements take priority over optional Figma-only surfaces.

## Architecture at a glance

```text
Binance public streams
  -> backend validation + latest-state store
  -> 100ms market.snapshot.batch
  -> mobile contract validation
  -> one markets live store
  -> 250ms display publication coalescer
  -> Watchlist batch selector OR Market Details pair selectors
```

Monorepo boundaries:

- `backend/` — REST, WebSocket, Binance ingestion, broadcaster, slow-consumer policy
- `mobile/` — Expo React Native UI, one live store, favourites persistence, connection lifecycle
- `packages/shared/` — contracts and constants only
- `docs/` — architecture, ADRs, validation, handoff

Key engineering decisions I required:

- One authoritative live market-data path (no duplicate sockets or stores)
- Latest-state coalescing instead of unbounded per-tick UI rendering
- 100ms backend publication decoupled from 250ms mobile display publication
- One Watchlist-level store subscription with ten display primitives for five pairs
- Bounded `ScrollView` for five supported pairs
- Pair-specific selectors on Market Details
- Honest placeholders for Settings, Telemetry, and Terminal trading

Current Watchlist UX:

- Bookmark favourite toggle with accessible outline/filled states
- Brief buy/sell text highlighting on displayed-price changes (one list-level timer)
- Directional 24h change colors independent of price-highlight timing
- Market Details retains animated LAST PRICE tick-direction color

## Reliability and performance

Release-runtime profiling on the optimized APK is classified **PASS_WITH_PERFORMANCE_RISK**:

- Zero frozen frames across measured workloads in prior sustained profiling
- Idle sparse Watchlist p99: 23ms (prior evidence)
- Representative mixed Watchlist p99: 113ms with bounded memory (prior evidence)
- Latest UX-polish release APK SHA-256: `06c983fc6b65df6d02506c77d39dbf248c09a19dfb5dc0bdc585deac6c93131f`
- Elevated emulator jank counters acknowledged; frame durations and responsiveness weighed alongside percentage metrics

See [docs/final-validation.md](docs/final-validation.md).

## Setup and validation

```bash
CI=1 pnpm install --frozen-lockfile --reporter=append-only
pnpm typecheck
pnpm test
cd mobile && pnpm dlx expo-doctor
pnpm exec expo install --check
```

Backend:

```bash
pnpm dev:backend
```

Mobile development client (Android AVD workflow):

```bash
pnpm dev:backend
cd mobile
CI=1 EXPO_NO_GIT_STATUS=1 pnpm exec expo prebuild --clean --platform android
CI=1 pnpm exec expo run:android --device PulseCrypto_API_35 --variant debug
```

Generated `mobile/android` and `mobile/ios` are gitignored.

## Testing

- Backend: **65** tests
- Mobile: **453** tests
- Workspace: **518** test executions

## Known limitations and deferred scope

- **iOS** not generated or validated
- **Settings / Telemetry / Terminal trading** — placeholder screens only
- **Metadata high/low/volume** — backend fixtures, labelled in UI
- **CI pipeline** — not implemented
- **Production hardening** — HTTPS/WSS, observability, crash reporting deferred

## AI-assisted engineering disclosure

Dinitha Gamage owned product scope, architecture boundaries, dependency policy, acceptance criteria, validation strategy, and final technical decisions. ChatGPT, Codex, and Cursor were used as AI-assisted engineering tools for alternative exploration, scoped implementation, code-review support, and evidence analysis. Proposed changes were evaluated through source inspection, automated tests, Android runtime validation, release-build verification, and reconciliation of conflicting evidence before adoption.

Full disclosure: [docs/ai-assisted-engineering.md](docs/ai-assisted-engineering.md)

## Reviewer entry points

| Topic | Path |
| --- | --- |
| Architecture blueprint | [docs/architecture.md](docs/architecture.md) |
| ADRs | [docs/decisions/](docs/decisions/) |
| Submission handoff | [docs/submission-handoff.md](docs/submission-handoff.md) |
| Final validation | [docs/final-validation.md](docs/final-validation.md) |
| Backend broadcaster | `backend/src/ws/MarketBroadcaster.ts` |
| Mobile live store + coalescer | `mobile/src/features/markets/marketsLiveStore.ts`, `marketDisplayCoalescer.ts` |
| Watchlist architecture | `mobile/src/features/markets/WatchlistRows.tsx`, `marketMotionPresentation.ts` |
| Market Details | `mobile/src/screens/MarketDetailsScreen.tsx` |

## Trade-offs

- Latest-state coalescing over every-tick UI fidelity
- Backend gateway over direct mobile Binance coupling
- Mocked metadata where assignment scope allows, clearly disclosed
- Bounded five-pair `ScrollView` over premature list virtualization
- Android validation over unverified iOS claims
- Honest placeholders over fake Settings/Telemetry functionality

# Submission Handoff

PulseCrypto practical assignment — reviewer handoff for Dinitha Gamage and independent engineering review.

## Assignment objective

Deliver a real-time cryptocurrency market viewer with:

- Node.js + TypeScript backend gateway bridging Binance public data
- React Native mobile app on Android Emulator
- Watchlist, search, favourites, Market Details, reconnect/offline behavior, and pull-to-refresh
- Bounded memory and rendering under sustained market updates

## Engineering ownership

Dinitha Gamage owned product scope, architecture boundaries, dependency policy, acceptance criteria, validation strategy, and final technical decisions. ChatGPT, Codex, and Cursor were used as AI-assisted engineering tools for alternative exploration, scoped implementation, code-review support, and evidence analysis. Proposed changes were evaluated through source inspection, automated tests, runtime evidence, and artifact reconciliation before adoption.

See [ai-assisted-engineering.md](./ai-assisted-engineering.md).

## Implemented P0 scope

| Area | Status |
| --- | --- |
| Backend gateway (REST + WebSocket) | Implemented |
| Binance ingestion (5 pairs) | Implemented |
| 100ms batching + slow-consumer protection | Implemented |
| Mocked `GET /pairs/meta` | Implemented (fixtures disclosed) |
| Mobile live WebSocket + one live store | Implemented |
| 250ms visual publication coalescing | Implemented |
| Watchlist (5 pairs, search, favourites, refresh) | Implemented |
| Market Details (LAST PRICE, Order Book, Market Depth) | Implemented |
| Reconnect / last-known behavior | Implemented |
| Watchlist bookmark favourite + price-direction text highlight | Implemented |
| Market Details back navigation icon | Implemented |
| Market Depth smooth center join | Implemented |
| Optimized Android release APK | Built and validated |
| Performance evidence | PASS_WITH_PERFORMANCE_RISK |
| Delivery documentation | Complete |

## Deferred scope (intentional)

- Settings and Telemetry functionality (placeholder screens only)
- Figma drawer/profile/API-key/security UI
- Trading execution
- Native memory/GPU telemetry dashboards
- iOS project generation and Simulator validation
- CI pipeline
- Additional trading pairs beyond BTC, ETH, SOL, DOGE, XRP

## Architecture summary

```text
Binance public streams
  -> backend parser + latest-state store
  -> 100ms market.snapshot.batch broadcaster
  -> mobile contract validation
  -> one markets live store
  -> 250ms display coalescer
  -> Watchlist batch selector (1 subscription, 10 primitives)
  -> Market Details pair-specific selectors
  -> Order Book + Market Depth presentation
```

Supporting stores: metadata, favourites, connection lifecycle. Favourites persist in AsyncStorage with validation on read.

## How to run

### Prerequisites

- Node.js 22.x
- pnpm 9.12.3
- Android Emulator API 35 (`emulator-5554` used in validation)
- JDK 17 for native builds when required

### Backend

```bash
pnpm install
pnpm dev:backend
```

Default endpoints:

```text
HTTP:  http://localhost:3000
WS:    ws://localhost:3001
```

### Android development client

```bash
pnpm dev:backend
cd mobile
CI=1 EXPO_NO_GIT_STATUS=1 pnpm exec expo prebuild --clean --platform android
CI=1 pnpm exec expo run:android --device PulseCrypto_API_35 --variant debug
pnpm exec expo start --dev-client --localhost --port 8081
```

Environment for emulator (with `adb reverse`):

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000
EXPO_PUBLIC_WS_URL=ws://127.0.0.1:3001
```

### Optimized release smoke

Validated release APK SHA-256:

`06c983fc6b65df6d02506c77d39dbf248c09a19dfb5dc0bdc585deac6c93131f`

Install when needed; start backend; configure `adb reverse`; launch release app directly (no Metro).

## How to validate

```bash
CI=1 pnpm install --frozen-lockfile --reporter=append-only
pnpm typecheck
pnpm test
pnpm --filter @pulsecrypto/backend test
pnpm --filter @pulsecrypto/mobile exec expo install --check
cd mobile && pnpm dlx expo-doctor
```

Expected: **453** mobile tests, **65** backend tests, **518** workspace executions, Expo Doctor **20/20**.

See [final-validation.md](./final-validation.md) for performance classification and release evidence notes.

## Demo flow (60–90 seconds)

1. Markets LIVE with five pairs and changing prices
2. Search `ETH`, verify filter, clear
3. Toggle bookmark favourite and restore
4. Pull-to-refresh metadata
5. Open BTC/USDT details
6. LAST PRICE and 24-hour direction
7. Scroll Order Book
8. Scroll Market Depth (smooth center join)
9. Back navigation to Markets

## Mocked metadata disclosure

`GET /pairs/meta` returns assignment fixtures for `high24h`, `low24h`, and `volume24h`. These are labeled in UI (`FIXTURE META`) and documentation. Live price, spread, pressure, and order-book levels come from validated WebSocket snapshots.

## Recommended reviewer entry points

| Area | Path |
| --- | --- |
| Backend broadcaster + slow-consumer policy | `backend/src/ws/MarketBroadcaster.ts` |
| Binance parser/reconnect | `backend/src/binance/` |
| Shared market contracts | `packages/shared/src/` |
| Mobile WebSocket controller | `mobile/src/features/markets/marketWebSocketClient.ts` |
| Display coalescer (250ms) | `mobile/src/features/markets/marketDisplayCoalescer.ts` |
| Watchlist batch selector | `mobile/src/features/markets/marketMotionPresentation.ts`, `WatchlistRows.tsx` |
| Price highlight controller | `mobile/src/features/markets/useWatchlistPriceHighlights.ts` |
| Market Details screen | `mobile/src/screens/MarketDetailsScreen.tsx` |
| Order Book presentation | `mobile/src/features/markets/orderBookPresentation.ts` |
| Market Depth presentation | `mobile/src/features/markets/marketDepthPresentation.ts` |
| Architecture ADRs | `docs/decisions/` |

## Related documents

- [README.md](../README.md)
- [architecture.md](./architecture.md)
- [final-validation.md](./final-validation.md)
- [ai-assisted-engineering.md](./ai-assisted-engineering.md)

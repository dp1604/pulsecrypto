# Final Validation

PulseCrypto assignment delivery validation record. This document describes what was verified on the implementation and release runtime, not production deployment readiness.

## Environment

| Component | Version / target |
| --- | --- |
| OS | macOS (darwin) |
| Node.js | 22.23.1 |
| pnpm | 9.12.3 |
| JDK | Homebrew OpenJDK 17 (release APK build) |
| Android NDK | 27.1.12297006 |
| Expo SDK | 57 |
| React Native | 0.86 |
| Android emulator | `emulator-5554` / PulseCrypto_API_35 (Android 15 / API 35) |
| Package | `com.dinithagamage.pulsecrypto` |

## Cadence and architecture invariants

| Layer | Policy |
| --- | --- |
| Backend broadcast | 100ms latest-state batching (`MARKET_BROADCAST_INTERVAL_MS`) |
| Mobile visual publication | 250ms latest-state coalescing (`marketDisplayCoalescer`) |
| Live store | One `useMarketsLiveStore` instance |
| Watchlist subscription | One batch selector (`selectWatchlistDisplayValuesAll`) |
| Watchlist display primitives | Ten (price + 24h change per supported pair) |
| Watchlist container | Bounded `ScrollView` for five supported pairs |
| Watchlist price color | Brief buy/sell text flash on displayed-price change (180ms, one list-level timer) |
| Watchlist favourite | Accessible bookmark icon toggle (outline/filled) |
| Market Details Top App Bar | Back arrow matching `goBack()` |
| Market Depth center join | C1-continuous shared valley; divider behind fills/strokes |
| Watchlist 24h direction | Green/red with ▲/▼ |
| Market Details LAST PRICE | Animated tick-direction text color retained |
| Order Book / Market Depth | Fixed geometry; balanced valley/card spacing |

## Static validation

Release-readiness static gate:

```bash
CI=1 pnpm install --frozen-lockfile --reporter=append-only
pnpm typecheck
pnpm test
pnpm --filter @pulsecrypto/backend test
pnpm --filter @pulsecrypto/mobile exec expo install --check
cd mobile && pnpm dlx expo-doctor
git diff --check
```

Validated baseline:

| Check | Expected |
| --- | --- |
| Mobile tests | 453 |
| Backend tests | 65 |
| Workspace test executions | 518 |
| Typecheck | PASS |
| Frozen install | PASS |
| `expo install --check` | PASS |
| Expo Doctor | 20/20 |

## Runtime validation paths

### Development client

- Expo development build (`expo-dev-client`) on Android Emulator
- Metro bound to IPv4 with `adb reverse` for ports 8081, 3000, and 3001
- Markets LIVE state, search/filter, favourites, pull-to-refresh, and Market Details validated during implementation

### Optimized release APK

| Property | Validated release value |
| --- | --- |
| SHA-256 | `06c983fc6b65df6d02506c77d39dbf248c09a19dfb5dc0bdc585deac6c93131f` |
| ABI | `arm64-v8a` |
| Build type | release |
| Size | 31,264,424 bytes |

Prior baseline APK (pre-UX-polish): `8985e7babce6a343f225be1f6cec4e780a510051110b9e31b191a782b02a2d71`

Release evidence used emulator-local HTTP/WS endpoints and temporary generated-native cleartext settings for local assignment validation only. Generated Android source under `mobile/android/` remains gitignored. This is **not** a production transport configuration.

## Assumptions

- Android Emulator is the validated assignment runtime; iOS is deferred.
- Binance public streams are the live market source.
- Metadata high/low/volume may be fixture-backed and is labelled.
- Telemetry and Settings remain placeholders.
- Performance acceptance uses measured evidence, not unverified claims.

## Reconnect and lifecycle evidence

Validated behaviors:

- Bounded reconnect delay with exponential backoff and jitter
- Foreground/background lifecycle pauses and resumes transport without clearing last-known snapshots
- Connection chip states: `LIVE`, `SYNCING`, `CONNECTING`, `RECONNECTING`, `PAUSED`, `OFFLINE`
- `LAST KNOWN` badge during transient reconnect
- Metadata pull-to-refresh remains REST-only and does not replace the WebSocket stream

## Performance classification

**Overall: PASS_WITH_PERFORMANCE_RISK**

Sustained profiling was completed on optimized release APKs. Workloads are reported separately; do not average them.

| Workload | Frames | p50 | p95/p99 | Max hist | Frozen | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Idle sparse Watchlist | 63 (1.4 fps) | 17ms | p99 23ms | 23ms | 0 | Valid sparse idle |
| Controlled interaction (scroll) | 123 | 27ms | p99 57ms | 61ms | 0 | Responsive |
| Representative mixed Watchlist | 158 | 21ms | p95 69ms / p99 113ms | 150ms | 0 | Tail risk during combined actions |
| BTC Details | 1466 | 29ms | p95 57ms / p99 77ms | 133ms | 0 | Responsive; memory stable |

Latest UX-polish release profiling (idle 45s / interaction 45s): idle p99 **57ms**, interaction p99 **85ms**, **0 frozen frames**, elevated modern jank percentages. Classification remains **PASS_WITH_PERFORMANCE_RISK**.

Supporting observations:

- Zero frozen frames across measured workloads in evidence runs
- Memory remained bounded in mixed and BTC workloads
- Elevated emulator/Android modern-jank counters remain a known performance risk
- No crash, ANR, or proven visual unresponsiveness during evidence runs
- Further optimization deferred rather than falsely claimed complete

Modern jank percentage alone must not be interpreted as failure when frame durations, frozen frames, and visible responsiveness remain acceptable.

## Known limitations

- **iOS:** not generated or validated; Android Emulator is the assignment runtime
- **Settings / Telemetry:** intentional placeholder surfaces only
- **Metadata:** `high24h`, `low24h`, `volume24h` are backend assignment fixtures, not live exchange values
- **Optional Figma surfaces:** drawer, profile, API-key UI, trading, shaders deferred
- **CI:** not implemented
- **Performance risk:** mixed Watchlist tail latency and emulator jank labeling
- **Runtime media:** eight clean screenshots and a 78.1-second H.264 demonstration video are included in the external non-source submission deliverables. Performance figures remain based on the documented optimized-release profiling runs.

## Final Android smoke

Short release-runtime smoke validates:

- backend healthy
- release app foreground LIVE with five pairs
- search
- bookmark favourite toggle and restore
- BTC details with Order Book and Market Depth
- back navigation to Markets

Sustained profiling is not repeated for documentation-only repository changes when executable semantics are unchanged.

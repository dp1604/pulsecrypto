# Final Validation

PulseCrypto assignment delivery validation record. This document describes what was verified on the final implementation and release runtime, not production deployment readiness.

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
| Watchlist price color | Neutral primary text |
| Watchlist 24h direction | Green/red with ▲/▼ |
| Market Details LAST PRICE | Animated tick-direction text color retained |
| Order Book / Market Depth | Unchanged geometry from STEP-16B |

## Static validation

Final delivery static gate (after documentation closure):

```bash
CI=1 pnpm install --frozen-lockfile --reporter=append-only
pnpm typecheck
pnpm test
pnpm --filter @pulsecrypto/backend test
pnpm --filter @pulsecrypto/mobile exec expo install --check
cd mobile && pnpm dlx expo-doctor
git diff --check
```

Expected baseline:

| Check | Expected |
| --- | --- |
| Mobile tests | 435 |
| Backend tests | 65 |
| Workspace test executions | 500 |
| Typecheck | PASS |
| Frozen install | PASS |
| `expo install --check` | PASS |
| Expo Doctor | 20/20 |

## Runtime validation paths

### Development client

- Expo development build (`expo-dev-client`) on Android Emulator
- Metro bound to IPv4 with `adb reverse` for ports 8081, 3000, and 3001
- Markets LIVE state, search/filter, favourites, pull-to-refresh, and Market Details validated during implementation slices

### Optimized release APK

| Property | Value |
| --- | --- |
| SHA-256 | `8985e7babce6a343f225be1f6cec4e780a510051110b9e31b191a782b02a2d71` |
| ABI | `arm64-v8a` |
| Build type | release |
| Source alignment | STEP-16B implementation producing this APK |

Release evidence used emulator-local HTTP/WS endpoints and a temporary generated-native cleartext setting for local assignment validation only. Generated Android source under `mobile/android/` remains gitignored. This is **not** a production transport configuration. Production must use HTTPS/WSS and appropriate Android network-security configuration.

Do not commit an insecure production cleartext configuration merely to reproduce local evidence.

## Reconnect and lifecycle evidence

Validated behaviors:

- Bounded reconnect delay with exponential backoff and jitter
- Foreground/background lifecycle pauses and resumes transport without clearing last-known snapshots
- Connection chip states: `LIVE`, `SYNCING`, `CONNECTING`, `RECONNECTING`, `PAUSED`, `OFFLINE`
- `LAST KNOWN` badge during transient reconnect
- Metadata pull-to-refresh remains REST-only and does not replace the WebSocket stream

## Performance classification

**Overall: PASS_WITH_PERFORMANCE_RISK**

Sustained profiling was completed on the optimized release APK (STEP-16B / STEP-16B-E1 evidence). Workloads are reported separately; do not average them.

| Workload | Frames | p50 | p95/p99 | Max hist | Frozen | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Idle sparse Watchlist | 63 (1.4 fps) | 17ms | p99 23ms | 23ms | 0 | Valid sparse idle; modern jank not sole gate |
| Controlled interaction (scroll) | 123 | 27ms | p99 57ms | 61ms | 0 | Responsive |
| Representative mixed Watchlist | 158 | 21ms | p95 69ms / p99 113ms | 150ms | 0 | Tail risk during combined actions |
| BTC Details | 1466 | 29ms | p95 57ms / p99 77ms | 133ms | 0 | Responsive; memory stable |

Supporting observations:

- Zero frozen frames across measured workloads
- Memory remained bounded (mixed growth ~5276 KB; BTC stable)
- Interaction and BTC p99 remained below 100ms
- Mixed Watchlist p99 reached 113ms during deliberate combined interaction (scroll + search + refresh)
- Elevated emulator/Android modern-jank counters remain a known performance risk
- No crash, ANR, or proven visual unresponsiveness during evidence runs
- Further optimization is deferred rather than falsely claimed complete

Modern jank percentage alone must not be interpreted as failure when frame durations, frozen frames, and visible responsiveness remain acceptable.

## Known limitations

- **iOS:** not generated or validated; Android Emulator is the assignment runtime
- **Settings / Telemetry:** intentional placeholder surfaces only
- **Metadata:** `high24h`, `low24h`, `volume24h` are backend assignment fixtures, not live exchange values
- **Optional Figma surfaces:** drawer, profile, API-key UI, trading, shaders deferred
- **CI:** not implemented
- **Performance risk:** mixed Watchlist tail latency and emulator jank labeling

## Final Android smoke (STEP-17A)

One short release-runtime smoke validates:

- backend healthy
- release app foreground LIVE with five pairs
- search
- favourite toggle and restore
- BTC details with Order Book and Market Depth
- return to Markets

No sustained profiling is repeated in STEP-17A.

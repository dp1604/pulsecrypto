# PulseCrypto Setup, Build, and Run Guide

Self-contained instructions for cloning, validating, building, and running PulseCrypto on supported development hosts. Android Emulator is the mandatory validated mobile target for this assignment.

## 1. Purpose and supported scope

PulseCrypto is a pnpm monorepo with three application areas:

| Area | Path | Role |
| --- | --- | --- |
| Backend gateway | `backend/` | REST, WebSocket, Binance ingestion, 100ms snapshot broadcasting |
| Mobile app | `mobile/` | Expo React Native client with one live store and 250ms display coalescing |
| Shared contracts | `packages/shared/` | Pair symbols, schemas, and constants only |

The backend consumes **public Binance market data**. Supplementary `GET /pairs/meta` information for `high24h`, `low24h`, and `volume24h` is **fixture-backed** and disclosed in the UI (`FIXTURE META`) and documentation.

**Validated mobile target:** Android Emulator (API 35 used in assignment validation).

**Optional and not validated:** iOS Simulator and physical-device workflows are documented for completeness but are not claimed as assignment-validated unless direct evidence exists in the repository.

**Docker:** No Docker setup is required. This repository does not ship a Docker workflow.

## 2. Supported host environments

| Host | Backend & tests | Android native build | Android Emulator | Shell in examples | Validation status |
| --- | --- | --- | --- | --- | --- |
| macOS | Supported | Supported | Supported (Android Studio) | Bash / zsh | **Validated** on macOS with Android Emulator |
| Windows 10/11 | Supported | Supported with Android Studio | Supported with virtualization enabled | PowerShell | Expected to work; **not independently validated on this host** |
| Linux (Ubuntu/Debian-based preferred) | Supported | Supported with Android Studio | Supported with KVM | Bash | Expected to work; **not independently validated on this host** |
| WSL | Supported for Node, backend, and tests | Not recommended | Not recommended as primary Emulator host | Bash inside WSL | Backend/tests only; use Windows Android Studio for Emulator |
| iOS (macOS + Xcode) | N/A for iOS build host | N/A | iOS Simulator optional | zsh | **Not validated** for this assignment |

**JDK requirement:** Android native builds require **JDK 17**. An independent review environment observed Android native build failures with **JDK 25**. Use JDK 17 for Gradle and Expo native builds.

**WSL caveat:** WSL is suitable for installing dependencies, running typecheck/tests, and starting the backend. Android Emulator and native Gradle builds should run on the Windows host with Android Studio, not inside WSL, unless you have a deliberately configured cross-host workflow.

**iOS caveat:** iOS requires macOS and Xcode. iOS has **not** been validated for this assignment.

## 3. Prerequisites

Derive versions from the repository and validated environment record in [final-validation.md](./final-validation.md).

| Tool | Requirement | Notes |
| --- | --- | --- |
| Git | Recent version | Clone and verify commit |
| Node.js | 22.x used in validation | Expo SDK 57 ecosystem expects a current Node LTS/Current |
| Corepack | Enabled | Activates repository-declared pnpm |
| pnpm | **9.12.3** (`packageManager` in root `package.json`) | Do not upgrade casually |
| JDK | **17** for Android native builds | Required for `expo prebuild`, `expo run:android`, and Gradle |
| Android Studio | Current stable | SDK Manager, Device Manager, Emulator |
| Android SDK | Platform matching your AVD | API 35 used in assignment validation |
| Android Build Tools | Installed via SDK Manager | Required by Gradle |
| Android Emulator | Phone AVD | Any compatible name; `PulseCrypto_API_35` was used in validation |
| ADB | Platform tools | Device verification and APK install |
| Xcode | Optional | macOS only; iOS optional and unvalidated |

### Verification commands

**macOS / Linux / WSL (Bash or zsh):**

```bash
git --version
node --version
corepack --version
pnpm --version
java -version
adb version
```

**Windows PowerShell:**

```powershell
git --version
node --version
corepack --version
pnpm --version
java -version
adb version
```

Confirm `java -version` reports **17** before native Android builds. A global `java` from another JDK does not override Gradle unless `JAVA_HOME` is set correctly for the build session.

This project uses `pnpm exec expo` and `pnpm dlx expo-doctor`. A globally installed Expo CLI is **not** required.

## 4. Clone the repository

### HTTPS

```bash
git clone https://github.com/dp1604/pulsecrypto.git
cd pulsecrypto
```

### SSH

```bash
git clone git@github.com:dp1604/pulsecrypto.git
cd pulsecrypto
```

### Verify clone state

```bash
git branch --show-current
git rev-parse HEAD
git status --short
git remote -v
```

Expected:

- branch: `main`
- remote: `https://github.com/dp1604/pulsecrypto.git` or `git@github.com:dp1604/pulsecrypto.git`

**Commit guidance:**

- The assignment implementation commit at the time this guide was added is recorded in repository history after you pull latest `main`.
- Do **not** hard-code an obsolete SHA in local notes. Record the commit you actually cloned with `git rev-parse HEAD`.
- Distinguish between the implementation baseline you are reviewing and any later documentation-only commits on `main`.

## 5. Install dependencies

### macOS / Linux / WSL (Bash or zsh)

```bash
corepack enable
CI=1 pnpm install --frozen-lockfile --reporter=append-only
```

### Windows PowerShell

```powershell
corepack enable
$env:CI = "1"
pnpm install --frozen-lockfile --reporter=append-only
Remove-Item Env:CI
```

### Troubleshooting

| Symptom | Likely cause | Safe remediation |
| --- | --- | --- |
| `ERR_PNPM_UNSUPPORTED_ENGINE` or Node errors | Unsupported Node version | Install Node 22.x or another version compatible with Expo SDK 57, then retry |
| Lockfile mismatch | Local `pnpm-lock.yaml` edited or wrong pnpm version | Use `corepack enable` and pnpm **9.12.3**; do **not** regenerate the lockfile as the default fix |
| Wrong pnpm version | Corepack not enabled | Run `corepack enable` and `corepack prepare pnpm@9.12.3 --activate` |
| Permission errors | Global install permissions | Avoid `sudo npm -g`; install Node through a version manager or official installer |
| Stale `node_modules` | Interrupted install | Delete `node_modules` at repo root and in workspaces, then rerun frozen install |

## 6. Validate the source before running

Run the static validation sequence from the repository root:

```bash
CI=1 pnpm install --frozen-lockfile --reporter=append-only
pnpm typecheck
pnpm test
pnpm --filter @pulsecrypto/mobile typecheck
pnpm --filter @pulsecrypto/backend test
pnpm --filter @pulsecrypto/mobile exec expo install --check
cd mobile
pnpm dlx expo-doctor
cd ..
git diff --check
```

Record the **actual** counts from your run. Prior validated baseline (see [final-validation.md](./final-validation.md)):

| Check | Prior validated baseline |
| --- | --- |
| Mobile tests | 453 |
| Backend tests | 65 |
| Workspace test executions | 518 |
| Expo Doctor | 20/20 |

If your counts differ after pulling a newer commit, treat your local run as source of truth and inspect release notes or commit history.

## 7. Start the backend

### Default ports

| Service | Default port | Environment variable |
| --- | ---: | --- |
| HTTP REST | 3000 | `HTTP_PORT` |
| WebSocket | 3001 | `WS_PORT` |

Other backend environment variables parsed in `backend/src/config/env.ts`:

| Variable | Default | Purpose |
| --- | --- | --- |
| `HOST` | `0.0.0.0` | Bind address for HTTP and WebSocket servers |
| `MARKET_BROADCAST_INTERVAL_MS` | `100` | Snapshot broadcast interval |
| `WS_MAX_BUFFERED_AMOUNT_BYTES` | `1000000` | Slow-consumer buffer threshold |
| `WS_MAX_CONSECUTIVE_SLOW_TICKS` | `5` | Consecutive slow ticks before client close |
| `WS_HEARTBEAT_INTERVAL_MS` | `30000` | WebSocket heartbeat interval |
| `BINANCE_ENABLED` | `true` | Disable with `0`, `false`, `no`, or `off` |
| `BINANCE_STREAM_BASE_URL` | Binance default | Optional override for stream base URL |

### Start with default ports

**macOS / Linux / WSL:**

```bash
pnpm dev:backend
```

**Windows PowerShell:**

```powershell
pnpm dev:backend
```

### Start with alternate ports

**macOS / Linux / WSL:**

```bash
HTTP_PORT=3010 WS_PORT=3011 pnpm dev:backend
```

**Windows PowerShell:**

```powershell
$env:HTTP_PORT = "3010"
$env:WS_PORT = "3011"
pnpm dev:backend
```

When alternate ports are used, mobile `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WS_URL` must use the **same** ports.

### Expected startup output

On success the backend logs a message equivalent to:

```text
PulseCrypto backend foundation started
```

with fields including `httpPort`, `wsPort`, and `marketBroadcastIntervalMs`. The process also begins Binance stream ingestion when `BINANCE_ENABLED` is true.

### Verify REST endpoints

**macOS / Linux / WSL:**

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/pairs/meta
```

**Windows PowerShell:**

```powershell
Invoke-RestMethod http://127.0.0.1:3000/health
Invoke-RestMethod http://127.0.0.1:3000/pairs/meta
```

**`/health` success response:**

```json
{"status":"ok","service":"pulsecrypto-backend"}
```

**`/pairs/meta` response:**

Returns five supported pairs with display names, trading status, and fixture-backed `high24h`, `low24h`, and `volume24h` from `backend/src/config/pairs.ts`. Live prices, spread, pressure, and order-book levels come from WebSocket snapshots, not this endpoint.

### Port already in use (`EADDRINUSE`)

Symptom: backend exits or logs bind failure on port 3000 or 3001.

Diagnostic:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
Get-NetTCPConnection -LocalPort 3001 -State Listen
```

Remediation: start the backend on alternate ports (see above). **Do not** terminate unrelated processes occupying default ports unless you own them and understand the impact.

## 8. Configure mobile backend URLs

Mobile configuration is resolved in `mobile/src/config/runtimeConfig.ts` from:

| Variable | Required when | Purpose |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | Non-development builds | HTTP base URL |
| `EXPO_PUBLIC_WS_URL` | Non-development builds | WebSocket URL |

In `__DEV__` builds, when these variables are unset, defaults are chosen by platform in `mobile/src/config/apiBaseUrl.ts` and `mobile/src/config/webSocketUrl.ts`:

| Runtime | Default HTTP | Default WebSocket |
| --- | --- | --- |
| Android Emulator | `http://10.0.2.2:3000` | `ws://10.0.2.2:3001` |
| iOS Simulator / other dev | `http://127.0.0.1:3000` | `ws://127.0.0.1:3001` |

### Host mapping rules

| Target | HTTP / WS host | Notes |
| --- | --- | --- |
| Android Emulator | `10.0.2.2` | Maps to the development host; `127.0.0.1` inside the emulator is the emulator itself |
| iOS Simulator | `127.0.0.1` | Backend on the same Mac |
| Physical Android or iPhone | Host machine LAN IP or remote endpoint | Phone `127.0.0.1` is the phone, not your computer |
| Production deployment | HTTPS / WSS endpoint | Not assignment-validated; requires operational hardening |

Custom backend ports must be reflected in both mobile variables.

### Examples for Android Emulator with default ports

Usually **no variables are required** in development because Android defaults to `10.0.2.2`.

### Examples for alternate ports

**macOS / Linux / WSL:**

```bash
export EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3010
export EXPO_PUBLIC_WS_URL=ws://10.0.2.2:3011
```

**Windows PowerShell:**

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:3010"
$env:EXPO_PUBLIC_WS_URL = "ws://10.0.2.2:3011"
```

### `adb reverse` workflow (development client)

When using `127.0.0.1` URLs with a development build, reverse emulator ports to the host:

```bash
adb reverse tcp:3000 tcp:3000
adb reverse tcp:3001 tcp:3001
adb reverse tcp:8081 tcp:8081
```

Then you may set:

```bash
export EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000
export EXPO_PUBLIC_WS_URL=ws://127.0.0.1:3001
```

Release APK validation in this project used emulator-local endpoints with temporary generated-native cleartext settings for local assignment validation only. That is not a production transport configuration.

## 9. Create and start an Android Emulator

1. Open **Android Studio**.
2. Open **Device Manager**.
3. Create a phone virtual device with a recent API image. API **35** was used in assignment validation.
4. Start the emulator.
5. Verify connectivity:

```bash
adb devices
```

Expected: one device such as `emulator-5554` in `device` state.

### Platform notes

| Platform | Note |
| --- | --- |
| macOS Apple Silicon | Use ARM64 system images for best performance |
| macOS Intel | x86_64 images are typical |
| Windows | Enable virtualization (WHPX/Hyper-V) in BIOS/OS |
| Linux | KVM should be enabled for acceptable Emulator performance |
| WSL | Do not treat WSL as the primary Emulator host; run Emulator from Windows or native Linux desktop |

No specific AVD name is mandatory. Replace `PulseCrypto_API_35` in examples with your own AVD name or serial from `adb devices`.

## 10. Run the Android app

**JDK 17 is required** for native Android builds.

### First native development build

Use **terminal 1** for the backend:

```bash
pnpm dev:backend
```

Use **terminal 2** from repository root:

```bash
cd mobile
CI=1 EXPO_NO_GIT_STATUS=1 pnpm exec expo prebuild --clean --platform android
CI=1 pnpm exec expo run:android --device <your-avd-name-or-serial> --variant debug
```

What this workflow does:

| Step | Effect |
| --- | --- |
| `expo prebuild --clean --platform android` | Generates ignored native project under `mobile/android/` |
| `expo run:android` | Resolves Gradle dependencies, compiles native code, installs a **development client**, starts Metro as needed, and launches the app |
| Generated `mobile/android` | Gitignored; safe to delete and regenerate |

Set `JAVA_HOME` to JDK 17 for the native build session when your default `java` is not 17.

**Windows PowerShell prebuild/run example:**

```powershell
cd mobile
$env:CI = "1"
$env:EXPO_NO_GIT_STATUS = "1"
pnpm exec expo prebuild --clean --platform android
pnpm exec expo run:android --device <your-avd-name-or-serial> --variant debug
```

### Expected UI after launch

- **Markets** tab visible by default
- Connection chip shows **LIVE** when backend and Binance ingestion are healthy
- Five supported pairs: BTC, ETH, SOL, DOGE, XRP
- Search, favourites, pull-to-refresh
- **Market Details** with spread, pressure, Order Book, and Market Depth
- Back navigation to Markets

## 11. Run an existing development build

After a development client is installed on the emulator, subsequent JavaScript-only work can use Metro without repeating the full native compile when native dependencies have not changed.

**Terminal 1:** backend

```bash
pnpm dev:backend
```

**Terminal 2:** Metro dev client

```bash
cd mobile
pnpm exec expo start --dev-client --localhost --port 8081
```

Or from repository root:

```bash
pnpm dev:mobile
```

Then open the installed dev client on the emulator and connect to Metro.

| Workflow | When to use |
| --- | --- |
| First native build | `expo prebuild` + `expo run:android` |
| Subsequent JS-only changes | `expo start --dev-client` |
| Expo Go | **Not** the validated assignment runtime |
| Expo development client | **Validated** assignment development runtime |

## 12. Build the Android assignment APK

The supported optimized release workflow used in assignment validation is a **Gradle release assemble** after `expo prebuild`, not Play Store production signing.

### Build steps

1. Ensure `mobile/android/` exists (`expo prebuild` as in section 10).
2. Set `JAVA_HOME` to JDK 17.
3. Optionally set release env URLs for the emulator host mapping you will use.
4. Run Gradle assemble release for `arm64-v8a`.

**macOS / Linux:**

```bash
cd mobile
CI=1 EXPO_NO_GIT_STATUS=1 pnpm exec expo prebuild --clean --platform android

cd android
export JAVA_HOME=<path-to-jdk-17>
export EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
export EXPO_PUBLIC_WS_URL=ws://10.0.2.2:3001
./gradlew :app:assembleRelease -x lint -x test --no-daemon --console=plain -PreactNativeArchitectures=arm64-v8a
```

**Windows PowerShell:**

```powershell
cd mobile
$env:CI = "1"
$env:EXPO_NO_GIT_STATUS = "1"
pnpm exec expo prebuild --clean --platform android

cd android
$env:JAVA_HOME = "<path-to-jdk-17>"
$env:EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:3000"
$env:EXPO_PUBLIC_WS_URL = "ws://10.0.2.2:3001"
.\gradlew :app:assembleRelease -x lint -x test --no-daemon --console=plain -PreactNativeArchitectures=arm64-v8a
```

### Artifact characteristics

| Property | Expected |
| --- | --- |
| Output path | `mobile/android/app/build/outputs/apk/release/app-release.apk` |
| Package identifier | `com.dinithagamage.pulsecrypto` |
| ABI in validated build | `arm64-v8a` |
| Build type | `release` Gradle variant |
| Signing | Development/debug signing from generated native project, **not** Play Store production signing |

The assignment APK may be release-mode or optimized while still being signed using a development certificate. It must **not** be represented as a Play Store production-signed artifact.

A new local build does **not** need to reproduce a historical APK SHA-256 unless you have proven deterministic build inputs. The validated assignment APK SHA-256 is recorded in [final-validation.md](./final-validation.md) for reference only.

### Compute SHA-256

**macOS / Linux:**

```bash
shasum -a 256 mobile/android/app/build/outputs/apk/release/app-release.apk
```

**Windows PowerShell:**

```powershell
Get-FileHash mobile/android/app/build/outputs/apk/release/app-release.apk -Algorithm SHA256
```

## 13. Install and launch an APK

```bash
adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk
```

Other useful commands:

```bash
adb uninstall com.dinithagamage.pulsecrypto
adb shell pm list packages | grep pulsecrypto
adb shell am start -n com.dinithagamage.pulsecrypto/.MainActivity
adb logcat -s ReactNativeJS ReactNative
```

Common install failures:

| Symptom | Likely cause |
| --- | --- |
| `INSTALL_FAILED_NO_MATCHING_ABIS` | APK built for `arm64-v8a` but emulator image is x86-only |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | Different signing key than installed app | Run `adb uninstall` first |
| App offline immediately | Backend not running or wrong URL/port mapping | Verify backend health and mobile URL configuration |

## 14. Optional iOS instructions

iOS is optional and **not validated** for this assignment.

Requirements:

- macOS host
- Xcode installed
- CocoaPods available through Expo prebuild when needed

Example:

```bash
cd mobile
pnpm exec expo run:ios
```

Use `127.0.0.1` for a backend running on the same Mac. Physical-device networking requires the host LAN IP or a reachable remote endpoint.

Do not imply TestFlight, App Store, or production iOS delivery readiness.

## 15. Runtime verification checklist

Manual checklist after backend and app are running:

- [ ] Backend `/health` returns `ok`
- [ ] Backend shows Binance stream activity in logs
- [ ] Markets shows five supported pairs
- [ ] Prices change over time
- [ ] 24-hour change values render
- [ ] Search filters pairs
- [ ] Clear search restores full list
- [ ] Favourite bookmark toggles on/off
- [ ] Favourite restores after app reload or restart
- [ ] Pull-to-refresh updates fixture metadata labels
- [ ] Market Details opens for a pair
- [ ] Spread and pressure render
- [ ] Bids and asks visible in Order Book
- [ ] Market Depth renders with center join
- [ ] Back navigation returns to Markets
- [ ] Backend stop shows offline / last-known behavior
- [ ] Last-known values remain visible while disconnected
- [ ] Automatic reconnect returns to LIVE — **requires explicit runtime verification**

**Reconnect caveat:** An independent Android debug-runtime review observed one case where the app retained last-known values and entered RECONNECTING but did not return to LIVE after the backend restarted on alternate local ports. The reconnect path therefore requires explicit runtime verification and must not be treated as proven solely by unit tests.

## 16. Stop and clean up

| Action | Command |
| --- | --- |
| Stop Metro | `Ctrl+C` in Metro terminal |
| Stop backend | `Ctrl+C` in backend terminal |
| Close emulator | Close Emulator window or `adb emu kill` |
| Inspect occupied ports | `lsof` / `Get-NetTCPConnection` as in section 7 |
| Remove generated native project | `rm -rf mobile/android mobile/ios` when regeneration is needed |
| Clean Android build outputs | `cd mobile/android && ./gradlew clean` |
| Preserve lockfile | Do **not** delete or regenerate `pnpm-lock.yaml` casually |

Terminate only processes you started for this review session.

## 17. Troubleshooting

### JDK mismatch

- **Symptom:** Gradle fails with Java/toolchain errors.
- **Diagnostic:** `java -version`, `echo $JAVA_HOME`
- **Remediation:** Point `JAVA_HOME` to JDK 17 for the build command only.

### Android SDK not found

- **Symptom:** `sdkmanager`, Gradle, or Expo cannot locate SDK.
- **Diagnostic:** `echo $ANDROID_HOME` / `echo $ANDROID_SDK_ROOT`
- **Remediation:** Set `ANDROID_HOME` and `ANDROID_SDK_ROOT` to your Android SDK path.

### No emulator/device detected

- **Symptom:** `expo run:android` or `adb install` reports no devices.
- **Diagnostic:** `adb devices`
- **Remediation:** Start an AVD from Android Studio; accept emulator authorization if prompted.

### Mobile remains offline with backend healthy

- **Symptom:** Connection chip stays OFFLINE/RECONNECTING.
- **Likely cause:** Wrong host mapping or port mismatch.
- **Diagnostic:** Confirm `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WS_URL`; on Android Emulator prefer `10.0.2.2` unless using `adb reverse`.
- **Remediation:** Align ports with `HTTP_PORT` and `WS_PORT`; restart Metro after env changes.

### Backend cannot reach Binance

- **Symptom:** Backend runs but market snapshots never update.
- **Diagnostic:** Backend logs; outbound network restrictions.
- **Remediation:** Allow outbound HTTPS/WSS to Binance public endpoints; check `BINANCE_ENABLED`.

### Metro cache issues

- **Symptom:** Stale bundle or unexplained JS errors after dependency changes.
- **Remediation:** `cd mobile && pnpm exec expo start --dev-client --clear`

### Gradle cache issues

- **Symptom:** Native build failures after interrupted compile.
- **Remediation:** `cd mobile/android && ./gradlew clean`, then rebuild.

### PowerShell environment-variable syntax

- **Symptom:** Env vars not visible to child process.
- **Remediation:** Use `$env:NAME = "value"` in the same PowerShell session before `pnpm` or `gradlew`.

### Linux virtualization

- **Symptom:** Emulator extremely slow or fails to start.
- **Remediation:** Enable KVM; use ARM64 images on ARM hosts.

### Windows firewall

- **Symptom:** Physical device or emulator cannot reach backend ports.
- **Remediation:** Allow Node/Metro/Java inbound on private network for local development only.

### Physical-device LAN access

- **Symptom:** Phone cannot reach backend.
- **Remediation:** Use host machine LAN IP in `EXPO_PUBLIC_*` URLs; ensure same Wi-Fi network and open ports.

### Reconnect remains stuck

- **Symptom:** RECONNECTING persists after backend restart.
- **Remediation:** Verify WebSocket URL and port match the restarted backend; perform full runtime reconnect test; capture `adb logcat` and backend logs.

### Fixture metadata confusion

- **Symptom:** High/low/volume do not match exchange websites.
- **Explanation:** `GET /pairs/meta` returns assignment fixtures by design. Live values come from WebSocket snapshots.

## 18. Known scope boundaries

- Android Emulator is the required validated target for assignment review.
- iOS is optional and unvalidated.
- Production signing and store delivery are outside assignment scope.
- Fixture metadata is static for `high24h`, `low24h`, and `volume24h`.
- Public market data does not require application authentication.
- Production deployment would require HTTPS/WSS, observability, and operational hardening.
- **CI pipeline:** not implemented in this repository.
- Native modules beyond the Expo/React Native dependency set were not an additional assignment requirement; the accepted runtime is an Expo development client and optimized local release APK.

## Related documents

- [README.md](../README.md)
- [ai-reviewer-setup-build-run.md](./ai-reviewer-setup-build-run.md)
- [submission-handoff.md](./submission-handoff.md)
- [final-validation.md](./final-validation.md)
- [architecture.md](./architecture.md)

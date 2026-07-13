# PulseCrypto AI Reviewer Setup, Build, and Runtime Guide

Deterministic instructions for an AI coding or reviewing agent evaluating PulseCrypto from a **fresh disposable clone**. A human reviewer should be able to say:

> Clone the repository into a fresh disposable directory and follow `docs/ai-reviewer-setup-build-run.md` exactly. Do not use pre-existing local PulseCrypto files or previous review context.

## 1. AI operating contract

The AI agent **must**:

1. Use a **fresh disposable clone** in a new directory.
2. Retrieve source from `https://github.com/dp1604/pulsecrypto`.
3. Record the reviewed branch and commit with `git rev-parse HEAD`.
4. **Not** use an existing local PulseCrypto checkout, source ZIP, or deliverables ZIP.
5. **Not** inspect prior reviewer reports, evidence ZIPs, or conversation logs.
6. **Not** modify tracked project files.
7. Permit generated ignored build artifacts only (`node_modules`, `.expo`, `mobile/android`, `mobile/ios`, build outputs).
8. Distinguish environment failures from product failures.
9. Preserve complete logs as review artifacts and include the relevant command, exit status, and key output excerpts in the final report.
10. Clean up **only task-owned processes** started during this review.

The AI agent **must not** silently substitute tools, Node versions, pnpm versions, or JDK versions.

## 2. Evidence boundary

### Allowed evidence

- Remote GitHub repository content at the reviewed commit
- Repository `README.md` and `docs/`
- Assignment/job-description attachments explicitly supplied by the reviewer
- Commands executed from the fresh clone
- Runtime outputs generated during this review session

### Forbidden evidence

- Existing local PulseCrypto directories
- Pre-existing APKs unless explicitly attached by the reviewer for comparison
- Prior screenshots or demo videos unless explicitly attached
- Prior evidence ZIPs or validation summaries
- Previous AI conclusions or internal prompts
- Local submission-deliverables folders outside the fresh clone

### Remote access failure

If anonymous or authenticated clone access fails, report:

```text
BLOCKED — REMOTE REPOSITORY INACCESSIBLE
```

Do **not** fall back to local source trees, ZIP archives, or cached checkouts.

## 3. Environment detection

Before installation, detect and report:

| Item | Command examples |
| --- | --- |
| Operating system | `uname -a` (Unix), `systeminfo` or `$PSVersionTable` (Windows) |
| CPU architecture | `uname -m`, `(Get-CimInstance Win32_Processor).Architecture` |
| Shell | `echo $0`, `$PSVersionTable.PSVersion` |
| Git | `git --version` |
| Node | `node --version` |
| Corepack | `corepack --version` |
| pnpm | `pnpm --version` after `corepack enable` |
| Java | `java -version` |
| Android SDK | `echo $ANDROID_HOME`, `adb version` |
| Emulator availability | `adb devices` |
| Xcode (optional) | `xcodebuild -version` on macOS |
| Occupied default ports | `lsof` / `Get-NetTCPConnection` for 3000, 3001, 8081 |

Record every value in the final report.

## 4. Toolchain gate

Require before Android work:

| Gate | Requirement |
| --- | --- |
| Node | Compatible with Expo SDK 57; validation used Node 22.x |
| pnpm | **9.12.3** from root `package.json` `packageManager` field |
| JDK | **17** for Android native builds |
| Android SDK | Present for Emulator/native builds |

### Java is not JDK 17

1. Search for an installed JDK 17.
2. Set `JAVA_HOME` only for task-owned Gradle/Expo commands.
3. Do **not** alter global machine settings without explicit reviewer permission.
4. Record the intervention in the final report.

JDK 25 caused Android native build failures in an independent review environment. Do not proceed with Android native builds on non-17 Java without documenting the risk.

## 5. Fresh-clone procedure

Use a disposable parent directory. Example:

```bash
REVIEW_ROOT="$(mktemp -d /tmp/pulsecrypto-ai-review.XXXXXX)"
git clone https://github.com/dp1604/pulsecrypto.git "$REVIEW_ROOT/pulsecrypto"
cd "$REVIEW_ROOT/pulsecrypto"
```

Verification commands:

```bash
git remote -v
git branch --show-current
git rev-parse HEAD
git status --short
```

Requirements:

- `origin` points at `https://github.com/dp1604/pulsecrypto.git` or equivalent SSH remote
- branch is `main` unless reviewer specifies otherwise
- `git status --short` is empty before review commands begin
- no submodule assumptions unless `.gitmodules` exists

Record the commit SHA. Do not assume a historical SHA from documentation.

## 6. Dependency installation

### Bash / zsh

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

Requirements:

- frozen lockfile only
- no dependency updates
- no lockfile regeneration
- capture full install output
- bounded timeout: fail with `BLOCKED_BY_ENVIRONMENT` if install exceeds 15 minutes without progress

## 7. Static validation

Run from repository root and record exact counts:

```bash
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

Report actual test counts. Prior validated baseline for reference only:

- mobile: 453
- backend: 65
- workspace executions: 518
- Expo Doctor: 20/20

If counts differ, report what you observed; do not copy stale numbers.

## 8. Backend execution

### Select ports first

Before starting the backend, choose and record:

- `<selected-http-port>`
- `<selected-ws-port>`

Use defaults **3000** and **3001** when free. If occupied, choose bounded alternates (for example **3010** / **3011**) and use those values consistently in every later step.

**Bash / zsh:**

```bash
SELECTED_HTTP_PORT=3000
SELECTED_WS_PORT=3001
```

**PowerShell:**

```powershell
$SelectedHttpPort = 3000
$SelectedWsPort = 3001
```

### Procedure

1. Check whether default ports **3000** and **3001** are free.
2. Set `SELECTED_HTTP_PORT` / `SELECTED_WS_PORT` (or `$SelectedHttpPort` / `$SelectedWsPort`) to defaults or alternates.
3. Export matching mobile `EXPO_PUBLIC_*` URLs before Android launch using the selected ports.
4. Start **one** task-owned backend with the selected ports.
5. Wait up to **30 seconds** for readiness.
6. Verify `GET /health` on the selected HTTP port.
7. Verify `GET /pairs/meta` on the selected HTTP port returns five pairs.
8. Verify at least one valid live WebSocket batch on `ws://127.0.0.1:<selected-ws-port>` containing all five supported pairs.
9. Measure a short publication-cadence sample (~2 seconds) and note approximate batch interval near **100ms**.
10. Save backend logs to the review artifact directory.

### Default start (Bash / zsh)

```bash
SELECTED_HTTP_PORT=3000
SELECTED_WS_PORT=3001
pnpm dev:backend
```

### Default start (PowerShell)

```powershell
$SelectedHttpPort = 3000
$SelectedWsPort = 3001
$env:HTTP_PORT = "$SelectedHttpPort"
$env:WS_PORT = "$SelectedWsPort"
pnpm dev:backend
```

### Alternate ports (Bash / zsh)

```bash
SELECTED_HTTP_PORT=3010
SELECTED_WS_PORT=3011
HTTP_PORT=$SELECTED_HTTP_PORT WS_PORT=$SELECTED_WS_PORT pnpm dev:backend
```

### Alternate ports (PowerShell)

```powershell
$SelectedHttpPort = 3010
$SelectedWsPort = 3011
$env:HTTP_PORT = "$SelectedHttpPort"
$env:WS_PORT = "$SelectedWsPort"
pnpm dev:backend
```

### REST verification (Bash / zsh)

```bash
curl http://127.0.0.1:$SELECTED_HTTP_PORT/health
curl http://127.0.0.1:$SELECTED_HTTP_PORT/pairs/meta
```

### REST verification (PowerShell)

```powershell
Invoke-RestMethod "http://127.0.0.1:$SelectedHttpPort/health"
Invoke-RestMethod "http://127.0.0.1:$SelectedHttpPort/pairs/meta"
```

Do **not** terminate unrelated processes occupying default ports.

## 9. Android execution

### Preconditions

- Exactly **one** usable emulator booted, verified with `adb devices`
- `JAVA_HOME` points to JDK 17 for native build commands
- Backend running on the selected HTTP/WebSocket ports
- `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WS_URL` use the **same selected ports** recorded in section 8

### Build and launch (Bash / zsh)

```bash
cd mobile
export JAVA_HOME=<path-to-jdk-17>
export EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:$SELECTED_HTTP_PORT
export EXPO_PUBLIC_WS_URL=ws://10.0.2.2:$SELECTED_WS_PORT
CI=1 EXPO_NO_GIT_STATUS=1 pnpm exec expo prebuild --clean --platform android
CI=1 pnpm exec expo run:android --device <serial-or-avd> --variant debug
```

### Build and launch (PowerShell)

```powershell
cd mobile

$env:JAVA_HOME = "<path-to-jdk-17>"
$env:CI = "1"
$env:EXPO_NO_GIT_STATUS = "1"
$env:EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:$SelectedHttpPort"
$env:EXPO_PUBLIC_WS_URL = "ws://10.0.2.2:$SelectedWsPort"

pnpm exec expo prebuild --clean --platform android
pnpm exec expo run:android --device <serial-or-avd> --variant debug
```

### Environment cleanup (PowerShell)

```powershell
Remove-Item Env:JAVA_HOME -ErrorAction SilentlyContinue
Remove-Item Env:CI -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_NO_GIT_STATUS -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_PUBLIC_API_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:EXPO_PUBLIC_WS_URL -ErrorAction SilentlyContinue
Remove-Item Env:HTTP_PORT -ErrorAction SilentlyContinue
Remove-Item Env:WS_PORT -ErrorAction SilentlyContinue
```

### Requirements

- preserve Gradle and Metro logs
- record package `com.dinithagamage.pulsecrypto`
- record launch activity `com.dinithagamage.pulsecrypto/.MainActivity`
- wait up to **120 seconds** for Markets screen readiness
- if build fails once, perform **one** justified retry with captured reason; no further retries

Do **not** recursively retry builds.

Expo Go is **not** the validated assignment runtime. Use the development client produced by `expo run:android`.

## 10. Runtime smoke

Verify and record timestamped observations or screenshots:

| Check | Expected |
| --- | --- |
| LIVE state | Connection chip shows LIVE with backend healthy |
| Five pairs | All five supported pairs are present in the watchlist; scroll when necessary |
| Changing prices | Values update over ~10 seconds |
| Search | Filtering works |
| Clear search | Full list restored |
| Favourite toggle | Bookmark changes state |
| Favourite restoration | Persists after reload/restart |
| Pull-to-refresh | Metadata refresh succeeds |
| Market Details | Opens for selected pair |
| Spread / pressure | Rendered |
| Bids and asks | Order Book visible |
| Market Depth | Visible with center join |
| Back navigation | Returns to Markets |

## 11. Reliability test

Controlled reconnect sequence:

1. Establish LIVE data.
2. Stop **only** the task-owned backend (`Ctrl+C` or `kill` of that process).
3. Observe mobile connection state.
4. Verify last-known values remain visible.
5. Restart backend on the **same selected ports** recorded in section 8.
6. Verify backend `/health` on `http://127.0.0.1:<selected-http-port>/health` (or `$SelectedHttpPort` in PowerShell).
7. Verify backend WebSocket batches resume on `ws://127.0.0.1:<selected-ws-port>`.
8. Wait through a bounded reconnect window of **60 seconds**.
9. Record whether mobile returns to LIVE.
10. Repeat at most **once** if the first attempt is ambiguous.
11. Record exact result with timestamps.

Do **not** claim reconnect success from unit tests alone.

If reconnect fails:

- capture Android logs (`adb logcat`)
- capture backend logs
- record configured `EXPO_PUBLIC_WS_URL`
- record elapsed time in RECONNECTING
- report defect without modifying source unless fixes were explicitly requested

**Known caveat:** An independent Android debug-runtime review observed one case where the app retained last-known values and entered RECONNECTING but did not return to LIVE after the backend restarted on alternate local ports.

## 12. Build-artifact procedure

Only when the reviewer explicitly requests an APK build:

1. Ensure `mobile/android/` exists via `expo prebuild`.
2. Set `JAVA_HOME` to JDK 17.
3. Set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_WS_URL` using the selected ports from section 8.
4. Build with the validated Gradle task:

**Bash / zsh:**

```bash
cd mobile/android
export JAVA_HOME=<path-to-jdk-17>
export EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:$SELECTED_HTTP_PORT
export EXPO_PUBLIC_WS_URL=ws://10.0.2.2:$SELECTED_WS_PORT
./gradlew :app:assembleRelease -x lint -x test --no-daemon --console=plain -PreactNativeArchitectures=arm64-v8a
```

**PowerShell:**

```powershell
cd mobile/android
$env:JAVA_HOME = "<path-to-jdk-17>"
$env:EXPO_PUBLIC_API_BASE_URL = "http://10.0.2.2:$SelectedHttpPort"
$env:EXPO_PUBLIC_WS_URL = "ws://10.0.2.2:$SelectedWsPort"
.\gradlew :app:assembleRelease -x lint -x test --no-daemon --console=plain -PreactNativeArchitectures=arm64-v8a
```

5. Record:

| Field | Source |
| --- | --- |
| Path | `mobile/android/app/build/outputs/apk/release/app-release.apk` |
| Package | `com.dinithagamage.pulsecrypto` |
| ABI | `arm64-v8a` when using `-PreactNativeArchitectures=arm64-v8a` |
| Variant | Gradle `release` |
| Size | `stat` / `Get-Item` |
| SHA-256 | `shasum -a 256` / `Get-FileHash` |

**SHA-256 (PowerShell):**

```powershell
Get-FileHash mobile/android/app/build/outputs/apk/release/app-release.apk -Algorithm SHA256
```

6. Inspect APK signing with available Android tooling (for example `apksigner verify --print-certs` or `keytool` against the APK signature) and report:

- observed signing type
- certificate identity
- whether it is development/debug or production signing

Inspect the APK signature and report the observed certificate. Do **not** classify it as production-signed unless the certificate and build process prove that claim.

Do **not** inspect an unrelated pre-existing APK as substitute evidence.

## 13. iOS branch

Run iOS only when:

- host is macOS
- Xcode is available
- reviewer explicitly requests iOS

Otherwise report:

```text
NOT RUN — OPTIONAL IOS ENVIRONMENT UNAVAILABLE OR NOT REQUESTED
```

Optional iOS absence is **not** an Android assignment failure.

## 14. Timeouts and process ownership

| Stage | Bounded timeout |
| --- | --- |
| Dependency installation | 15 minutes |
| Typecheck + tests | 20 minutes total |
| Backend readiness | 30 seconds |
| Android native build | 30 minutes |
| Metro readiness | 120 seconds |
| Runtime screen readiness | 120 seconds |
| Reconnect observation window | 60 seconds |

Requirements:

- emit periodic progress notes during commands longer than 2 minutes
- at most **one** justified retry per failing stage
- no nested retries
- terminate only task-owned processes
- perform final port/process cleanup

## 15. Mutation policy

The AI must **not**:

- edit source or tests
- change dependencies
- regenerate lockfiles
- commit or push
- change GitHub visibility
- modify global toolchain configuration without permission

Generated ignored files are permitted.

At the end, run:

```bash
git status --short
```

Any tracked modification is a **review-isolation failure** and must be reported.

## 16. Final AI report contract

Return one structured report containing:

- repository URL
- branch
- commit
- repository access status
- evidence boundary statement
- operating system and architecture
- tool versions
- clone result
- install result
- typecheck result
- test counts (actual)
- Expo checks
- backend startup result
- REST verification
- live Binance verification
- WebSocket cadence sample
- Android build result
- Android launch result
- smoke-test results
- favourite persistence result
- backend-down behavior
- backend-restored behavior
- reconnect result
- artifact details (if built)
- environment interventions
- final `git status --short`
- unverified areas
- proven defects
- missing evidence
- overall assignment verdict

### Allowed verdicts

- `PASS`
- `PASS_WITH_RESERVATIONS`
- `FAIL`
- `BLOCKED_BY_ENVIRONMENT`
- `BLOCKED_BY_REPOSITORY_ACCESS`

Any `FAIL` must include exact reproduction evidence.

## Related documents

- [setup-build-run.md](./setup-build-run.md)
- [submission-handoff.md](./submission-handoff.md)
- [final-validation.md](./final-validation.md)

# Testing Standard

What to test, when, and how evidence is judged sufficient.

Architecture context: [architecture-principles.md](./architecture-principles.md)  
Pre-commit review: [review-checklist.md](./review-checklist.md)

## Principles

- **Test behavior, not implementation trivia.** Prefer assertions on outputs, contracts, and side effects that matter to users or operators.
- **Test at the lowest effective layer.** Pure functions in unit tests; HTTP/WS in backend integration tests; mobile stores/selectors before full E2E.
- **No fantasy coverage.** Do not add tests that only assert mocks or constants already guaranteed by TypeScript.
- **Validation is part of done.** A task is incomplete if required checks were not run or failures were not reported.

## Required checks (workspace)

Run from repository root unless task scope is narrower:

```bash
pnpm install --frozen-lockfile   # when lockfile changed
pnpm typecheck                   # always for TS changes
pnpm test                        # always for behavior changes
```

### Backend (`backend/`)

| Layer | Expectation |
| --- | --- |
| Pure market math / parsing | Unit tests with edge cases and invalid input |
| HTTP routes | Supertest or equivalent against real app bootstrap |
| WebSocket | Connection lifecycle, message shape, slow-consumer policy |
| Binance adapters | Parser and reconnect policy tests; no live network in CI unit tests |

Current baseline: 65 backend tests—new modules should extend coverage, not regress count silently.

### Shared (`packages/shared/`)

- Schema/contract validation tests when parsers or guards are added
- No network, no I/O, no React

### Mobile (`mobile/`)

| Stage | Expectation |
| --- | --- |
| Foundation | typecheck; manual Android emulator proof |
| Stores / selectors | Unit tests for reducers, selectors, persistence validation |
| Data layer | Contract validation tests for REST/WS payloads |
| Screens | Component or integration tests for watchlist, search, favourites, offline—when implemented |

Mobile Expo checks after dependency changes:

```bash
cd mobile && pnpm dlx expo-doctor
pnpm exec expo install --check
```

### Android validation

Functional mobile UI changes require emulator evidence when the toolchain is available:

- Metro bundles without red errors
- `ReactNativeJS: Running "main"` or equivalent
- Visual confirmation of target screen (screenshot + UI text dump)
- Tab navigation smoke when navigation changes

Document unverified launch explicitly in the task report.

## What not to test (assignment scope)

- Binance production SLA or live trading correctness
- Physical device matrix (emulator is primary)
- Figma pixel-perfect diff automation (manual/MCP inspection instead)

## Test naming and placement

- Colocate tests as `*.test.ts` beside source or under `__tests__/` following existing backend convention
- One describe block per module behavior axis
- Name tests by **observable outcome**: `rejects malformed snapshot batch`, not `calls validate()`

## Failure policy

- Failing tests block commit
- Flaky tests are bugs—fix or quarantine with ADR and issue reference, not ignored retries
- If CI is absent (current state), local `pnpm test` is the gate

## Evidence in reports

Populate validation fields in the mandatory `PULSECRYPTO_CURSOR_REPORT` block per [reporting-template.md](./reporting-template.md):

- Command invoked
- Pass/fail counts
- New tests added (file + what behavior they lock)
- Proof artifacts (screenshots, logs) copied to the proof directory with `file:///` links when they exist

## Future additions

When CI lands, this document should gain:

- Required checks per path filter (backend-only PR vs mobile-only PR)
- Minimum coverage thresholds only if enforced by tooling—not vanity percentages

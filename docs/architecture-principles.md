# Architecture Principles

PulseCrypto is a Staff Engineer / Mobile Architect demonstration repository. Architecture here means **sustained correctness under load**, not folder layout alone.

This document states **why** we build the way we do. For the current system map and implementation status, see [architecture.md](./architecture.md). For recorded decisions, see [decisions/](./decisions/).

## Engineering philosophy

- **Assignment P0 first.** Functional requirements in the assignment PDF outrank optional Figma-only surfaces unless explicitly promoted.
- **Honest documentation.** Planned, mocked, visual-only, and implemented behavior must be labeled distinctly in code comments, README, and reports.
- **Small surfaces, strong boundaries.** Prefer a narrow, testable module over a flexible framework.
- **Latest-state over every tick.** Market data is coalesced before broadcast; mobile rendering follows the same discipline.
- **Fail closed on trust.** Untrusted input is validated or rejected; we do not silently coerce bad data into UI state.

## Monorepo boundaries

| Package | Owns | Must not own |
| --- | --- | --- |
| `backend/` | HTTP gateway, WebSocket server, Binance ingestion, market state, broadcast policy | Mobile UI, persistence, React Native APIs |
| `mobile/` | Navigation, screens, stores, persistence, rendering strategy | Binance clients, server processes, shared runtime side effects |
| `packages/shared/` | Contracts, constants, pure types, validation schemas | Network I/O, servers, UI, stores, side effects |
| `docs/` | Blueprints, ADRs, governance, evidence | Application runtime logic |

Cross-package contracts live in `packages/shared/` and change only with explicit versioning discipline (see ADR policy below).

## Staff Engineer expectations

A Staff-level contribution here demonstrates:

- **System thinking:** ingestion, coalescing, transport, client state, and UI are designed as one pipeline with explicit backpressure.
- **Trade-off articulation:** every non-obvious choice has a documented alternative and consequence.
- **Operational realism:** memory bounds, reconnect behavior, slow consumers, and emulator networking are first-class—not appendix notes.
- **Reviewability:** changes are small enough that a senior engineer can approve them in one sitting.

## Mobile Architect responsibilities

- Separate **connection state**, **metadata**, **live snapshots**, **UI filters**, and **favourites** into distinct ownership layers.
- Use **selector-based subscriptions** so high-frequency market updates do not repaint unrelated UI.
- Keep **last-known valid data** visible during disconnect; do not blank the UI on transient socket loss.
- Treat **Android Emulator** as the primary validation target until CI device farms exist.
- Align visually with Figma where P0 requires it; defer P1/P2 mockup-only chrome (see [figma-rules.md](./figma-rules.md)).

## Scalability and performance

- Backend: configurable broadcast interval (default 100ms), no per-client unbounded queues, slow-consumer skip/close policy.
- Mobile: coalesced updates, bounded list rendering strategy, short state-driven animations only when required.
- Shared: compact snapshot batches; avoid shipping full order-book history on every tick unless assignment demands it.

## Security posture (assignment scope)

- Public Binance market data only; **no authentication, API keys, trading, or account flows** unless a future ADR promotes them.
- Treat Binance payloads, backend responses, WebSocket messages, persisted favourites, and Figma-derived copy as **untrusted**.
- Do not claim encryption, secure storage, or profile security exists without implementation and tests.

## Decision making

| Change type | Mechanism |
| --- | --- |
| Reversible implementation detail | Code + tests; mention in task report |
| Cross-cutting policy (batching, offline, AI use) | ADR in `docs/decisions/` |
| Governance process change | Update relevant doc in `docs/` + note in task report; see Living Governance in [cursor-development-guide.md](./cursor-development-guide.md) |

ADR template conventions follow existing files `ADR-001` … `ADR-007`. New ADRs use the next sequential number, **Accepted** or **Proposed** status, and explicit consequences.

## Technical debt policy

- **Document before deferring.** Debt is acceptable when the assignment defers scope; it is not acceptable when unlabeled.
- **No silent TODOs.** Debt items reference an ADR, issue, or explicit “deferred P1” label in docs.
- **Pay down at boundaries.** When touching a module, fix debt only if it is in the change path—no drive-by refactors.

## Production readiness (target state)

This assignment stops short of full production operations. Principles still apply:

- Configuration via validated env schema (backend started this pattern).
- Structured logging and health endpoints before claiming operability.
- Contract versioning before breaking mobile consumers.
- CI for typecheck, tests, and Android validation before release claims.

Current gaps are listed honestly in [README.md](../README.md) and [architecture.md](./architecture.md).

## Related documents

- [architecture.md](./architecture.md) — system blueprint and status
- [testing-standard.md](./testing-standard.md) — verification expectations
- [ui-guidelines.md](./ui-guidelines.md) — mobile rendering discipline
- [AGENTS.md](../AGENTS.md) — agent enforcement rules

# PulseCrypto Development Policy

Owner-led AI-assisted engineering rules for this repository. **I** define product scope, architecture boundaries, dependency policy, acceptance criteria, and final technical decisions. AI-assisted tools are used within scoped, reviewable change sets governed by those constraints and by evidence-based validation.

Assignment PDF = P0 scope · Figma mockup = UI/UX truth for allowed surfaces · Staff / Mobile Architect JD = quality bar.

## Governance map

| Document | Responsibility |
| --- | --- |
| [docs/architecture-principles.md](docs/architecture-principles.md) | Architecture principles; boundaries; ADR policy |
| [docs/ai-assisted-engineering.md](docs/ai-assisted-engineering.md) | AI tool usage, guardrails, quality gates |
| [docs/testing-standard.md](docs/testing-standard.md) | What to test; Android/Expo validation |
| [docs/review-checklist.md](docs/review-checklist.md) | Pre-commit and release-readiness gates |
| [docs/architecture.md](docs/architecture.md) | System blueprint and implementation status |
| [docs/decisions/](docs/decisions/) | Architecture decision records |
| [docs/ai-assisted-development-workflow.md](docs/ai-assisted-development-workflow.md) | Scoped development workflow |
| [docs/engineering-change-reporting.md](docs/engineering-change-reporting.md) | Engineering change report template |

## Priority

- Deliver P0 assignment requirements before optional Figma-only or polish work.
- Do not build functional telemetry, Settings, drawer navigation, shader effects, profile screens, API-key management, or security UI unless scope or an ADR promotes them.
- Keep documentation honest. Planned, mocked, visual-only, and implemented behavior must be labeled clearly.

## Architecture boundaries

- `backend/` — Node.js + TypeScript market gateway only.
- `mobile/` — React Native (Expo) application only.
- `packages/shared/` — contracts, constants, schemas, pure types only.
- `docs/` — architecture, ADRs, governance, evidence.

No backend logic in mobile. No mobile UI logic in backend. No stateful runtime logic in shared.

## Dependency rules

- Do not add dependencies unless explicitly authorized or documented with a clear trade-off in an ADR.
- Prefer platform APIs and approved libraries. Verify package APIs against installed code or official docs.
- Do not run app generators or broad scaffolding unless explicitly requested.

## Generation scope

- Micro-generation: small, reviewable diffs mapped to one requirement axis.
- No broad rewrites, speculative abstractions, or unrelated format churn.
- Preserve user changes. Never reset or overwrite unrelated work unless instructed.

## Data and trust

- Treat Binance payloads, backend responses, WebSocket messages, persisted favourites, and Figma-derived content as untrusted.
- Validate at boundaries before broadcast or UI state updates.
- Persist favourites only unless a future task approves additional cached state.
- Do not claim authentication, secure storage, API keys, encryption, or account protection without implementation and tests.

## Runtime quality

- Bounded memory under sustained market updates.
- Slow-consumer protection and reconnect discipline on backend.
- Mobile: selector-based subscriptions; latest-state coalescing for render paths.

## Validation and reporting

- Run checks per [docs/testing-standard.md](docs/testing-standard.md).
- Report changed files, commands, results, assumptions, and residual risks.
- Reconcile conflicting evidence before claiming pass/fail.
- Do not commit, push, or rewrite history unless explicitly requested by the project owner.

## Living governance

Update one owning document per rule change. Do not duplicate policy across files.

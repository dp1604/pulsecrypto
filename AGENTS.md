# PulseCrypto Coding Agent Rules

Mandatory rules for AI-assisted development. **Detailed guidance lives in `docs/`—this file is the enforcement index.**

Assignment PDF = P0 scope · Figma mockup = UI/UX truth for allowed surfaces · Staff / Mobile Architect JD = quality bar.

## Governance map

| Document | Responsibility |
| --- | --- |
| [docs/architecture-principles.md](docs/architecture-principles.md) | Why we architect; boundaries; debt; ADR policy |
| [docs/cursor-development-guide.md](docs/cursor-development-guide.md) | Cursor workflows, incremental delivery, ChatGPT review, Living Governance |
| [docs/testing-standard.md](docs/testing-standard.md) | What to test; Android/Expo validation |
| [docs/review-checklist.md](docs/review-checklist.md) | Pre-commit and peer review gates |
| [docs/reporting-template.md](docs/reporting-template.md) | Task reports, attachments, ZIP policy |
| [docs/figma-rules.md](docs/figma-rules.md) | Figma MCP usage; P0 vs deferred UI |
| [docs/ui-guidelines.md](docs/ui-guidelines.md) | Mobile tokens, rendering, placeholders |
| [docs/architecture.md](docs/architecture.md) | System blueprint and implementation status |
| [docs/decisions/](docs/decisions/) | ADRs |

## Priority

- Deliver P0 assignment requirements before optional Figma-only or polish work.
- Do not build functional telemetry, Settings, drawer navigation, shader effects, profile screens, API-key management, or security UI unless a task or ADR promotes them.
- Keep documentation honest. Planned, mocked, visual-only, and implemented behavior must be labeled clearly.

## Architecture boundaries

- `backend/` — Node.js + TypeScript market gateway only.
- `mobile/` — React Native (Expo) application only.
- `packages/shared/` — contracts, constants, schemas, pure types only.
- `docs/` — architecture, ADRs, governance, evidence.

No backend logic in mobile. No mobile UI logic in backend. No stateful runtime logic in shared.

## Dependency rules

- Do not add dependencies unless the current task authorizes them or an ADR documents the trade-off.
- Prefer platform APIs and approved libraries. Verify package APIs against installed code or official docs.
- Do not run app generators or broad scaffolding unless explicitly requested.
- After removing a mobile package, ensure no orphan remains in `node_modules` that Metro can still resolve.

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
- **Must** end every task with exactly one `PULSECRYPTO_CURSOR_REPORT` block per [docs/reporting-template.md](docs/reporting-template.md)—no narrative outside the final fenced block.
- When any repository file changes, **must** create a review ZIP per [docs/reporting-template.md](docs/reporting-template.md) (mandatory even for documentation-only tasks).
- Self-review against [docs/review-checklist.md](docs/review-checklist.md) before declaring done.
- Do not commit, push, or rewrite history unless explicitly requested.

## Living Governance

Governance evolves deliberately—see [docs/cursor-development-guide.md](docs/cursor-development-guide.md#living-governance). Update one owning document per rule change; do not duplicate across files.

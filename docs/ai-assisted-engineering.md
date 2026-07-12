# AI-Assisted Engineering

PulseCrypto was built as a Staff Engineer / Mobile Architect practical assignment under explicit engineering ownership.

## Ownership and accountability

**Dinitha Gamage** defined product scope, architecture boundaries, dependency policy, acceptance criteria, validation strategy, and final technical decisions. AI-assisted tools accelerated execution, alternative exploration, and review support. Proposals were evaluated through source inspection, automated tests, Android runtime validation, release-build verification, and reconciliation of conflicting evidence before adoption.

## Tool usage

| Tool | Role in this project |
| --- | --- |
| **ChatGPT** | Architecture exploration, task decomposition, independent review support, evidence reconciliation |
| **Codex / Cursor** | Scoped implementation, test generation, local validation, documentation updates, artifact packaging |

## Guardrails

- Dependency allowlist: no new packages without explicit justification
- No hallucinated APIs, configuration keys, or framework behavior
- Bounded task scope; no broad rewrites without need
- One authoritative live market-data path end to end
- Trust-boundary validation for Binance, backend, WebSocket, and mobile payloads
- Finite retries, hard deadlines, and cleanup for runtime validation
- Source immutability checks when documentation-only work must not change behavior

## Quality gates

Release readiness required passing:

- frozen `pnpm install`
- workspace and package typecheck
- automated tests (mobile, backend, shared)
- Expo dependency check and Expo Doctor
- Android development and/or optimized release validation where applicable
- source ZIP integrity for independent inspection
- runtime screenshots or video where behavior claims required proof
- logcat review for fatal errors
- performance evidence with honest risk classification
- clean Git state and artifact hashes

## Error prevention

- Treat generated output as a **proposal**, not ground truth
- Reconcile conflicting evidence across source, tests, logs, and screenshots
- Reject false-positive runtime claims
- Retry only with bounded contingencies
- Verify exact package, runtime, and source state before reporting
- Do not accept documentation claims without corresponding code or evidence

## Outcome

AI-assisted engineering enabled faster iteration, broader deterministic test coverage, documented architecture decisions, and controlled implementation quality under sustained real-time update pressure while retaining human engineering ownership of scope, boundaries, and final decisions.

For reviewer entry points, see [submission-handoff.md](./submission-handoff.md) and [README.md](../README.md).

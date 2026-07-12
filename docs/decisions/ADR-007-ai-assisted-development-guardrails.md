# ADR-007: AI-Assisted Development Guardrails

Status: Accepted

Decision owner: Dinitha Gamage

Scope: PulseCrypto assignment

Date: 2026-07-09

## Context

The assignment encourages AI-assisted development and evaluates both the final solution and architectural decisions. Senior-level delivery requires explicit guardrails so generated proposals are evaluated rather than adopted blindly.

## Decision

Use AI-assisted engineering tools under owner-defined guardrails:

- Product scope, architecture boundaries, dependency policy, and acceptance criteria are defined by the project owner.
- Implementation proposals are scoped, reviewable, and validated before adoption.
- APIs, package names, config keys, and runtime behavior are verified before use.
- Dependencies are not added without explicit scope and documented trade-offs.
- P0 assignment requirements precede optional features.
- External data is treated as untrusted and validated before use.
- Validation runs after each meaningful change; assumptions and residual risks are recorded.

See [ai-assisted-engineering.md](../ai-assisted-engineering.md) for reviewer-facing disclosure.

## Alternatives considered

- Fully manual implementation without AI tools — rejected for delivery speed on a bounded assignment timeline.
- Unrestricted AI generation without validation gates — rejected due to hallucination and dependency drift risk.

## Consequences

- AI can improve delivery speed while reducing invented APIs and dependency drift.
- Documentation and evidence become part of the verification trail.
- Uncertainty must be reported instead of inventing behavior.
- Implementation work should include tests or runtime checks near generated code.

## Validation

- Frozen install, typecheck, and automated test gates
- Android emulator and/or release APK evidence for UI/runtime claims
- Source ZIP integrity for independent inspection

## Deferred follow-up

- Formal CI pipeline enforcing the same gates automatically

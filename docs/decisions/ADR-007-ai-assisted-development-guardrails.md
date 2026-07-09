# ADR-007: AI-Assisted Development Guardrails

Status: Accepted

Date: 2026-07-09

## Context

The assignment encourages AI-assisted development and evaluates both the final solution and architectural decisions. The role context expects senior-level judgment, not unchecked generation.

## Decision

Use AI assistance under explicit guardrails:

- Follow `AGENTS.md` for every implementation step.
- Prefer small, reviewable changes over broad generation.
- Verify APIs, package names, config keys, and runtime behavior before using them.
- Do not add dependencies without explicit scope and documented trade-offs.
- Keep P0 assignment requirements ahead of optional features.
- Treat external data as untrusted and validate before use.
- Run validation after each step and report changed files, commands, results, assumptions, and risks.

## Consequences

- AI can improve delivery speed while reducing hallucinated APIs and dependency drift.
- Documentation becomes part of the verification trail.
- Agents must stop and report uncertainty instead of inventing behavior.
- Future implementation work should include tests or runtime checks near generated code.

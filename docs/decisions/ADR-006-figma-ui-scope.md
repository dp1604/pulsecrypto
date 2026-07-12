# ADR-006: Figma UI Scope

Status: Accepted

Decision owner: Dinitha Gamage

Scope: PulseCrypto assignment

Date: 2026-07-09

## Context

The Pulse Crypto Figma mockup is the official UI/UX source of truth, but the assignment PDF defines the mandatory functional scope. Some Figma visuals may imply optional product surfaces that are not required by the PDF.

## Decision

Use Figma for visual direction and screen mapping, with this priority order:

1. P0 assignment requirements.
2. Figma fidelity for required screens and states.
3. Optional Figma-only surfaces as P1/P2 or future work.

Figma MCP or equivalent structured design inspection is the primary inspection source when available. Screenshots are the fallback. Do not implement fake Settings, profile, API-key, security, telemetry, or visual-only features solely because they appear in the mockup.

## Consequences

- Required functionality is not displaced by visual polish.
- UI implementation can still match the provided design for required flows.
- Optional surfaces must be labeled honestly in docs and code.
- Any feature that looks security-sensitive must not be claimed unless it is actually implemented and validated.

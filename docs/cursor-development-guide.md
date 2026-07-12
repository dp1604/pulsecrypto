# Cursor Development Guide

How humans and AI agents work in this repository using Cursor, incremental delivery, and external review.

- **Enforcement rules:** [AGENTS.md](../AGENTS.md)
- **Architecture context:** [architecture-principles.md](./architecture-principles.md)
- **Task output format:** [reporting-template.md](./reporting-template.md)

## Purpose of this repository

PulseCrypto demonstrates **Staff Mobile Engineer / Mobile Architect** capability:

- Real-time market pipeline design
- Mobile performance under sustained updates
- Monorepo boundary discipline
- ADR-backed trade-offs
- Controlled AI-assisted delivery with verification evidence

The assignment PDF is **P0 scope**. The [Pulse Crypto Figma mockup](https://www.figma.com/design/JYfr5h2vC9IFKtX3vasmZk/Pulse-Crypto-Mockup) is UI/UX source of truth for allowed surfaces.

## Cursor usage model

### Session setup

1. Read `AGENTS.md` and the task-specific scope block (allowed/forbidden paths).
2. Skim [architecture.md](./architecture.md) for current implementation status—do not assume README or ADRs are current without checking code.
3. Identify which governance docs apply (testing, Figma, UI, review).

### Incremental implementation

- **One requirement axis per change set** (e.g. “mobile WebSocket client”, not “entire watchlist + favourites + animations”).
- **Micro-generation:** edit only files the task authorizes; preserve unrelated user work.
- **Validate before declaring done** per [testing-standard.md](./testing-standard.md).
- **Report** per [reporting-template.md](./reporting-template.md).

Stop and ask when:

- A dependency is required but not authorized
- `expo prebuild`, dev-client, or native project generation would be needed
- Assignment scope and Figma scope conflict
- Validation cannot be run

### What Cursor must not do without explicit approval

- Commit, push, or rewrite git history
- Add dependencies (see [architecture-principles.md](./architecture-principles.md))
- Run broad scaffolds (`create-*`, wholesale rewrites)
- Implement P1 Figma-only features (Settings shell, telemetry, shaders, API-key UI, drawer nav)
- Modify `backend/`, `mobile/`, or `packages/` during documentation-only tasks

## ChatGPT review workflow

Use ChatGPT (or equivalent) as a **senior review pass**, not as a code generator.

Recommended flow:

1. Complete implementation + validation in Cursor.
2. Attach the review ZIP and any proof artifacts per [reporting-template.md](./reporting-template.md).
3. Review against [review-checklist.md](./review-checklist.md).
4. Address findings in a **new small change set**; do not batch unrelated fixes.

Reviewers should challenge:

- Hallucinated APIs, env vars, or package names
- Boundary violations (logic in `packages/shared/`, etc.)
- Unlabeled mock or placeholder behavior presented as production-ready
- Missing tests for new behavior paths
- Performance hazards (unbounded arrays, per-tick full-tree re-renders)

## AI-assisted development guardrails

ADR-007 remains authoritative. Operational summary:

- Verify against installed code, official docs, or local examples—never invent framework behavior.
- Treat all external data as untrusted; validate at boundaries.
- Run commands and report results; do not claim validation you did not perform.

## Dependency management

- Add packages only when the **current task explicitly authorizes** them or an ADR documents the trade-off.
- Prefer `expo install` / workspace-aligned versions for mobile; pin via lockfile, not hand-picked semver.
- After removing a package, ensure **no orphan remains** in `node_modules` that Metro can still resolve (see README mobile launch notes).

## Commit policy

- **No agent commits by default.** Commit only when the human explicitly requests it.
- One commit should map to **one reviewable intent** (foundation, ingestion, mobile data layer, etc.).
- Pre-commit expectations: typecheck, relevant tests, Android proof when mobile UI changes—see [review-checklist.md](./review-checklist.md).

## Review ZIP and task report

Whenever **any repository file changes**—including documentation-only tasks—Cursor **must**:

1. Create a fresh review ZIP per [reporting-template.md](./reporting-template.md) (location, naming, exclusions).
2. End the task with **exactly one** `PULSECRYPTO_CURSOR_REPORT` fenced block; no narrative outside it.

Review ZIPs are mandatory evidence for ChatGPT review. They are **not** commits and do not require explicit human approval to create.

## Risk management

Every task report includes **remaining risks** when:

- Validation was partial (emulator unavailable, network blocked, etc.)
- Behavior is mocked or deferred
- Performance risk remains after release profiling (see [final-validation.md](./final-validation.md))
- A native module or Expo Go limitation was encountered

Escalate to an ADR when the risk affects cross-cutting policy.

## Living Governance

Governance documents are **versioned engineering policy**, not immutable law.

Update them when:

- A repeated review finding shows missing guidance
- Toolchain facts change (Expo SDK, Node LTS, emulator requirements)
- Assignment scope is reinterpreted with evidence

Process:

1. Propose change in a documentation-only PR or task.
2. Avoid duplicating content—extend the single owning doc or add an ADR.
3. Update cross-links in `AGENTS.md` if the doc map changes.
4. Note the governance change in the next task report.

Do not scatter the same rule across five files.

## Android and Expo validation

Mobile tasks that change runtime behavior must prove launch on the assignment emulator when possible:

```bash
pnpm --filter @pulsecrypto/mobile android
```

Use IPv4 Metro binding already configured in `mobile/package.json`. Development validation uses `expo-dev-client`; final delivery also records optimized release APK evidence—see README and [final-validation.md](./final-validation.md).

Evidence: screenshot path, `ReactNativeJS` log line or UI automation dump, Metro bundle line without red errors.

## Related documents

- [review-checklist.md](./review-checklist.md)
- [reporting-template.md](./reporting-template.md)
- [testing-standard.md](./testing-standard.md)
- [figma-rules.md](./figma-rules.md)

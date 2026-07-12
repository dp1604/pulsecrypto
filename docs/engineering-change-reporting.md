# Engineering Change Report Template

Concise template for documenting scoped engineering changes in PulseCrypto. Use for design reviews, release-readiness notes, and evidence reconciliation.

Related: [review-checklist.md](./review-checklist.md) · [testing-standard.md](./testing-standard.md) · [architecture-principles.md](./architecture-principles.md)

## Report structure

```markdown
# Engineering Change Report

## Change objective
What requirement or defect this change addresses.

## Architectural impact
Boundaries touched (backend / mobile / shared / docs). Whether contracts, cadence, or state ownership changed.

## Alternatives considered
Genuine options evaluated and why they were rejected or deferred.

## Files changed
Created, modified, deleted paths (repository-relative).

## Validation performed
Commands run and outcomes: typecheck, tests, Expo checks, Android validation where applicable.

## Evidence
Screenshots, logs, APK metadata, performance summaries, or test output references.

## Assumptions
Runtime, transport, emulator, or data-source assumptions relied upon.

## Trade-offs
Performance, reliability, scope, or maintainability trade-offs accepted.

## Risks
Residual risks, deferred follow-up, and honest limitations.

## Deployment / release effect
Whether runtime behavior, build artifacts, or release evidence require refresh.
```

## Decision record (when applicable)

For architectural, dependency, performance, networking, or UI-system choices:

| Field | Guidance |
| --- | --- |
| Decision | Chosen approach in one sentence |
| Context | Problem and constraints |
| Options considered | Only genuinely evaluated alternatives |
| Trade-offs | Accepted costs and rejected paths |
| Consequences | Ownership, scaling, failure modes |
| ADR reference | Link when a formal ADR exists |

If no material decision was required:

```text
No material architectural decision required for this change.
```

## Evidence packaging

When proof artifacts exist:

1. Store under `$ARTIFACT_DIR` (candidate evidence directory outside the repository).
2. Record filename, size, SHA-256, and purpose.
3. Exclude secrets, conversation logs, and build outputs from source packages.

## Source review package

When repository files change, create a fresh full-project source ZIP from `git ls-files -co --exclude-standard` before external review.

Exclude: `node_modules`, `.git`, `.expo`, `dist`, `build`, `coverage`, generated native trees, secrets, and local proof artifacts unless explicitly required.

Verify archive integrity with `unzip -t` and a secret preflight scan for `.env*` (except `.env.example`, `.env.sample`, `.env.template`), keys, and credential JSON.

## Figma evidence (UI tasks)

For UI/UX changes, record inspected node IDs, exported asset paths, and visual deltas per [figma-rules.md](./figma-rules.md).

Official file: [Pulse Crypto Mockup](https://www.figma.com/design/JYfr5h2vC9IFKtX3vasmZk/Pulse-Crypto-Mockup?node-id=0-1&p=f)

## Anti-patterns

- Claiming validation without command evidence
- Packaging secret-like files because they are Git-ignored
- Mixing implemented, mocked, and deferred behavior without labels
- Unsupported performance or runtime claims

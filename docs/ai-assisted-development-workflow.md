# AI-Assisted Development Workflow

Tool-agnostic workflow for scoped changes in PulseCrypto. Engineering ownership, scope, and acceptance criteria are defined by the project owner. See [ai-assisted-engineering.md](./ai-assisted-engineering.md) for disclosure of AI-assisted tools used in this project.

## Principles

1. **Architecture-first** — read `docs/architecture.md` and relevant ADRs before structural changes.
2. **Incremental delivery** — one requirement axis per change set.
3. **Evidence-based validation** — source, tests, typecheck, and runtime proof must align.
4. **Honest documentation** — implemented vs planned vs mocked must stay distinct.

## Scoped change workflow

1. Confirm the requirement against assignment P0 scope and Figma truth for allowed surfaces.
2. Identify allowed files and architecture boundaries (`AGENTS.md`).
3. Implement the smallest correct diff.
4. Run validation per [testing-standard.md](./testing-standard.md).
5. Update only documentation made inaccurate by the change.
6. Package review artifacts when requested; do not commit without owner authorization.

## Controlled engineering decisions

These decisions require explicit owner authorization because they alter architecture, contracts, dependencies, release state, or scope:

- New dependencies
- Shared contract changes
- Additional sockets or market stores
- Backend cadence or mobile publication cadence changes
- Functional Settings, Telemetry, trading, or security surfaces
- Commits, pushes, and release tagging

## Evidence reconciliation

- Treat generated output as a proposal until validated.
- Reconcile conflicting evidence across source, tests, logs, and runtime media.
- Record assumptions, limitations, and residual risks in the engineering change report.

## Living governance

When a rule changes, update the single owning document listed in `AGENTS.md`. Avoid duplicating policy across README, ADRs, and handoff files.

# Review Checklist

Use this checklist for **engineering review** and **pre-commit self-review**.

Companion: [testing-standard.md](./testing-standard.md) · [architecture-principles.md](./architecture-principles.md) · [ai-assisted-engineering.md](./ai-assisted-engineering.md)

## Scope and honesty

- [ ] Change set matches allowed scope; no forbidden paths edited
- [ ] P0 assignment requirements addressed before P1 Figma polish
- [ ] README / docs / UI do not claim unimplemented auth, security, trading, or live data
- [ ] Mocked metadata or placeholder screens labeled honestly

## Architecture and boundaries

- [ ] No backend runtime logic in `mobile/` or `packages/shared/`
- [ ] No mobile UI or stores in `backend/`
- [ ] `packages/shared/` contains only pure contracts/constants—no side effects
- [ ] Shared contract changes coordinated with consumers; breaking changes noted

## Dependencies

- [ ] No new packages unless explicitly authorized or documented in an ADR
- [ ] Versions align with Expo / workspace conventions
- [ ] Lockfile updated only when dependencies intentionally change
- [ ] Removed packages have no orphan Metro resolution (mobile)

## Security and data trust

- [ ] External payloads validated before state updates or broadcast
- [ ] Persisted favourites validated on read
- [ ] No secrets, API keys, or `.env` committed
- [ ] No new attack surface without ADR

## Performance and scalability

- [ ] Backend: bounded memory; slow-consumer policy respected for WS changes
- [ ] Mobile: selector-based subscriptions; no full-app re-render per tick
- [ ] Lists virtualization considered when pair count grows
- [ ] Animations brief and state-driven—not decorative loops on hot paths

## Testing and validation

- [ ] `pnpm typecheck` passes for touched workspaces
- [ ] `pnpm test` passes; new behavior has meaningful tests per [testing-standard.md](./testing-standard.md)
- [ ] Mobile UI changes: Android emulator proof when feasible
- [ ] Expo: `expo-doctor` / `expo install --check` after mobile dependency changes

## Mobile / Expo specific

- [ ] Markets remains default tab unless scope says otherwise
- [ ] Emulator uses `10.0.2.2` for host backend—not `localhost` inside app
- [ ] `expo prebuild` / dev-client / release APK only when authorized; generated native folders stay gitignored
- [ ] Reanimated/worklets only with full Expo SDK–compatible setup

## Figma and UI

- [ ] UI/UX tasks: Figma references consulted before implementation per [figma-rules.md](./figma-rules.md)
- [ ] Figma assets exported and used where available
- [ ] P0 screens match assignment; optional Figma surfaces deferred
- [ ] Tokens and layout follow [ui-guidelines.md](./ui-guidelines.md)

## Documentation and ADRs

- [ ] Significant trade-offs recorded in ADR when cross-cutting
- [ ] [architecture.md](./architecture.md) updated if system behavior changed
- [ ] AI-assisted engineering disclosure remains accurate
- [ ] Review ZIP created when repository files change (including docs-only)

## Git and release quality

- [ ] Commit requested explicitly by project owner
- [ ] Commit message reflects **why**, one intent per commit
- [ ] No force-push to main; no hook skipping unless requested
- [ ] `backend/` and `packages/shared/` untouched when mobile-only scope (and vice versa)

## Release-readiness decision

Record exactly one:

- **READY** — required functionality, architecture, validation, and evidence meet the release criteria.
- **READY_WITH_DISCLOSED_RISK** — release criteria are substantially met and residual risks are documented.
- **NOT_READY** — blocking defects or missing evidence remain.

Required supporting fields:

- Decision
- Evidence reviewed
- Residual risks
- Required follow-up
- Decision date

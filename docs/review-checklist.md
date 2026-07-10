# Review Checklist

Use this checklist for **human review**, **ChatGPT review**, and **self-review before commit**.

Companion: [cursor-development-guide.md](./cursor-development-guide.md) · [testing-standard.md](./testing-standard.md) · [architecture-principles.md](./architecture-principles.md)

## Scope and honesty

- [ ] Change set matches task **allowed scope**; no forbidden paths edited
- [ ] P0 assignment requirements addressed before P1 Figma polish
- [ ] README / docs / UI do not claim unimplemented auth, security, trading, or live data
- [ ] Mocked metadata or placeholder screens labeled honestly

## Architecture and boundaries

- [ ] No backend runtime logic in `mobile/` or `packages/shared/`
- [ ] No mobile UI or stores in `backend/`
- [ ] `packages/shared/` contains only pure contracts/constants—no side effects
- [ ] Shared contract changes coordinated with consumers; breaking changes noted

## Dependencies

- [ ] No new packages unless task or ADR authorized them
- [ ] Versions align with Expo / workspace conventions—not arbitrary pins
- [ ] Lockfile updated only when dependencies intentionally change
- [ ] Removed packages have no orphan Metro resolution (mobile)

## Security and data trust

- [ ] External payloads validated before state updates or broadcast
- [ ] Persisted favourites validated on read
- [ ] No secrets, API keys, or `.env` committed
- [ ] No new attack surface (open CORS, unbounded uploads) without ADR

## Performance and scalability

- [ ] Backend: bounded memory; slow-consumer policy respected for WS changes
- [ ] Mobile: selector-based subscriptions; no full-app re-render per tick
- [ ] Lists virtualization considered when pair count grows
- [ ] Animations brief and state-driven—not decorative loops on hot paths

## Testing and validation

- [ ] `pnpm typecheck` passes for touched workspaces
- [ ] `pnpm test` passes; new behavior has meaningful tests per [testing-standard.md](./testing-standard.md)
- [ ] Mobile UI changes: Android emulator proof when feasible
- [ ] Expo: `expo-doctor` / `expo install --check` run after mobile dependency changes

## Mobile / Expo specific

- [ ] Markets remains default tab unless task says otherwise
- [ ] Emulator uses `10.0.2.2` for host backend—not `localhost` inside app
- [ ] No `expo prebuild` / dev-client without approval
- [ ] Reanimated/worklets only with full Expo SDK–compatible setup

## Figma and UI

- [ ] UI/UX tasks: Figma MCP invoked before implementation per [figma-rules.md](./figma-rules.md)
- [ ] Figma assets exported and used where available; no manual recreation of existing Figma assets
- [ ] Report lists node IDs, exported paths, screenshot fallback reason (if any), visual deltas
- [ ] P0 screens match assignment; Figma P1 deferred per [figma-rules.md](./figma-rules.md)
- [ ] Tokens and layout follow [ui-guidelines.md](./ui-guidelines.md)
- [ ] No UI kit or icon library added without authorization

## Documentation and ADRs

- [ ] Significant trade-offs recorded in ADR when cross-cutting
- [ ] [architecture.md](./architecture.md) updated if system behavior changed
- [ ] Task ends with exactly one `PULSECRYPTO_CURSOR_REPORT` fenced block per [reporting-template.md](./reporting-template.md)
- [ ] Proof artifacts copied to proof directory with `file:///` links when they exist
- [ ] Review ZIP created when any repository file changed (including docs-only)

## Git and release quality

- [ ] Commit requested explicitly by human
- [ ] Commit message reflects **why**, one intent per commit
- [ ] No force-push to main; no hook skipping unless requested
- [ ] `backend/` and `packages/shared/` untouched when mobile-only task (and vice versa)

## Review outcome

Record one of:

- **Approve** — meets checklist; residual risks documented
- **Approve with nits** — merge after trivial doc/wording fixes
- **Request changes** — blockers listed with file/line or command evidence
- **Defer** — out of scope; create ADR or follow-up task

## Staff Engineer Approval Gate

Final gate—answer only after the checklist above:

**Would I confidently approve this as a Staff Engineer reviewing another Staff Engineer's pull request?**

Required answer: **YES** or **NO**

**If YES:** one concise sentence explaining why the work is ready for approval.

**If NO:** list every blocking concern. For each concern:

- classify as one of: correctness · architecture · maintainability · performance · security · reliability · testing · documentation · product/assignment alignment · evidence/validation
- specify the required remedy
- do **not** recommend commit or push until remedied

**Insufficient alone for YES:**

- typecheck passing
- tests passing
- visual appearance
- an agent claiming success
- scope completion without runtime evidence

**Required for YES:**

- confidence in correctness and assignment alignment
- sound architecture and maintainability
- bounded resource behavior and failure handling
- validation evidence appropriate to the change
- honest documentation and long-term ownership clarity

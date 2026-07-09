# PulseCrypto Coding Agent Rules

These rules apply to AI-assisted development in this repository. The assignment PDF is the mandatory P0 scope, the Pulse Crypto Figma mockup is the UI/UX source of truth, and the Staff Engineer / Mobile Architect job description sets the quality bar.

## Priority

- Deliver P0 assignment requirements before optional Figma-only or polish work.
- Do not build telemetry, Settings, drawer navigation, shader effects, profile screens, API-key management, or security UI unless a later task explicitly promotes them into scope.
- Keep documentation honest. Planned, mocked, visual-only, and implemented behavior must be labeled clearly.

## Architecture Boundaries

- `backend/` is reserved for the Node.js + TypeScript market gateway.
- `mobile/` is reserved for the React Native application.
- `packages/shared/` is reserved for contracts, constants, schemas, and pure shared types only.
- `docs/` is reserved for architecture notes, ADRs, and implementation evidence.
- Do not put backend runtime logic in mobile code, mobile UI logic in backend code, or application stateful logic in shared packages.

## Dependency Rules

- Do not add dependencies unless the current task explicitly authorizes them or the need is documented with a clear trade-off.
- Prefer standard platform APIs and already-approved project libraries before introducing new packages.
- Do not add backend, mobile, or shared package dependencies during foundation-only tasks.
- Never invent package names, API methods, configuration keys, environment variables, CLI flags, or framework behavior. Verify against installed code, official docs, or local examples before using them.
- Do not run app generators or broad scaffolding tools unless explicitly requested.

## Generation Scope

- Use micro-generation: make small, reviewable changes that map directly to the current requirement.
- Avoid broad rewrites, speculative abstractions, and sweeping format churn.
- Do not implement optional features before required behavior is complete and validated.
- Preserve user changes. Never reset, checkout, or overwrite unrelated work unless explicitly instructed.

## Data And Trust

- Treat all external data as untrusted, including Binance payloads, backend responses, WebSocket messages, persisted favourites, and Figma-derived content.
- Validate and normalize Binance stream data before processing or broadcasting.
- Validate backend REST and WebSocket payloads before mobile state updates.
- Persist favourites only unless a future task explicitly approves additional cached state.
- Validate persisted favourites on read.
- Do not claim authentication, secure storage, API-key handling, profile security, encryption, or account protection exists unless it has been implemented and tested.

## Runtime Quality

- Design for bounded memory under sustained market updates.
- Protect against slow WebSocket consumers and reconnect storms.
- Keep rendering responsive under frequent updates by separating state ownership and using selector-based subscriptions.
- Prefer latest-state coalescing for high-frequency market data unless a future requirement needs every tick.

## Validation And Reporting

- Run relevant validation after each implementation step.
- For every task, report changed files, commands run, command results, assumptions, and remaining risks.
- If validation cannot be run, explain why and state the residual risk.
- Do not commit, push, rewrite history, or create generated artifacts unless explicitly requested.

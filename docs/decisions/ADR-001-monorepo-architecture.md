# ADR-001: Monorepo Architecture

Status: Accepted

Date: 2026-07-09

## Context

PulseCrypto must include a Node.js backend, a React Native mobile app, shared contracts, and architecture documentation. The assignment is small enough to review as one unit, but it still needs strict boundaries between backend runtime logic, mobile UI/state logic, and shared contracts.

## Decision

Use a pnpm monorepo:

- `backend/` for the Node.js + TypeScript market gateway.
- `mobile/` for the React Native app.
- `packages/shared/` for contracts, constants, schemas, and pure shared utilities only.
- `docs/` for architecture notes and ADRs.

## Consequences

- Contracts can be reviewed and shared without duplicating shapes across backend and mobile.
- Setup remains simple for an assignment while still showing production-oriented boundaries.
- The shared package must stay narrow. It must not become a dumping ground for runtime services, stores, or UI components.

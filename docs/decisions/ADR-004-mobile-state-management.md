# ADR-004: Mobile State Management

Status: Accepted

Decision owner: Dinitha Gamage

Scope: PulseCrypto assignment

Date: 2026-07-09

## Context

The mobile app must render a live watchlist, search/filter state, persisted favourites, market details, connection status, offline behavior, reconnect behavior, and pull-to-refresh metadata. Market updates are high-frequency, while metadata and favourites change much less often.

## Decision

Use separated state ownership and selector-based rendering:

- connection state
- pair metadata
- live market snapshots
- favourites persistence
- search/filter UI state
- selected pair/detail state

Components should subscribe only to the slices they need. High-frequency market updates should not force unrelated rows, search controls, navigation, or favourite state to re-render.

Implementation outcome: Zustand was selected for separated stores and selector-based subscriptions, while AsyncStorage is limited to validated favourites persistence. The selection is covered by store, selector, persistence, and rendering-boundary tests.

## Consequences

- Rendering performance can be reasoned about by update frequency.
- Persistence and live streaming concerns remain separate.
- Selectors and memoization become part of the implementation quality bar.
- The team must avoid hiding broad global updates behind convenient but expensive store patterns.

# UI Guidelines

Mobile UI engineering standards for PulseCrypto—performance-first, Figma-aligned, assignment-honest.

Figma scope: [figma-rules.md](./figma-rules.md)  
Architecture: [architecture-principles.md](./architecture-principles.md)  
Theme source: `mobile/src/theme/colors.ts`

## Figma MCP (UI/UX tasks)

For every UI/UX implementation task, follow the permanent MCP evidence rule in [figma-rules.md](./figma-rules.md):

- Inspect [Pulse Crypto Mockup](https://www.figma.com/design/JYfr5h2vC9IFKtX3vasmZk/Pulse-Crypto-Mockup?node-id=0-1&p=f) through Figma MCP **before** implementing.
- Export and use Figma icons, SVGs, and images—do not manually recreate assets that exist in Figma.
- Screenshots are fallback only; report node IDs, exported paths, and visual deltas in [reporting-template.md](./reporting-template.md).
- Do not claim Figma was used unless MCP was invoked in that task.

## Design tokens

Use centralized theme tokens—not ad hoc hex in screens.

| Token role | Foundation value | Usage |
| --- | --- | --- |
| Background | `#0B0E14` | App shell, safe areas |
| Surface | theme `colors.surface` | Cards, tab bar |
| Buy / positive | `#00C57A` | Active tab, positive delta |
| Sell / negative | `#FF3B69` | Negative delta, sell pressure |
| Text hierarchy | primary / secondary / muted | Titles, body, labels |

New tokens require justification in task report; prefer extending `colors.ts` over inline styles.

## Navigation

- **Bottom tabs** for Markets (default), Terminal, Telemetry, Settings.
- Terminal maps to **market detail** assignment surface when implemented—not a trading terminal with execution.
- Telemetry and Settings remain **honest placeholders** until promoted by ADR or task.

## Rendering under load

- Partition state: connection, metadata, snapshots, favourites, UI filters—separate stores/selectors.
- Components subscribe via **narrow selectors**; list items re-render only when their pair data changes.
- Prefer **latest snapshot** display over animating every tick.
- Price flash: short, state-driven; no infinite loops.
- Order book: animate discrete updates; cap visible depth per assignment and performance review.

## Lists and search

- Watchlist uses virtualized list when pair count exceeds trivial demo set.
- Search/filter is client-side over metadata + live snapshot map unless ADR specifies server filter.
- Favourite toggle must not block the render thread—optimistic UI with validated persistence.

## Connection and offline UX

- Visible connection indicator on watchlist when assignment requires it.
- Show **last-known valid** snapshot data when socket is down; do not clear prices to zero.
- Reconnect with bounded backoff—policy in ADR-005; mobile implements client side.

## Pull-to-refresh

- Refreshes **metadata** via REST only.
- Does not tear down WebSocket subscription.
- Clear loading state; surface errors without corrupting live snapshot store.

## Placeholder screens

Use `PlaceholderScreen` pattern:

- Title names the future surface
- Subtitle describes assignment intent
- Note card states foundation status and explicit non-implementation

Do not seed fake prices, fake auth, or fake API keys for visual fullness.

## Accessibility and layout (baseline)

- Minimum tap targets 44×44 dp equivalent
- Support safe areas via `react-native-safe-area-context`
- Portrait-first per `app.json`; tablet not P0

## Android-specific

- Backend base URL from device: `http://10.0.2.2:3000` (HTTP), `ws://10.0.2.2:3001` (WS)
- Validate UI on `PulseCrypto_API_35` emulator when changing runtime UI
- Expo Go developer menu on first launch is not a defect—see README

## Assets and icons

- Prefer Figma MCP exports into `mobile/assets/` per [figma-rules.md](./figma-rules.md).
- Use Expo asset pipeline for bundled icons and splash.
- No third-party icon packs unless task authorizes.
- Tab icons may be text-only in foundation; upgrade with Figma-exported assets when implementing P0 screens.

## Review criteria

UI changes fail review if they:

- Re-render the full tree on each `market.snapshot.batch`
- Claim live data without WS/REST wiring
- Introduce undeferred Figma-only flows (Settings security, API keys)
- Bypass theme tokens for one-off styling that should be shared

See [review-checklist.md](./review-checklist.md).

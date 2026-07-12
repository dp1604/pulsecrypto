# Figma Rules

**Owner:** Figma MCP policy, Figma scope (P0 vs deferred), asset export discipline.

Official file: [Pulse Crypto Mockup](https://www.figma.com/design/JYfr5h2vC9IFKtX3vasmZk/Pulse-Crypto-Mockup?node-id=0-1&p=f)

UI standards: [ui-guidelines.md](./ui-guidelines.md) · Reports: [reporting-template.md](./reporting-template.md) · ADR: [decisions/ADR-006-figma-ui-scope.md](./decisions/ADR-006-figma-ui-scope.md)

## Priority rule

**Assignment P0 > Figma P0 surfaces > Figma P1/P2 chrome.**

Deferred Figma surfaces must not receive fake functional behavior.

## Permanent MCP evidence rule (UI/UX tasks)

For **every UI/UX implementation task**:

1. **Figma MCP is the primary source.** Inspect the Pulse Crypto Figma file through MCP **before** implementing layout, typography, color, icons, or imagery.
2. **Use exported Figma assets**—icons, SVGs, images—when they exist and can be exported. Do not manually recreate assets already present in Figma.
3. **Uploaded screenshots are fallback/reference only**, not a substitute for MCP inspection when MCP is available.
4. **Do not claim Figma was used** unless MCP was actually invoked in that task.
5. **Report in** [reporting-template.md](./reporting-template.md):
   - MCP availability (available / unavailable + exact error)
   - Figma file URL and **exact node IDs** inspected
   - Screens/components inspected
   - Exported asset paths (under `mobile/assets/` or task-authorized location)
   - Screenshot fallback: yes/no, reason if yes
   - Known visual deltas vs Figma

If MCP is unavailable, implement assignment-required **behavior** with theme tokens, document visual delta, and do not imply pixel parity.

## P0 surfaces (implemented)

- Watchlist (pair, price, 24h change, connection indicator, favourite toggle)
- Search / filter
- Market details (price, pressure, spread, bids, asks, timestamp)
- Offline / reconnect affordance
- Pull-to-refresh metadata (without killing WebSocket stream)
- Market Details LAST PRICE tick-direction animation; Order Book depth transitions; Market Depth presentation
- Watchlist prices remain neutral without price flash (STEP-16B)

## Deferred unless explicitly promoted

Per `AGENTS.md`: functional Settings, Telemetry dashboards, drawer navigation, profile/account, API-key/security UI, shader effects, trading beyond viewing.

Placeholder screens may exist for navigation honesty only.

## MCP workflow (required for UI tasks)

```text
Parse fileKey + nodeId from Figma URL
  → get_design_context / get_metadata (MCP)
  → export icons/SVGs/images via MCP where available
  → map tokens to mobile/src/theme/ (see ui-guidelines.md)
  → implement smallest screen slice
  → emulator screenshot + report visual deltas
```

Do not guess tokens from memory. Do not add UI kits to substitute for Figma exports unless authorized.

## Design-to-code discipline

- MCP reference output is **input**, not drop-in production code—adapt to React Native and project structure.
- Dark-theme intent: foundation background `#0B0E14` family.
- Code-to-design (Figma ← code) is P2 unless requested.

## Honesty

Placeholder UI uses `PlaceholderScreen` copy pattern. README and [architecture.md](./architecture.md) stay synchronized with implementation status.

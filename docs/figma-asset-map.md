# Figma asset map

PulseCrypto semantic mapping for exported Figma PNG icons.

Source archive: `icons_and_graphic.zip` (16 usable PNGs, 16 `__MACOSX` AppleDouble entries ignored).

Figma MCP was unavailable during initial asset export; supplied reference screenshots and pixel inspection were used as the visual authority.

## Bottom tab icons

| Original file | Semantic file | Visual | Approved use |
| --- | --- | --- | --- |
| Container (12).png | terminal-analysis.png | Line/chart analysis symbol with circular point | Terminal bottom-tab icon |
| Icon (2).png | markets-trend.png | Rising trend line | Markets bottom-tab icon |
| Container (7).png | telemetry-bars.png | Framed vertical bar-chart panel | Telemetry bottom-tab icon |
| Container (8).png | settings.png | Settings cog | Settings bottom-tab icon |

## Top app bar icons

| Original file | Semantic file | Visual | Approved use |
| --- | --- | --- | --- |
| Container (4).png | menu.png | Green hamburger menu | **Superseded** — Market Details now uses SVG back arrow (`BackIcon`) matching `goBack()` |
| Container (5).png | live-signal.png | Green broadcast/live signal | Market Details top app bar right indicator |

## Reserved (not used on current surfaces)

| Original file | Semantic file | Notes |
| --- | --- | --- |
| Container (9).png | terminal-lightning.png | Former incorrect Terminal tab icon |
| Icon (3).png | telemetry-gauge.png | Former incorrect Telemetry tab icon |
| Container (12).png | — | No longer duplicated in Markets search field |

## Search field

The supplied archive does not include a dedicated plain search icon. The incorrect `market-search.png` reuse of `Container (12).png` was removed; the search field remains text-only with standard padding.

## Reference measurements (Market Depth)

From `Section - Market Depth Visualization.png` (390×300):

- Legend/title region height: ~60dp
- Plot canvas height: 240dp at 390dp width
- Plot-relative center valley Y: 0.375 (visible valley near y=150 with plot top ~60)
- Baseline Y (area closure): 1.0
- Summary card offsets: right 16dp, bottom 16dp
- Minimum valley-to-card gap target: 28dp
- Chart border width: 0
- Internal chart padding: 0 horizontal / 0 vertical

## Display coalescing note

Network ingestion remains at the backend 100ms broadcast cadence. Mobile visual publication is latest-state coalesced to 250ms to protect frame budget while preserving the newest accepted batch.

## Font-family deviation

Figma specifies Hanken Grotesk, Inter, and JetBrains Mono. This task uses system sans-serif for headings/body and platform monospace/tabular numerics for market values. No font packages were added.

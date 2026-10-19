# Visualization

## Implemented interaction model

The default Atlas is a full-screen, top-to-bottom hierarchy: Core forms the crown, provider edge and aggregation occupy the middle, and gNB/cell populations spread below. It projects precomputed xyz coordinates onto Canvas 2D while preserving the layer hierarchy, with subtle orbit, zoom, health glow, typed edge colors, selection, and local filters. Floating controls preserve the canvas as the primary experience.

Single-click opens inspection without changing context. Double-click—or the explicit details action—transitions to a card-based dependency workspace. That workspace groups a three-hop neighborhood into Core, provider edge, aggregation, gNB, and cell columns. Operators can reverse the semantic flow between Origin → Impact and Impact → Origin, click cards to highlight paths, and double-click a card to refocus. Escape returns to the same Atlas camera and selection. Details show stable ID, class, market, criticality, health, measurements, and adjacent typed edges.

## Visual semantics

- Amber: Core; cyan: Transport; blue: RAN.
- Green/normal layer color: healthy; amber override: degraded; pink/red: critical.
- Solid lines: primary relationships; dashed: backup.
- Bright nodes/edges: selection or active fault; dim context remains visible only in an unfocused view.

Health must never be encoded only by hue in production; add shapes/icons, labels, and patterns for accessibility. Keyboard navigation, focus states, reduced motion, high contrast, screen-reader summaries, and non-canvas detail tables are roadmap requirements.

## Scaling path

Canvas is appropriate for this hundreds-node prototype. Move to WebGL instancing for tens/hundreds of thousands: typed arrays become GPU buffers without object expansion; edge visibility uses shader attributes; node picking uses an offscreen ID buffer; text uses a culled atlas; camera motion uses requestAnimationFrame. Precompute layouts server-side and avoid full force simulation in each browser.

Use semantic levels of detail: nation/region clusters, market backbone, device neighborhood, then interfaces/cells. Set visible node/edge budgets, aggregate dense edges, prioritize anomalies and selected paths, and preserve a stable mental map between levels. A geographic view should be synchronized but remain a separate projection of the same IDs.

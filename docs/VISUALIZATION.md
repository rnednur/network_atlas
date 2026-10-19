# Visualization

## Implemented interaction model

The constellation projects precomputed xyz coordinates onto Canvas 2D, with rotation, tilt, zoom, health glow, typed edge colors, selection, and local filters. The left-to-right view constrains columns to Core, Transport, and RAN while retaining market-relative vertical grouping. Directed arrows appear in this mode.

Search uses the API and selecting a result focuses a one-hop neighborhood. Upstream and downstream actions request directed two-hop neighborhoods. Repeated expansion adds one hop, capped at six in the UI and eight in the engine. Escape clears the focused subgraph. Details show stable ID, class, market, criticality, health, measurements, and adjacent typed edges.

## Visual semantics

- Amber: Core; cyan: Transport; blue: RAN.
- Green/normal layer color: healthy; amber override: degraded; pink/red: critical.
- Solid lines: primary relationships; dashed: backup.
- Bright nodes/edges: selection or active fault; dim context remains visible only in an unfocused view.

Health must never be encoded only by hue in production; add shapes/icons, labels, and patterns for accessibility. Keyboard navigation, focus states, reduced motion, high contrast, screen-reader summaries, and non-canvas detail tables are roadmap requirements.

## Scaling path

Canvas is appropriate for this hundreds-node prototype. Move to WebGL instancing for tens/hundreds of thousands: typed arrays become GPU buffers without object expansion; edge visibility uses shader attributes; node picking uses an offscreen ID buffer; text uses a culled atlas; camera motion uses requestAnimationFrame. Precompute layouts server-side and avoid full force simulation in each browser.

Use semantic levels of detail: nation/region clusters, market backbone, device neighborhood, then interfaces/cells. Set visible node/edge budgets, aggregate dense edges, prioritize anomalies and selected paths, and preserve a stable mental map between levels. A geographic view should be synchronized but remain a separate projection of the same IDs.

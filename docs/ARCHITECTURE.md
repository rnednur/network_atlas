# Architecture

## Goals and boundaries

Network Atlas is a read-optimized topology and dependency experience. StarRocks remains the analytical source; Atlas does not turn the browser into a warehouse client. Relatively stable topology, rapidly changing operational state, and historical analytics are separate data products with separate update paths.

## Data flow

1. Inventory, associations, circuits, sites, and service mappings land in StarRocks.
2. A snapshot builder reads a consistent source watermark, normalizes records, rejects referential errors, assigns dense snapshot-local indexes, computes layouts and forward/reverse CSR, and writes to a staging version.
3. CI validates counts, checksums, semantics, representative traversals, and compatibility.
4. Files are uploaded under `snapshots/<version>/`. Only after upload and verification is `current.json` replaced atomically.
5. Browser clients fetch `current.json`, the manifest, and selected rendering bundles through CDN. The Graph API memory-maps or loads the same version for bounded traversal.
6. A state publisher independently emits health deltas keyed by stable node ID. Historical KPI and incident queries go to a separate investigation service backed by StarRocks.

## Components

- **Snapshot builder:** batch/change-driven extraction, normalization, graph validation, deterministic bundle output, publishing.
- **Object store/CDN:** immutable versioned bytes. Never mutate a published version.
- **Graph API:** per-version read-only graph plus a replaceable health overlay. Endpoints have hard result and hop limits.
- **Browser:** rendering, selection, local edge filtering, cached bundles, progressive detail.
- **State pipeline:** sequence-numbered deltas, heartbeats, reconnect cursor, snapshot fallback.

The prototype combines the Graph API and static server in one Node process. The boundary is deliberate so they can later be deployed independently.

## Availability and consistency

Topology uses snapshot consistency: a request is evaluated against one version. Health is eventually consistent and includes sequence/time metadata. API responses should return both topology version and state watermark in production. Rollback means changing the pointer to a previously validated immutable version. Graph API pods finish loading and validating a new version before becoming ready.

## Failure modes

- Missing/corrupt bundle: fail closed, keep the last validated version, alarm on checksum failure.
- Partial publish: impossible to discover until `current.json` changes; lifecycle rules clean abandoned staging data.
- State gap: client detects sequence discontinuity and requests a full state snapshot.
- Oversized traversal: return a truncated flag and continuation/frontier token rather than consuming unbounded memory.
- Source deletion ambiguity: reconcile full keys or consume a reliable CDC/deletion stream; an ingestion timestamp alone is insufficient.

## Decisions captured by v3

Stable string IDs cross interfaces; dense integers stay inside a snapshot. Relationship semantics are explicit. Forward and reverse indexes are separate. Layout is precomputed. Rendering bundles and query indexes share one manifest/version. Physical links are bidirectional; dependency/control relationships retain direction.

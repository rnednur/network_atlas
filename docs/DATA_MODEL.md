# Data model

## Node

Required fields are `id`, `name`, `type`, `layer`, `market`, and `criticality`. `id` is a stable inventory identifier and must not be recycled. The synthetic model uses these types:

| Layer | Types | Meaning |
|---|---|---|
| Core | AMF, SMF, UPF | 5G control and user plane functions |
| Transport | PE, AGG | Provider edge and aggregation routers |
| RAN | GNB, CELL | Radio node and sector/cell |

Production attributes belong in a schema-governed metadata store and may include vendor, model, software, site, region, owner, lifecycle, latitude/longitude, capacity, and authorization tags. High-frequency KPI values are not topology attributes.

## Edge

Every edge has a stable ID, source, target, type, directed flag, and weight.

| Type | Direction | Interpretation |
|---|---|---|
| `PHYSICAL` | bidirectional | physical connectivity |
| `CARRIES` | directed or bidirectional | source carries target traffic/path |
| `CONTROLS` | directed | source controls or terminates target signaling |
| `DEPENDS_ON` | directed | target depends on source; source → target is blast-radius direction |
| `BACKUP` | directed | alternate/standby relationship, lower default weight |

Real deployments should add `valid_from`, `valid_to`, `source_system`, confidence, capacity, circuit ID, and protection group. Consumers must never collapse all types into generic reachability for impact claims.

## Health overlay

Health uses stable node ID, `healthy|degraded|critical|unknown`, event time, observation time, sequence, and optional measurements. Topology validity and health validity are independent. A removed node's late event should be ignored or quarantined.

## Invariants

- IDs are unique within their entity class; every endpoint exists.
- Code tables are immutable inside a schema major version.
- Directed dependency orientation is upstream prerequisite → downstream dependent.
- A published snapshot is immutable and internally referentially complete.
- Unknown values are represented explicitly, never silently mapped to healthy.

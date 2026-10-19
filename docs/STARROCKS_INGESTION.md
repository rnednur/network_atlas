# StarRocks ingestion

## Source contract

Create governed views for nodes, edges, and current health rather than coupling the builder to raw vendor tables. Each extract must expose stable IDs, source system, source update time, validity, deletion/tombstone state, and a monotonic extraction watermark where possible.

Illustrative topology views:

```sql
SELECT element_id, element_name, element_type, market, site_id,
       latitude, longitude, source_updated_at, is_deleted
FROM atlas_node_current
WHERE source_updated_at <= :snapshot_watermark;

SELECT relationship_id, source_id, target_id, relationship_type,
       is_directed, weight, source_updated_at, is_deleted
FROM atlas_edge_current
WHERE source_updated_at <= :snapshot_watermark;
```

Use parameter binding. The exact DDL, distribution keys, partitions, and materialized views depend on volume and existing schemas.

## Snapshot builder stages

1. Record a consistent watermark and extraction run ID.
2. Export partitions in deterministic ID order, preferably using Arrow/Parquet or streaming result pages rather than huge JSON results.
3. Normalize enums and IDs; quarantine invalid rows with reason codes.
4. Reconcile deletions. If source feeds lack tombstones, compare complete key sets with the previous snapshot.
5. Enforce endpoint existence, uniqueness, allowed cross-layer relationships, and validity intervals.
6. Join only slow-changing display attributes; do not denormalize high-frequency PM samples.
7. Assign dense indexes, calculate layout/CSR, build files, validate and publish.
8. Write run metrics and accepted/rejected counts back to an audit table.

## Incremental strategy

Start with full market snapshots because they are simple and auditable. Move to partition rebuilds when scale requires it. Change capture must include deletes and late-arriving corrections. Compact several deltas into a new base snapshot; never require a browser to replay an unbounded delta chain.

Current health should be a narrow latest-state table or materialized view keyed by element ID. Historical PM/alarm investigations remain parameterized StarRocks queries behind an API, not part of the bundle builder.

## Quality gates

Compare counts and type distributions to baselines; reject unexpected deletion spikes, dangling endpoints, duplicate IDs, cycles in edge classes declared acyclic, coordinate explosions, and checksum drift for identical inputs. Store source watermark and builder version in the manifest provenance section in production.

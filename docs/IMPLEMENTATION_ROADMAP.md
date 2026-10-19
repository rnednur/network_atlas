# Implementation roadmap

## Current: validated prototype

Complete: deterministic synthetic model, binary/manifest builder, forward/reverse adjacency, API traversal/search/path, SSE synthetic health, both interactive views, typed filters, tests, and engineering specifications. Exit evidence is `npm run verify` plus a browser smoke test.

## Phase 1 — pilot data and contracts

- Agree canonical node/edge ontology, stable ID owners, direction semantics, authorization tags, validity and deletion handling.
- Implement read-only StarRocks governed views and a builder service with run audit/quarantine outputs.
- Publish one non-sensitive market to private GCS with conditional pointer update and rollback.
- Add OIDC, market-scoped RBAC, request audit, limits, health gap recovery, CI/CD, SBOM and observability.

Exit: source-to-bundle reconciliation is explainable; zero dangling edges; rollback tested; security review passed; pilot SLOs measured.

## Phase 2 — operational market beta

- WebGL instanced renderer, accessible fallback, stable layouts, labels/picking, cluster LOD and geographic synchronization.
- Production graph service with memory-mapped bundles, version-aware readiness, result truncation/frontier tokens and load tests.
- Real health pipeline, alarm episodes and stale/unknown handling; link to historical StarRocks investigation queries.
- Operator workflows: shareable selection URLs, saved views, fault overlay, path evidence and export governance.

Exit: representative market size meets measured load/traversal/frame SLOs; fault drills and authorization tests pass; operators validate usefulness.

## Phase 3 — regional/national scale

- Partition manifests and cross-partition gateway indexes; automated compaction and retention.
- Multi-region serving/cache strategy, capacity autoscaling, disaster recovery, progressive rollout and compatibility matrix.
- Blast-radius scoring that respects active/backup capacity and uncertainty; temporal playback with topology version alignment.

Exit: national capacity test, regional failure exercise, bounded fan-out, published SLO/error budget, and cost envelope accepted.

## Phase 4 — advanced investigation

Candidate work, contingent on evidence quality: service/slice dependencies, circuit/interface drill-down, topology confidence, change impact, anomaly correlation, agent-facing evidence APIs, and root-cause hypotheses. These must expose provenance and uncertainty; a reachable path alone is not proof of causality.

## Backlog acceptance template

Each capability needs data contract, authorization behavior, version/consistency rule, performance budget, failure behavior, telemetry, accessibility impact, tests, rollout/rollback, and operator acceptance criteria. Avoid declaring production readiness based only on a compelling visualization.

# Performance and scale

## Prototype baseline

Run `npm run verify` to measure correctness locally. The package deliberately avoids claiming production benchmarks: hardware, topology shape, cache state, authorization, and payload partitioning materially change results.

## Target service objectives to validate

Initial engineering targets: cached manifest/bundle TTFB under 100 ms regionally; search p95 under 100 ms; bounded two-hop traversal p95 under 150 ms; state delivery lag under 10 seconds; interactive camera frame rate 55+ FPS for the supported visible budget; snapshot publish with zero partial visibility. These are proposed targets, not measured results.

## Capacity model

Raw node render record is 16 bytes plus 12 position bytes. Raw edge record is 16 bytes. CSR uses four bytes per offset plus eight per adjacency reference; undirected relationships create two references. Metadata strings often dominate and should be partitioned or fetched on demand. Account separately for decoded JS objects, GPU duplication, indexes, HTTP buffers, and health maps.

## Optimizations in order

1. Measure cold/warm bundle load, parse/decode, memory, traversal, draw time, and interaction frame time.
2. Brotli/gzip JSON metadata; binary numeric arrays usually compress well too, but test CPU/network tradeoffs.
3. Partition by market and semantic LOD; keep cross-partition gateway edges in a small index.
4. Memory-map bundles in the Graph API and build no per-request graph objects.
5. Cache authorized traversal results by snapshot version, scope, root, direction, edge set, and hop count.
6. Adopt WebGL instancing and GPU picking; cap visible edges and labels.
7. Horizontally shard Graph API ownership by partition; route queries to owners and bound cross-shard fan-out.

Load tests must use realistic degree distributions and supernodes. Include corrupt bundles, reconnect storms, pointer flips, cold pod starts, and simultaneous popular-node expansion. Track p50/p95/p99, allocation rate, resident memory, event-loop delay, queueing, and truncation frequency.

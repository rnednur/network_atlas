# Graph API

The prototype API is read-only JSON except for the SSE stream. Stable IDs are URL-encoded. Unknown routes and IDs return JSON errors. Production responses should additionally carry snapshot version, request ID, authorization scope, truncation metadata, and state watermark.

| Endpoint | Purpose |
|---|---|
| `GET /api/status` | service/version/count readiness |
| `GET /api/nodes?query=&type=&market=&limit=` | case-insensitive search; limit capped at 100 |
| `GET /api/nodes/:id` | node detail |
| `GET /api/neighborhood/:id?hops=&direction=&edgeType=` | bounded subgraph; direction is `both`, `upstream`, or `downstream`; repeat `edgeType` |
| `GET /api/path?from=&to=` | shortest directed path, maximum 12 hops |
| `GET /api/health?since=` | current synthetic overlay and sequence |
| `GET /api/faults` | non-healthy elements |
| `GET /api/health/stream` | `health` SSE events every three seconds |

Example neighborhood result:

```json
{"root":"ATL-AMF-01","nodes":[{"id":"ATL-AMF-01","depth":0}],"edges":[]}
```

Production controls: authenticate before search to avoid inventory disclosure; enforce market/tenant predicates before graph traversal; cap nodes, edges, hops, time, and response bytes; rate-limit by principal; validate enumerations; audit sensitive lookups; paginate search; and use opaque continuation tokens for truncated frontiers. Do not construct SQL directly from query parameters.

Errors use `{ "error": "node_not_found" }` with an appropriate HTTP status. A successful path with no reachable route returns empty arrays, distinguishing absence of a route from absence of an endpoint.

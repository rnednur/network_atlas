# GCS serving and publication

## Object layout

```text
gs://network-atlas-prod/
  current.json
  snapshots/2026-10-19T010000Z-a1b2c3/
    manifest.json
    nodes.bin
    positions.bin
    edges.bin
    adjacency-forward.bin
    adjacency-reverse.bin
    metadata.json
```

Use globally unique, immutable version names. The prototype mirrors this pattern under `/bundles/` but shortens the public manifest path by one segment.

## Safe publish protocol

Upload to a new version prefix, set exact content types, attach checksum/build metadata, read back and verify, run a canary loader, then replace `current.json` with a generation-match precondition. Two builders must not win the pointer race. Keep the last known-good pointer for rollback.

Suggested caching: versioned objects `public, max-age=31536000, immutable`; manifest can also be immutable inside its version; discovery pointer `no-cache` or a very short TTL. Private inventory should use an authenticated load balancer/CDN, signed cookies or short-lived signed URLs, and a private bucket. Do not make the bucket public merely for browser convenience.

Enable uniform bucket-level access, public access prevention, encryption policy, audit logs, retention/lifecycle rules, versioning where recovery policy requires it, and separate writer/reader service accounts. The builder gets create-on-new-prefix and conditional pointer-update rights; serving identities get object read only.

Configure CORS only for exact approved UI origins and `GET/HEAD`; expose ETag and range headers if clients use them. Cloud CDN should honor immutable URLs. Large deployments should partition by region/market and level of detail so browsers fetch a manifest index followed by only the required tiles.

Monitor pointer age, publish duration, object/checksum failures, CDN hit rate, egress, 4xx/5xx rates, time to first byte, and client bundle load failures. Test rollback and missing-object behavior regularly.

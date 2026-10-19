# Security

Telecom topology is sensitive operational data. Production defaults should assume private access, least privilege, traceability, and data minimization.

## Threats and controls

- **Inventory enumeration:** OIDC/OAuth authentication, role/market authorization before search, response minimization, rate limits, and audit logs.
- **Cross-scope traversal:** apply authorization to every visited node/edge, not only the root. Prevent hidden-node existence leaks through counts and timing where required.
- **Bundle tampering:** TLS, private bucket, SHA-256 verification, signed build provenance, immutable versions, and schema validation before load.
- **Path/resource abuse:** normalized static paths, enumeration validation, strict hop/node/byte/time limits, concurrency budgets, and WAF protections.
- **Injection:** parameterized StarRocks queries, output encoding, a restrictive Content Security Policy, no dynamic code evaluation, and dependency scanning when dependencies are introduced.
- **Health spoofing/replay:** authenticated producers, ordered sequences, timestamps, expiry, duplicate rejection, and gap recovery.
- **Sensitive export:** disable unrestricted full-graph downloads for ordinary roles; log and watermark approved exports.

Use separate identities for builder, API, UI delivery, and operators. Store secrets in a managed secret service, rotate them, and never embed GCS credentials in the browser. Encrypt in transit and at rest; consider customer-managed keys where policy demands them. Redact subscriber/customer identifiers—the Atlas topology should normally contain infrastructure IDs and aggregated impact only.

Production readiness requires threat modeling, SAST/DAST, dependency/SBOM policy, penetration testing, incident response runbooks, backup/restore drills, vulnerability SLAs, retention rules, and privacy/legal review. The prototype has no authentication and must not be exposed to untrusted networks with real data.

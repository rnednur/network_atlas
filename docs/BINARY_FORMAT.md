# Binary bundle format

## Common rules

Files are little-endian. All `.bin` files begin with a 16-byte header:

| Offset | Type | Field |
|---:|---|---|
| 0 | char[4] | magic (`NATL`, `NPOS`, `NEDG`, `NFWD`, `NREV`) |
| 4 | uint16 | schema version |
| 6 | uint16 | fixed record size; zero for CSR |
| 8 | uint32 | record count or node count |
| 12 | uint32 | auxiliary count; adjacency reference count |

Numbers are aligned to four bytes. Strings remain in `metadata.json`; binary files refer to dense zero-based indexes. The manifest is authoritative for byte lengths, SHA-256 values, counts, code tables, and descriptions.

## `nodes.bin`

Sixteen bytes per node: `index u32`, `type u8`, `layer u8`, `health u8`, `flags u8`, `market u16`, `reserved u16`, `criticality f32`. The health field is only the snapshot baseline; the live overlay wins.

## `positions.bin`

Twelve bytes per node: `x f32`, `y f32`, `z f32`. Record order exactly matches `nodes.bin`. Layout coordinates are logical, not geographic.

## `edges.bin`

Sixteen bytes per edge: `source u32`, `target u32`, `type u8`, `directed u8`, `status u8`, `reserved u8`, `weight f32`. Source/target reference node indexes. Record order matches `metadata.json` edge order.

## CSR adjacency

`adjacency-forward.bin` and `adjacency-reverse.bin` contain `offsets u32[nodeCount+1]`, followed by `referenceCount` pairs of `neighbor u32, edgeIndex u32`. Slice `offsets[n]..offsets[n+1]` yields constant-time neighbor access. Undirected edges are inserted in both orientations. Forward follows dependency direction; reverse supports upstream tracing.

## Compatibility

Readers must reject unknown major schema versions, wrong magic, impossible lengths, out-of-range indexes, and checksum mismatches. Additive manifest fields are backward compatible. Changing record layout, code meaning, endianness, or edge orientation requires a new schema version. A snapshot version is content-immutable even if schema version is unchanged.

## Publication

Write locally/staging, fsync where relevant, calculate checksums, validate, upload all versioned objects, verify object metadata, then update the small discovery pointer. Cache versioned objects for one year with `immutable`; cache `current.json` briefly or with revalidation.

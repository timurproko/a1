## Context

`serveSessionControl` writes `<id>.json` into the private `session-controls` directory beside its endpoint and unlinks it in `dispose()`. Abrupt process death skips `dispose()`, so records accumulate. `requestSessionControl` lists `*.json`, throws `control-limit` above 256 names, then reads each candidate and verifies the owner through `inspectLiveProcess` (a `kill(pid, 0)` probe; `startIdentity` is a constant for this build). Live evidence on pc2 (2026-11-16): 2,743 records, 2,735 with dead owners, every `a1 api` call refused.

## Goals / Non-Goals

**Goals**
1. A machine with many abruptly ended sessions keeps a working API without manual cleanup.
2. Only provably dead owners are pruned; nothing about live sessions, identity checks or request fencing changes.
3. Pruning is bounded in time and count so startup and lookups stay fast even on a flooded directory.

**Non-Goals**
- Changing the record format, the transport, or the public protocol.
- Removing malformed or foreign-format records (unknown provenance; left for a human).
- A background pruning service.

## Decisions

### D1. Prune at serve time, bounded
Before publishing its own record, a starting session sweeps the directory: for each readable record whose `owner.pid` is not alive (`inspectLiveProcess` returns `null`), unlink the record and best-effort unlink the Unix socket path derived for its id. The sweep stops after a time budget (750 ms) or after examining 4,096 entries; the remainder is left for the next start. Failures are swallowed; the sweep never blocks or fails endpoint startup.

### D2. Lookup skips and prunes dead records before applying the bound
`requestSessionControl` keeps a hard ceiling on raw directory size (4,096 names → `control-limit`, defense against a flooded directory) but no longer refuses at 256 raw names. While scanning, a record whose owner is dead is unlinked opportunistically and not counted; the 256 bound applies to the number of records examined whose owner is alive (live candidates), preserving the original intent of bounding live work.

### D3. Only `null` liveness prunes
`inspectLiveProcess` returns an identity whenever the pid exists (including `EPERM`). Pruning uses only the `null` answer, so a reused pid keeps its record until that process ends; that is conservative and identical to today's acceptance logic. Malformed or oversized records throw `control-boundary` today; this change does not delete them.

### D4. Tests use the existing injectable `inspectProcess`
Fixtures write synthetic records for dead, live and foreign owners and assert: pruned on serve, lookup succeeds with >256 stale records plus one live, `control-limit` still triggers above the hard ceiling and above 256 live records, live and malformed records are untouched, and the sweep respects its budget.

## Risks / Trade-offs
- A sweep deleting a record for a process that died a moment earlier is correct; a process that is still starting has already written its record only after `inspectProcess(process.pid)` succeeded, so its own record is never pruned by itself.
- Windows pid reuse keeps a stale record alive until the reusing process exits; the bound still applies and a later sweep removes it.

## Migration Plan
Additive. Existing stale directories are cleaned by the first session start on each machine, within the per-start budget.

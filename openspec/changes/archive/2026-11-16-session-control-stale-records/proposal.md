## Why

Every interactive A1 session publishes one private discovery record for its control endpoint and removes it on ordinary shutdown. A session that ends abruptly (closed terminal, Core kill, crash, reboot) leaves its record behind. The public lookup refuses to resolve any target once the directory holds more than 256 records, so on a machine where many sessions end abruptly `a1 api` stops working for every live session. A real machine reached 2,743 records with 2,735 dead owners within four days, and the supervisor exit path (`session.exit`) was blocked by `control-limit`.

## What Changes

- Prune discovery records whose owner process is provably gone: once when a session starts its control endpoint, and opportunistically during lookup. Only a record whose owner pid no longer exists is removed; live, unreadable, foreign and malformed records are left alone.
- Apply the `control-limit` safety bound to records that survive pruning, with a much larger hard ceiling on raw directory size so a flooded directory still fails closed instead of being scanned without bound.
- Remove the stale record's transport artifact where one exists on disk (Unix socket path); Windows named pipes vanish with their process.
- Keep every existing identity, nonce, deadline and serialization check unchanged; pruning never touches a record for a live process and never selects a session.
- Document the lifecycle of discovery records and the pruning behavior for integrators.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `integration-api`: lookups stay available after abrupt session ends; stale discovery records are pruned safely and the limit bounds live candidates.

## Impact

- Production owner: `src/foundation/lifecycle/session-control.ts` (serve-time sweep, lookup-time skip/prune, bounds). No public protocol or CLI change.
- Tests: `test/foundation/lifecycle/session-control.test.ts` gains stale-record fixtures with fake process inspection; no live sessions.
- No new dependency, service or schema. Older records written by this build's identity format are handled; records of other formats are left untouched.
- Planning-only until the maintainer approves and requests implementation.

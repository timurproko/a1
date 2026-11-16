## Why

Session-control records are judged live or dead by probing their owner pid with signal 0, and a permission refusal counts as "exists". On Windows that is wrong: process and thread ids share one number space, and opening a thread id or a terminated process whose handles are still held fails with access denied. On a real machine 802 of 2,132 stale records answered `EPERM` while only 9 of those pids were real processes, so the stale-record pruning from the previous change could not get the directory under the 256-candidate bound and every `a1 api` call still failed with `control-limit`.

## What Changes

- On Windows, confirm a permission-refused pid against the live process table (`tasklist`, one run cached briefly) before treating it as alive; a pid absent from the table is dead. Unix behavior is unchanged.
- Keep the conservative answer when the table cannot be read: never invent a dead process.
- Add injectable seams for platform, signal probe and process table so the behavior is testable without Windows-specific fixtures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `integration-api`: Windows liveness checks behind session discovery and pruning no longer mistake thread ids or handle-held exited processes for live sessions.

## Impact

- Production owner: `src/foundation/lifecycle/process-liveness.ts`; callers (session control lookup/pruning, session context, composition) are unchanged.
- Tests: new `test/foundation/lifecycle/process-liveness.test.ts` with injected probes plus a real-table check on Windows.
- No protocol, record format or CLI change. Planning-only until approved and requested.

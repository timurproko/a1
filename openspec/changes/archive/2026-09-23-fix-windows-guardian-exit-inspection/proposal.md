## Why

Required CI for PR #375 once observed the Windows process guardian return a live identity for a child after the test had observed that child exit. The failure has not reproduced on current `develop`, but source inspection confirms that `--inspect-pid` currently treats a successful `OpenProcess` plus creation-time query as proof of liveness. Windows can keep a terminated process object queryable while handles remain, so the inspector can report a stable identity for an object that is no longer running.

## What Changes

- Make Windows process inspection distinguish an active process from a terminated-but-still-queryable process using the same opened OS process object used for identity inspection.
- Preserve the existing stable creation-time token for active processes, the exit-3 absent/dead contract for nonexistent or terminated processes, and explicit diagnostics for permission or API failures.
- Add deterministic native coverage for a terminated process object retained by another handle, plus public packaged-guardian coverage for active identity, termination, and repeated inspection.
- Preserve PID-reuse safety, instance ownership, Job Object containment, descendant cleanup, guardian exit propagation, and non-Windows behavior.
- Keep the repair narrow: do not weaken containment assertions, add timing sleeps as correctness, or reinterpret an uncertain inspection error as proof of death.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-supervision`: Require native process identity inspection to report an identity only for an OS process object observed active, while distinguishing terminated, absent, and uninspectable outcomes.

## Impact

The expected implementation surface is `native/process-guardian/src/windows.rs`, narrowly related native test support, `test/foundation/process-containment/windows-job.integration.test.ts`, packaged guardian validation, and the existing selected guardian-build CI step so the native regression executes before that fixture is used. The workflow refinement adds no validation selection, permission, trigger, budget, or publishing-authority change. No command syntax, persisted state schema, release format, terminal behavior, dependency, or process-termination policy changes are intended.

Issue #377 remains the source evidence. A single current focused pass does not prove the historical race impossible, and this planning change does not claim the implementation is already fixed.

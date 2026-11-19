# Implementation evidence — fix-windows-guardian-exit-inspection

## Historical finding

Issue [#377](https://github.com/timurproko/a1/issues/377) records required Development validation run [34848198613](https://github.com/timurproko/a1/actions/runs/34848198613), candidate `1fe784bd`, where `windows-job.integration.test.ts` observed the child exit and the guardian subsequently returned exit 0 instead of the dead/absent exit 3. The failure was isolated from that candidate's viewport change. A focused run on `develop` at the start of this work passed once, so that pass was retained as non-reproduction rather than evidence that the race was fixed.

## Pre-fix mechanism and reproduction

The `develop` inspector opened a PID with query access and returned its creation time without checking process-object state. A bounded 100-iteration probe using the unmodified `develop` release guardian inspected short-lived Node children immediately after their `exit` event while retaining the `ChildProcess` object:

- 7 inspections incorrectly returned exit 0 with `windows-filetime:*` identities.
- 93 inspections returned exit 3.

No private data, model request, terminal automation, timeout increase, or product state was involved. The mixed result confirms the scheduler-sensitive nature of the original fixture while reproducing the false-live outcome.

The native regression makes the OS boundary deterministic: it retains the child's Windows process handle after `wait`, verifies `WaitForSingleObject(handle, 0)` is signaled, verifies `GetProcessTimes` can still read creation metadata, and requires inspection of that exact handle to return no identity. This fails the old creation-time-only rule by construction.

## Implemented result

Windows inspection now opens one handle with synchronization and limited-query rights, observes that handle with a zero-duration wait, and reads its creation token only after an active result. Signaled objects and nonexistent PIDs return the established absent/dead outcome; failed or unexpected wait results and identity-query failures remain errors. State and identity therefore cannot silently refer to different PID generations.

The public integration repeats active inspection four times, confirms one stable PID/token, waits for the child exit event, then requires eight consecutive exit-3 results with empty output. It also checks a nonexistent positive PID. Existing Job Object descendant cleanup remains in the same focused file.

The existing selected guardian-build CI step now runs the native tests before building the fixture executable; no lane, trigger, permission, validation selection, budget, or publishing action changed.

## Focused evidence

- Native guardian tests: 4 passed, including the terminated-but-queryable retained-handle case.
- Built Windows guardian integration: 2 passed, including stable identity/death and complete Job Object tree cleanup.
- Corrected packaged release guardian probe: 0 false-live and 100 dead outcomes after confirmed child exit.
- Workflow governance and focused containment set: 16 passed.
- Build, typecheck, architecture/identity/provenance checks, documentation governance, and strict OpenSpec validation passed; strict OpenSpec reported 32/32 items.

## Remaining gates

Required exact-head CI and maintainer acceptance remain open. Cross-platform CI must compile the unchanged platform-specific paths and the Windows lane must execute both the native and public integration regressions before finalization.

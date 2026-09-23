## 1. Establish the failure and its mechanism

- [x] 1.1 Reproduce the reported `EPERM` rename failure's mechanism against the reported Windows installation; verify that one open read handle on any file under the package tree refuses the directory rename and that the same rename passes from the launcher's own module set when nothing is held.
- [x] 1.2 Trace the update transaction path from ownership release to the unlock check; verify the check ran once with no pause after a session ended and that no recent change touched it.

## 2. Verify the package is free with bounded patience

- [x] 2.1 Retry the probe rename while the error is a lock and the elapsed time is inside a fifteen-second window, doubling the pause from 100 ms to a one-second cap and trimming the last pause to the window's edge; verify the schedule ends exactly when the window closes.
- [x] 2.2 Classify only `EPERM`, `EACCES`, `EBUSY`, and `ENOTEMPTY` as a held tree; verify any other rename error fails at once with a verification diagnostic and no pause.
- [x] 2.3 Rename the tree back under its own name with the same patience and, when that never succeeds, name the probe path and the original path; verify the earlier silent single-attempt restore is gone.
- [x] 2.4 Report a persistent lock with the wait, the check count, the underlying error, the package path, the kinds of holder, and that nothing was changed; verify the outer failure line and journal are unchanged.

## 3. Prove the behaviour

- [x] 3.1 Add a deterministic unlock-probe suite with a scripted rename seam and a clock that advances only when the coordinator sleeps; verify the pass, transient-hold, persistent-hold, non-lock, probe-name hold, and restore-failure schedules and messages.
- [x] 3.2 Add Windows-gated tests that hold a real file handle under a temporary package tree; verify a handle released mid-wait lets the update proceed and a handle that is never released produces the bounded failure with the tree left in place.
- [x] 3.3 Run the existing self-update, live-cohort, process-exit, and CLI update suites, the source and bin typecheck, the architecture checks, and the code documentation policy; verify no behaviour or governance regression.

## 1. Completion-driven Windows endpoints

- [x] 1.1 Introduce a Windows endpoint owner using overlapped server/client handles, correct connection acceptance, and independently progressing read and write completion operations.
- [x] 1.2 Preserve owner-only admission, first-instance and peer verification, non-inherited custody, clone ownership, bounded connect waits, and unchanged generation-1 frame bytes.
- [x] 1.3 Carry the absolute four-second deadline through complete handshake reads, including fragmented headers/bodies, and implement operation-scoped cancel-and-drain ownership for timeout, disconnect, shutdown, and reconnect.
- [x] 1.4 Remove steady-state Windows PeekNamedPipe/sleep readiness polling from the wire reader without changing Unix endpoint behavior or reliable-control/latest-surface bounds.
- [x] 1.5 Add focused native cases for immediate/pending and partial transfers, concurrent write during pending read, peer disconnect, cancellation races, handshake expiry, and repeated reconnect resource release.
- [x] 1.6 Add a timer-request-free Windows fixture and a deterministic wait-call seam that reject readiness polling and preserve slow-peer isolation under coarse timers.

## 2. Wake and latency observations

- [x] 2.1 Extend the existing bounded opt-in progress observer with additive local monotonic completion durations and fixed transport/outer-write stages, distinguishing normal idle reads from matched-event delivery latency.
- [x] 2.2 Record attach wake-gap/repaint stages and measurement epoch boundaries without changing the existing one-shot full repaint or treating a gap as restart authority.
- [x] 2.3 Update affected observation consumers to reject invalid or cross-discontinuity latency samples and retain additive-format compatibility and diagnostic-loss reporting.
- [x] 2.4 Add focused cases for observation payload exclusion, queue pressure, wall-clock jumps, a simulated long wake gap, exactly one resume repaint, continued existing-connection traffic, and a new connection after the gap.
- [x] 2.5 Compare causally matched native input/output timings under ordinary and coarse-timer conditions against the existing budgets; document whether the legacy timer-period request remains necessary outside transport readiness without expanding cadence scope.
- [x] 2.6 Update the architecture/runbook description of endpoint cancellation, timer independence, mixed-cohort rollout, and the resident-versus-solo differential diagnosis.

## 3. Delivery bookkeeping

- [x] 3.1 Reconcile implementation results and explicit known-gap dispositions, retaining the distinction between simulated gaps and pending physical sleep/wake evidence.
- [ ] 3.2 Complete focused checks and strict OpenSpec validation, add plain acceptance outcomes, reconcile and push current develop, and validate the intended final PR body before checking its final Implementation item.

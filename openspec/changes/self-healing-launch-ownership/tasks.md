## 1. Exact supervisor identity and safe stale-record reconciliation

- [x] 1.1 Add compatible native supervisor identity publication and independently classify live, absent, exited, reused, and uninspectable process generations.
- [x] 1.2 Implement safe legacy metadata handling without equating approximate timestamps or differing identity formats with proof of PID reuse.
- [x] 1.3 Make endpoint retirement generation-checked and concurrent-recovery-safe; protect successor metadata and strengthen cleanup so a reused PID is never signalled.
- [x] 1.4 Add focused identity, compatibility, Windows exited-object, race, and cleanup-refusal regression fixtures.

## 2. Automatic bounded launch recovery

- [x] 2.1 Unify bootstrap and retained-release supervisor startup around bounded reprobe, stale-record reconciliation, replacement startup, and concurrent-winner reuse.
- [x] 2.2 Preserve profile, mode, session selection, release certification, surviving runtime ownership, and session-writer exclusion through recovery.
- [x] 2.3 Keep recovered launches silent and replace generic uncertainty prose with concise genuine-failure diagnostics backed by sanitized bounded evidence.
- [x] 2.4 Add isolated forced-termination scenarios for supervisor, guardian/root, resident roles, and all fixture-owned Node processes, including surviving-session and unrelated-process sentinels.
- [x] 2.5 Add transient timeout, concurrent launcher, interrupted recovery, unavailable inspection, identity mismatch, and no-false-success regressions.

## 3. Pre-ready bookkeeping

- [x] 3.1 Record focused validation results and explicitly disposition remaining gaps without claiming the original incident was reproduced if it was not.
- [ ] 3.2 Complete detailed task bookkeeping, prepare plain acceptance outcomes, reconcile current develop, and validate the final delivery body before checking the final implementation outcome.

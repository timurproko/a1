## 1. Crash-safe mutation coordination and recovery

- [x] 1.1 Resolve and document native location-lock integration, packaging behavior, legacy-writer exclusion proof, and conservative mixed-version fallback before implementing migration.
- [x] 1.2 Implement lifecycle-held mutation exclusion independent of metadata parsing, fully initialized metadata publication, bounded abortable acquisition, and generation-safe release/recovery.
- [x] 1.3 Implement recovery of proven-abandoned/corrupted protocol state with bounded private recovery records, preserving legacy/live/unverifiable-owner safeguards and all durable claims.
- [x] 1.4 Add focused corruption, concurrent recovery, replacement, dead/live/reused-PID, mixed-version, and real cross-process crash-release fixtures, including 155 NUL bytes and Windows behavior.

## 2. Runtime registration retry lifecycle

- [x] 2.1 Arm retries independently of initial activation success and retry transient process-inspection failures without caching permanent unavailability.
- [x] 2.2 Serialize/coalesce retries, bind publication to the current agent/session identity, and prevent publication after disposal or obsolete session switches.
- [x] 2.3 Add initial-failure-to-recovery, repeated-failure bounds, slow retry, identity switch, sibling-agent, and disposal race fixtures.

## 3. Actionable recovery diagnostics

- [x] 3.1 Distinguish mutation contention, corrupt legacy state, inspection/native availability, I/O failure, and actual worktree-ownership conflict with stable reasons and safe next steps.
- [x] 3.2 Add CLI output/privacy fixtures and read-only inventory assertions; document automatic recovery versus conservative legacy recovery without recommending blanket state deletion.

## 4. Pre-ready delivery

- [x] 4.1 Run only targeted changed-code checks, typecheck, and strict OpenSpec validation; record results and resolve substantive gaps in the design.
- [x] 4.2 Reconcile the implemented compatibility behavior and acceptance outcomes with the approved scope, preserving any explicit unresolved legacy limitation.
- [ ] 4.3 Add plain Acceptance outcomes to the existing draft, reconcile and push current origin/develop, and validate the intended final delivery body before checking the final Implementation outcome.

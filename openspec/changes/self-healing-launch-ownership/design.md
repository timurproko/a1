## Context

The reported message comes from `src/foundation/release/bootstrap.ts` after `selectCohortLaunch` classifies an unresponsive endpoint with recorded instance IDs as blocked. `endpoints.ts` currently tests numeric PID existence and then performs one 500 ms identity request. Its dead-endpoint sweep uses numeric PID existence alone. Supervisor `pidStartIdentity` is an estimated Node start timestamp, compared only to the endpoint's reply, not independently to the operating system's process generation. `ensureSupervisor` separately refuses every non-dead, non-verified owner, so changing only the displayed message or one cohort decision would not fix all launch paths.

The existing native process inspector can distinguish active process objects, absent or exited objects, and exact native creation identities. Windows already handles terminated-but-queryable process objects in that inspector. Existing cleanup code must not gain permission to terminate an unrelated reused PID merely because persisted instance lists are empty.

Read-only local observation on 2026-11-05 found one recorded installed stable 0.2.6 supervisor with three recorded instances. It responded with matching supervisor and boot identities; its observed native creation time agreed with its recorded boot time. This does not reproduce or prove the cause of the earlier failure. The observed stable release contains the historical executable guardian, while a retained preview contains the native addon, so legacy metadata and artifact compatibility must be deliberate rather than assuming every retained release has the new format.

## Goals / Non-Goals

**Goals**
- Ordinary launch recovers after forced loss of supervisor, guardian, resident roles, or all A1 processes, without manual state removal.
- PID reuse and retained Windows process objects cannot turn stale records into permanent live ownership.
- Transient handshake failure is retried within one bounded recovery budget.
- Concurrent launchers converge without deleting a successor's metadata or starting two owners of an endpoint.
- Recovery preserves surviving instances, session writer exclusivity, explicit session selection, and certified release selection.

**Non-goals**
- Resurrecting killed process memory or promising preservation of unsaved in-memory work.
- Killing all Node processes, terminating unrelated processes, disabling ownership checks, or deleting session databases.
- Treating inaccessible process identity as proof of death, bypassing permissions, or repairing arbitrary filesystem corruption.
- Replacing resident-host recovery architecture or changing update integration policy.

## Decisions

### 1. Independent process-generation evidence

Publish an additive native supervisor identity and use the existing platform inspector from trusted current runtime content. Do not load arbitrary code from metadata paths as a recovery shortcut. Keep the established handshake fields compatible. Observation distinguishes verified live owner, proven absent/exited owner, proven replaced generation, temporarily unresponsive owner, and unavailable/conflicting evidence. Empty instance lists, elapsed time, and PID existence alone never authorize termination.

Legacy metadata remains readable. A successful identity handshake remains authoritative for a live compatible legacy supervisor. A dead legacy PID is reclaimable; a live legacy PID requires independent evidence before its record can be retired. Do not compare the old approximate timestamp directly to a native token or interpret differing string formats as PID reuse. Implement and document a bounded compatibility proof for legacy reuse where the OS can establish it; otherwise preserve the process and evidence rather than inventing certainty.

### 2. One bounded startup recovery path

Share reconciliation between ordinary bootstrap, retained-active launch, and `ensureSupervisor`. Re-read metadata and retry transient connection/identity failures before deciding. Proven stale records are retired under a recovery ownership gate with an exact snapshot/generation check, followed by verified supervisor startup or joining the concurrent winner. Use an OS-released gate or another mechanism whose own owner death is recoverable; do not introduce another abandoned lock that prevents startup.

Recheck process and record identity at destructive boundaries. Never unlink an endpoint or metadata published by a newer owner. Preserve surviving instance and resident ownership; existing runtime/session admission remains authoritative, and no second writer is permitted. A killed process is recorded as interrupted, not reported as still active solely because a durable row remains. Check active-release reselection throughout recovery and preserve launch profile, mode, and explicit session selection.

### 3. Safe cleanup is distinct from launch progress

Retiring a record that names a dead/replaced generation must not signal the PID now occupying that number. Bounded termination of an actual stale idle supervisor requires exact current identity and proven idle ownership, including uncertain-instance evidence; it must not expand into a blanket process-tree kill. A genuinely live, unresponsive owner with unprovable containment cannot be killed just to satisfy startup. After bounded retries, such an exceptional unresolved conflict remains a safe failure rather than a false success. This is not the expected outcome for recoverable forced termination.

### 4. Quiet success, actionable failure

Successful recovery continues to the UI without printing ownership internals or asking the user to discover PIDs, delete state, restart supervisors, or reboot. Keep sanitized bounded reason/attempt evidence available for support. If recovery cannot safely proceed, distinguish the actual problem (for example inaccessible process inspection or persistent control connection failure) instead of repeating the generic uncertain-live-ownership paragraph. Never silently report that a new UI launched when it did not.

## Validation Strategy

Use focused unit fixtures for identity classification, metadata compatibility, bounded retry, exact-generation retirement, and cleanup refusal. Add isolated process integration fixtures that kill only fixture-owned PIDs for supervisor-only, guardian/root-only, resident-role, and all-fixture-Node loss, then exercise a fresh launch with retained control records. Include another live session and an unrelated sentinel process to prove isolation. Simulate PID reuse deterministically; exercise the Windows terminated-but-queryable process case with native fixtures. Race two launchers and crash the recovery owner before and after publication. Include stale metadata replacement, inspection denial, handshake mismatch, transient slowness, and legacy records.

Before pushing implementation, run typecheck, only the changed test files, and strict validation of this change. Platform-specific fixture results must be reported honestly; exact-head CI after readiness remains validation authority. Manual process killing in the user's running environment is not a test prerequisite.

## Risks and Known Gaps

- The earlier failure is not currently reproducible; PID reuse and transient probe timeout are code-supported failure hypotheses, not an asserted incident diagnosis.
- Historical approximate start timestamps do not supply exact native identity. Legacy recovery needs proof, not permissive string comparison.
- Global Node termination cannot preserve unsaved memory or an exit-notice watcher killed in the same action; the existing accepted limitation remains.
- A truly live inaccessible/unresponsive owner may still require a concise failure after the bounded recovery budget. This plan removes recoverable stale-state blockers, not operating-system security boundaries.
- Planned tests and implementation are not yet delivered. No production runtime state was changed during diagnosis.

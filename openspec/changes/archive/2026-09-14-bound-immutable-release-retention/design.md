## Context

See `proposal.md` for motivation. Cohort state already models active, pending, approved, rollback, and retention references, and `release-gc.ts` can delete one unreferenced release. In production, candidate recording and activation append every identity to `references.retention`, no path calls `setRetention()` or `collectRelease()`, and collection performs full content verification before deletion. The update-without-session-loss contract also means an old release can remain executable for an arbitrarily long live session after a newer release becomes active.

The cleanup path must therefore distinguish selection safety from deletion cost. It must tolerate old append-only state, update/launch concurrency, Windows file locks, interrupted recursive deletion, and releases whose supervisors remove their endpoint only after the last instance exits.

Manual acceptance of the first implementation found that logical reconciliation detached obsolete records but one two-second worker pass reclaimed no release trees: 38 detached releases remained at zero attempts and the store still occupied about 4.70 GiB. The pass consumed its allowance while preparing and completing one already-absent legacy record, then exited without arranging continuation. Its certification cleanup also compared legacy `A1` and current `a1` Windows path spellings as case-sensitive strings, and detached-worker output was discarded. The design must close these convergence and observability gaps without weakening ownership proofs.

## Goals / Non-Goals

**Goals:**

- Make the protected release set derived, bounded, and explainable.
- Preserve active, rollback, pending-transaction, live-cohort, and explicit external references.
- Convert a potentially large historical backlog into restart-safe trash without blocking interactive startup.
- Ensure deletion can never escape the managed store or invalidate a selector.
- Make cleanup resumable and observable without adding a public command requirement.
- Ensure one update-initiated maintenance chain drains ordinary eligible backlog without requiring repeated user launches or updates.
- Keep preparation cost, queue ordering, and one malformed or transiently blocked item from starving physical reclamation.

**Non-Goals:**

- Change update syntax or force existing sessions to stop.
- Delete profile configuration, credentials, resources, or sessions.
- Redesign release payload layout or dependency sharing; that belongs to `reduce-post-update-cold-start`.
- Guarantee immediate physical reclamation when Windows or antivirus software holds a file open.
- Add a permanently running cleanup daemon or require users to run a public repair command.

## Decisions

### 1. Treat retention as a reconciled protection snapshot, not activation history

A reconciliation function will derive the protected set from durable selectors, an active update transaction (including its prior release), verified live endpoint identities, and typed external holds supplied by known migration or agent authorities. Candidate recording and activation will stop monotonically appending historical IDs. Under the existing state schema, `references.retention` will be replaced with the derived snapshot whenever cleanup is planned.

The first cleanup-aware read of legacy state will not trust the old retention array as an explicit hold: production has never persisted such holds independently and every current entry was automatically appended. It will recompute the snapshot from current authorities. Future explicit holds must enter through a typed provider and be present on every reconciliation that needs them.

Alternative: retain the newest N versions. Rejected because age does not prove safety, while active/rollback/live ownership does.

### 2. Commit a cleanup plan before physical deletion

Cleanup will use a two-stage disposition:

1. Under the cohort-state lock, re-read selectors and protection inputs, replace retention with the protected snapshot, and atomically detach collectible release records.
2. For each detached direct child, validate canonical containment and identity, rename it within the same volume into a managed trash directory, then recursively delete it.

State-first detachment ensures a crash can leave an inert orphan but never a selector pointing to moved content. Store discovery recognizes detached release roots and trash as cleanup inputs, never candidates for activation.

Alternative: delete first and update state afterward. Rejected because interruption can leave active-looking state that points to missing content.

### 3. Authorize deletion by ownership and path proof, not payload integrity

Execution requires complete identity verification; deletion does not. The collector will require a canonical release-store root, a direct non-link child whose directory name matches the detached release identity, matching manifest metadata when readable, and a fresh absence check across selectors, transaction references, external holds, and live endpoints. It will not hash every payload file before removal.

Malformed, linked, escaping, or ambiguous paths are quarantined logically and diagnosed without calling recursive removal on them.

Alternative: preserve the current full verification call. Rejected because it turns cleanup of hundreds of thousands of obsolete files into another full read pass without adding deletion authority.

### 4. Separate the interactive scheduling budget from an autonomous background drain

A successful update must synchronously commit the protected snapshot and cleanup disposition after the new supervisor is verified, then start a dependency-light worker before reporting success. Launch performs the same planning and scheduling after endpoint reconciliation without awaiting physical deletion. The interactive path is bounded by planning and process-start work only; it does not spend the worker's deletion allowance.

The worker acquires one stale-reclaimable single-flight lease for the data root and drains repeated bounded batches. A batch deadline starts after discovery and state preparation, and a non-empty eligible queue receives at least one attempt even when preparation is slow. The worker continues while it makes progress, fairly rotates unattempted and previously failed release, trash, candidate, certification, dependency-layer, and cache work, and uses bounded backoff for transient Windows failures. If an overall background lifetime expires while ordinary eligible work remains, it durably records that fact and arranges a successor worker; it does not depend on another user command. A persistent external lock or ownership hold may end the chain after bounded retries, but its disposition remains durable for startup or update to retry.

A per-item recursive removal can exceed a batch deadline because Node filesystem removal is not safely cancellable. This cost is isolated to the detached worker, uses concurrency one by default, and never delays update success or interactive startup.

Alternative: await deletion of the complete backlog before update success. Rejected because the first migration can contain gigabytes and Windows may hold files transiently. Alternative: run a permanent cleanup daemon. Rejected because a single-flight, self-continuing maintenance chain provides convergence without another long-lived product service.

### 5. Reconcile retirement and abandoned artifacts through the same planner

Superseded supervisors continue removing their endpoint when their last instance exits. The next cleanup-capable coordinator then observes that the release is no longer live and detaches it unless it is rollback or otherwise protected. Private candidate directories are eligible only when no live update transaction can commit them; trash is always resumable; certification evidence is removed only after its release is detached.

A conservative age floor protects candidate directories against clocks and very recent concurrent creation, but age alone never overrides an active transaction. Queue selection is fair across artifact classes and orders retries by durable attempt evidence rather than repeatedly allowing one lexicographically first item to consume every pass.

### 6. Authorize managed evidence by canonical identity, not persisted path spelling

Certification deletion derives its only target from the canonical data root and validated release identity, verifies that target is a direct regular non-link file, and never treats a persisted diagnostics path as authority to delete elsewhere. Existing Windows paths are normalized with platform-correct canonical and case-insensitive comparison, following the same principle vanilla Pi uses for paths to loaded native dependencies. A legacy `A1` versus `a1` spelling may be diagnosed as stale metadata but does not prevent deletion of the canonical managed evidence.

Alternative: require the persisted diagnostics path to equal the newly derived path byte-for-byte. Rejected because Windows path identity is case-insensitive and the observed legacy state legitimately preserves older casing.

### 7. Persist worker lifecycle evidence and recover incomplete maintenance

Scheduling and worker execution record bounded lifecycle evidence: run identity, start and completion time, attempted/completed/remaining counts, continuation disposition, and any top-level failure. Spawn success is not treated as proof that maintenance ran. The private entry catches fatal failures and commits them to cohort cleanup state rather than relying on ignored standard error.

This adapts two useful vanilla Pi patterns: retry quarantine cleanup on both startup and update, and leave a durable incomplete marker around destructive package reconciliation. A1 retains its stronger state-first detachment, ownership checks, and background execution because Pi replaces one mutable package in place and never has A1's many live immutable cohorts or multi-gigabyte historical store.

Alternative: expose only detached-process logs. Rejected because ignored or rotated output cannot drive restart-safe continuation or exact-state acceptance.

## Risks / Trade-offs

- **[Risk] Legacy retention might contain a manually intended hold that production never modeled separately.** → Limit migration to the known old schema, preserve all typed current selectors and live endpoints, and emit migration evidence listing retained and detached IDs.
- **[Risk] Endpoint liveness changes between discovery and commit.** → Re-read under the state lock and permit only superseded releases, which cannot accept new instances, to become collectible.
- **[Risk] Windows deletion remains slow or temporarily locked.** → Rename into managed trash where possible, bound attempts, retain retry diagnostics, and resume later.
- **[Risk] State-first detachment leaves an orphan after a crash.** → Discover only canonical direct-child orphans and move/delete them through the same guarded path.
- **[Risk] A detached worker outlives the updater.** → Give it only the cleanup plan and managed roots, use the same lock/proof rules, and make every operation idempotent.
- **[Risk] Repeated launch/update scheduling creates competing workers.** → Serialize physical maintenance with a stale-reclaimable per-data-root worker lease; extra schedulers may signal work but not delete concurrently.
- **[Risk] A blocked first item starves reclaimable content.** → Track per-item attempts, rotate queue classes and identities fairly, and stop or back off only after every eligible item in the sweep receives consideration.
- **[Risk] A worker crashes after the updater reports success.** → Persist lifecycle state and top-level failure, retain every disposition, and make startup/update plus a scheduled successor able to resume the same idempotent work.
- **[Risk] Self-continuation loops forever on permanent failures.** → Bound retries and total background lifetime, persist actionable diagnostics, and continue automatically only while progress or a bounded transient retry remains.

## Migration Plan

1. Preserve the existing deterministic protection planner and state-first detached dispositions; treat the failed physical acceptance as resumable input rather than reconstructing or deleting state manually.
2. Correct canonical Windows evidence handling and add durable worker lifecycle/continuation state with backward-compatible defaults for existing cohort files.
3. Split interactive scheduling limits from worker limits, add the single-flight draining loop, fair queue selection, bounded retry/backoff, and successor scheduling.
4. Exercise the packaged private worker against a production-shaped forty-plus-release backlog, including slow preparation, large trees, a blocked item, overlapping schedulers, worker interruption, stale candidates, and legacy path casing.
5. Publish the corrected candidate and update the observed installation normally. Its existing 38 detached dispositions must be resumed automatically while active, rollback, pending, and verified live releases remain executable.
6. Manually verify release count and disk usage converge without a second user command, then close the old live session and verify later reconciliation makes that release collectible when no other authority protects it.
7. Roll back by disabling successor scheduling while preserving durable dispositions and selectors; active/rollback/live releases remain complete, trash remains unselectable, and a later corrected worker can resume it.

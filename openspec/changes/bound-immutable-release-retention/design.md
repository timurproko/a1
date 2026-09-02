## Context

See `proposal.md` for motivation. Cohort state already models active, pending, approved, rollback, and retention references, and `release-gc.ts` can delete one unreferenced release. In production, candidate recording and activation append every identity to `references.retention`, no path calls `setRetention()` or `collectRelease()`, and collection performs full content verification before deletion. The update-without-session-loss contract also means an old release can remain executable for an arbitrarily long live session after a newer release becomes active.

The cleanup path must therefore distinguish selection safety from deletion cost. It must tolerate old append-only state, update/launch concurrency, Windows file locks, interrupted recursive deletion, and releases whose supervisors remove their endpoint only after the last instance exits.

## Goals / Non-Goals

**Goals:**

- Make the protected release set derived, bounded, and explainable.
- Preserve active, rollback, pending-transaction, live-cohort, and explicit external references.
- Convert a potentially large historical backlog into restart-safe trash without blocking interactive startup.
- Ensure deletion can never escape the managed store or invalidate a selector.
- Make cleanup resumable and observable without adding a public command requirement.

**Non-Goals:**

- Change update syntax or force existing sessions to stop.
- Delete profile configuration, credentials, resources, or sessions.
- Redesign release payload layout or dependency sharing; that belongs to `reduce-post-update-cold-start`.
- Guarantee immediate physical reclamation when Windows or antivirus software holds a file open.

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

### 4. Keep update coordination synchronous and physical cleanup bounded

A successful update must synchronously commit the protected snapshot and cleanup disposition after the new supervisor is verified. Physical deletion runs with bounded concurrency and time. Work beyond that allowance is continued by a detached, dependency-light cleanup entry or by the next update/launch maintenance pass. Interactive launch may schedule cleanup after ownership reconciliation but must not await an unbounded backlog.

Cleanup diagnostics record release identity, disposition stage, attempt time, and bounded filesystem error; they do not include profile content.

Alternative: await deletion of the complete backlog before update success. Rejected because the first migration can contain gigabytes and Windows may hold files transiently.

### 5. Reconcile retirement and abandoned artifacts through the same planner

Superseded supervisors continue removing their endpoint when their last instance exits. The next cleanup-capable coordinator then observes that the release is no longer live and detaches it unless it is rollback or otherwise protected. Private candidate directories are eligible only when no live update transaction can commit them; trash is always resumable; certification evidence is removed only after its release is detached.

A conservative age floor protects candidate directories against clocks and very recent concurrent creation, but age alone never overrides an active transaction.

## Risks / Trade-offs

- **[Risk] Legacy retention might contain a manually intended hold that production never modeled separately.** → Limit migration to the known old schema, preserve all typed current selectors and live endpoints, and emit migration evidence listing retained and detached IDs.
- **[Risk] Endpoint liveness changes between discovery and commit.** → Re-read under the state lock and permit only superseded releases, which cannot accept new instances, to become collectible.
- **[Risk] Windows deletion remains slow or temporarily locked.** → Rename into managed trash where possible, bound attempts, retain retry diagnostics, and resume later.
- **[Risk] State-first detachment leaves an orphan after a crash.** → Discover only canonical direct-child orphans and move/delete them through the same guarded path.
- **[Risk] A detached worker outlives the updater.** → Give it only the cleanup plan and managed roots, use the same lock/proof rules, and make every operation idempotent.

## Migration Plan

1. Add deterministic planner and state migration coverage without enabling deletion.
2. Add guarded detachment, trash movement, artifact cleanup, and interruption recovery behind isolated roots.
3. Integrate post-success planning and bounded worker scheduling into update; preserve the prior behavior as rollback until exact-package evidence passes.
4. Enable bounded launch reconciliation and candidate/trash recovery.
5. Run an exact Windows migration fixture representative of the observed 41-release backlog, then manually verify that active and old live sessions continue while obsolete disk usage declines.
6. Roll back by disabling new cleanup scheduling; already retained active/rollback/live releases remain complete, and trash contains no selectable release.

## Context

See `proposal.md` for motivation and the three delta specifications for behavior. Base `710447d99f1bdf28415deeee10e73ead2a361667` contains merged #400. Its archive run completed successfully but reported `acceptance-missing`; a successful reconciliation job is not completed archival.

Today `loadArchiveEvidence` calls the comment-only `selectAcceptance` before staging. `prepareArchive` verifies accepted source/merge/current artifact identity, requires substantive tasks complete, and refuses existing source `acceptance.md`. The documentation merge owner can automatically merge ordinary existing-change OpenSpec edits. Local cleanup calls the same archive reader and checks the archived acceptance. Therefore a documentation file or a bot-authored imitation of a human comment cannot implement the requested flow safely.

## Goals / Non-Goals

**Goals:** Make the human action a clear, protected manual acceptance merge; preserve immutable source provenance; keep missing work visible; reuse the existing publisher, scan, validation, archive, and cleanup boundaries.

**Non-Goals:** No acceptance-of-acceptance proposals, automatic acceptance merge, fabricated review/test outcomes, generic acceptance from ordinary PR merges, new repository permissions, automatic known-gap archival, retroactive bulk approval, or local watcher activation. Code PRs still need the existing local-review and manual-integration discipline.

## Decisions

### 1. Separate request data from verified authority

Store a versioned request at `openspec/acceptance/<change>/<source-head>.json`, outside the active change tree. The dedicated branch is `docs/accept-<change>-<source-pr>` and the title is `Accept: <change> — implementation #<source-pr>`. A generated PR body renders a plain-language decision, evidence table, task checklist, gaps, exact candidate identity, and next action from the committed record. Labels and a body marker help navigation but never establish authority.

The strict record binds repository, change, source PR/head/merge, supported implementation linkage, original artifact/task digests, reviewed spec baseline, CI references, evidence references, and explicit task reconciliations. The review decision is conditional on a verified human manual merge; the generated file does not claim a reviewer, merge time, or completed review before that event. The verified receipt is derived from GitHub merge provenance and committed bytes, not a self-declared field.

A request may be created while evidence is missing, but it stays draft/blocked with concrete instructions. Once substantive evidence is complete, it becomes a ready manual review request with real current-head validation. The accepting maintainer does not need to compose a JSON comment. The agent may prepare evidence-backed record edits in that same PR; automation must preserve those human-reviewed edits rather than regenerating them blindly.

Alternative rejected: writing active `acceptance.md` immediately or modifying source plans to carry approval. This would collide with source-artifact identity checks and make an unreviewed generated file appear accepted.

### 2. Explicit task reconciliation, not blanket completion

Inventory each original task by ID, full description, state, and digest. Copy recorded completed work and actual CI facts without claiming unknown physical outcomes. Pending substantive tasks require concrete completion evidence before a request can pass complete-acceptance validation. The record can explicitly reconcile stale checkboxes after that work is actually verified; archive staging applies only those reviewed updates to the archived task document and retains the original state and receipt. Source code and original accepted artifacts remain immutable.

Pure signoff bookkeeping can explicitly name the manual acceptance merge itself as its completion event. This designation must be exact and visible in the review record, never inferred for arbitrary tasks by keyword. It cannot encompass implementation, test execution, physical review work, or a mixed legacy task. Unknown/mixed designations block. The review event may attest the maintainer's actual review decision; it cannot claim unperformed live tests passed.

For #400, this means showing its actual final-head CI evidence and any still-unperformed live lifecycle tasks, not turning all unchecked tasks green merely because #400 merged. Known gaps stay on the separate explicit manual-disposition route. No new automatic waiver policy is introduced.

Alternative rejected: completing every source task on acceptance merge. That would merely replace the hidden acceptance problem with fabricated completion.

### 3. Manual hold established before any publication

Install acceptance exclusion in the documentation auto-merge owner before enabling the acceptance publisher in the same deployed revision. Treat every added/modified/deleted/renamed authoritative record under `openspec/acceptance/`, and every verifiable acceptance association, as a manual lifecycle hold. Inspect both rename paths and authoritative base/head records; body/label removal and malformed data cannot bypass the hold. Apply it to arming, direct merge, unstable-state recovery, and existing armed merges.

A normal archive writes a rendered copy to its dated `acceptance.md` but does not modify the authoritative registry record. Thus copies of accepted evidence do not accidentally hold the archive. Ordinary documentation controls retain their automatic path.

Alternative rejected: a removable `manual-acceptance` label alone. It permits an authorization PR to be merged by the very automation whose authorization it is supposed to grant.

### 4. One trusted publication and validation path

Extend the trusted archive reconciler to distinguish verified source eligibility from missing acceptance, then publish a request using the existing App publisher. Refactor the reader so only the specific absence case can enter request generation; stale, malformed, revoked, or conflicting evidence remains a blocker. Never catch all archive errors and treat them as missing acceptance.

Acceptance candidate validation uses trusted repository policy and read-only credentials. It verifies strict schema/size/path bounds, exact single-record diff scope, immutable source bindings, reviewed task/evidence completeness, and final-head implementation CI. It must not wait for its own check to become successful: acceptance-head CI is verified later when consuming the merged receipt. Candidate-controlled scripts are never executed with publication credentials. The App creates real PR-triggered CI using existing permissions.

For receipt verification, require source implementation integration plus a non-draft same-repository acceptance PR into `develop`, exact validated acceptance head, matching merged record bytes and ancestry in current `develop`, authorized human merger, and evidence of manual rather than bot/auto-merge/merge-queue integration. Incomplete merge-mode or actor evidence fails closed. Ordinary merge status and a declared human name in JSON are insufficient.

Return a tagged receipt (`comment` or `pull-request`) from the shared reader. Keep legacy comment semantics, version-1/version-2 implementation linkage, revocation, and same-head conflict checks. Do not synthesize a human comment from an App event. Contradictory authoritative receipts block rather than selecting the easiest route.

### 5. Bounded reconciliation and visible state

Use existing merge events, daily catch-up, and targeted retry. An acceptance merge resolves to its recorded source PR; it is never scanned as a new implementation needing another acceptance. Recheck durable record identities on every pass. Reuse an owned open request, reject duplicate/unknown ownership, preserve human edits, recover a branch created before a crash only with matching committed provenance, and require explicit targeted authorization to replace a closed request. An acceptance request waiting for a human must not globally starve other implementations.

Retain the existing 90-day/500-PR scan window, 10-minute workflow envelope, bounded API reads, and at most one new publication per pass. Acceptance and archive publications share that budget, with resumable fair progress; targeted older PRs remain supported. Do not wait for CI. Dry-run reports proposed requests without publishing records or changing lifecycle state.

Status vocabulary distinguishes awaiting evidence, awaiting manual acceptance merge, accepted but archive-blocked, archive pending, archived, closed, conflicting, and deferred. Link all three PRs and state exactly what the maintainer should do. A successful job with blockers must not present itself as completed acceptance or archival.

### 6. Preserve archival and cleanup authority

Carry the tagged receipt through archive preparation, committed/PR archive provenance, generated-archive validation, retained acceptance evidence, and already-archived checks. Verify the registry receipt separately from the original source artifacts; normalize only explicitly reviewed task bookkeeping in the staged archive. Keep strict OpenSpec validation and conservative synchronization against the reviewed spec baseline. Intervening conflicting changes block rather than refreshing the acceptance baseline silently.

Update the local cleanup evidence consumer to verify the same PR-backed receipt and its archived copy. Acceptance integration alone still never authorizes deletion: archive integration, live topic-ref absence, exact registered ownership release, content checks, and non-force mutation remain independent gates. The acceptance record introduces no machine access or local cleanup activation.

## Risks / Trade-offs

- [A docs-only authorization PR auto-merges] -> Reserved-path and authoritative lifecycle holds precede publication; test every automatic merge route and metadata-removal bypass.
- [Backlog has more than missing paperwork] -> Draft requests show pending tasks and actual gaps; completion evidence is required, not inferred.
- [Automation overwrites a reviewer's record] -> Expected-head ownership and digest checks; preserve edits and report conflicts instead of force-pushing.
- [Human identity is mistaken for manual merge] -> Verify merge-mode provenance as well as actor authority; unknown data blocks.
- [Receipt and source evolve independently] -> Bind exact immutable source/task/spec inputs; revalidate stale candidates and refuse source drift.
- [Too many pending reviews] -> One publication per bounded pass, deduplication, fair continuation, and explicit status; no global hold merely because another acceptance awaits a human.
- [A new receipt breaks old archives or cleanup] -> Shared tagged-reader contract and version-compatibility fixtures; retain legacy authority checks.

## Migration Plan

1. Keep this initial checkpoint OpenSpec-only. Continue approved implementation in this same worktree/history/PR; do not merge the planning checkpoint separately.
2. Implement record policy and manual-merge exclusion first, then publisher/validator/reader/archive/cleanup integration and documentation. Keep existing comment-backed acceptance working throughout.
3. Validate adversarial fixtures, strict OpenSpec, documentation consistency, and normal current-head PR CI. Hand off exact review commands and known gaps; merge implementation only with explicit authorization.
4. After trusted deployment, use an explicitly authorized isolated lifecycle to prove request creation, manual-only acceptance, exact-head receipt consumption, automatic archive integration, and negative controls. Do not depend on this feature's own future archive as the test input or claim the fixture occurred before it did.
5. Catch up supported missing-acceptance implementations, including #400, under the same limits. Reconcile genuine missing work in their acceptance requests without accepting the backlog en masse.
6. Roll back by disabling new request publication while preserving records, manual holds, and legacy comment reads. Never delete accepted receipts or revert to automatic acceptance-record merging. New-format receipts must remain readable or explicitly blocked until compatibility is restored.

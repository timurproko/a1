## Context

See `proposal.md` for motivation and `specs/local-worktree-cleanup/spec.md` for the behavioral contract.

Remote lifecycle automation already exists: `execute-merged-branch-cleanup.mjs` reconciles exact remote heads, and `reconcile-openspec-archive.mjs` verifies `openspec-implementation`, source acceptance, and `openspec-archive` provenance. Its `already-archived` path checks the generated head, committed marker, merge ancestry, absence of the active change, and archived acceptance. `docs/openspec-archive-automation.md` currently leaves local cleanup to the local agent. Hosted Actions cannot remove developer-machine directories.

The new draft-PR lifecycle and legacy version-1 linkage must both remain supported. Local worktrees are commonly detached, PRs are squash-merged, archive creation is asynchronous, and Windows can leave partially removed directories when files are locked. There is no existing authoritative local worktree ownership registry; a clean status or dead PID cannot substitute for one.

## Goals / Non-Goals

**Goals:**
- Consume verified remote completion through a read-only evidence boundary and execute local cleanup through a separate, small mutation boundary.
- Make delayed cleanup reliable when a local worker is enabled, including after the original session releases ownership or the machine reconnects.
- Prefer a retained directory with an actionable reason over uncertain deletion; keep every irreversible operation tied to stable local and remote identities.

**Non-Goals:**
- No GitHub-to-PC webhook, new remote merge/delete owner, OS service installation, or product/interactive UI launch integration.
- No automatic adoption of old `.worktrees` folders, broad branch sweeps, force discard, stale-owner eviction, or closed-unmerged cleanup.
- No regeneration of archives, inference of acceptance, or changes to documentation auto-merge eligibility.
- No cleanup of ordinary documentation-only streams lacking an implementation/archive chain in this change.

## Decisions

### 1. Local registration queue, not branch-name discovery

Store a versioned queue under the resolved Git common directory, outside every removable worktree. A registration binds the canonical primary and allowed worktree roots, canonical common directory, GitHub host/repository and remote identity, change, source implementation PR, candidate role/PR, exact expected HEAD and local ref (if any), filesystem identity, and a generation token. Acceptance checkouts can bind the exact verified source merge commit; implementation/archive worktrees bind their exact merged PR head. Shared/base-only or older-ancestor checkouts do not qualify automatically.

Registration occurs through the repository-owned delivery command/guidance while the owner is still using the checkout. An explicit `release` operation freezes the final identity and transfers authority to the local service; a `claim` operation revokes eligibility before a resumed session writes. Registration updates and release require the owner's token; duplicate paths or associations block rather than silently overwrite another owner's record. A scoped manual adoption command can register an individually reviewed legacy checkout, never an entire directory by heuristic.

Alternative rejected: correlating names, missing upstream refs, commit subjects, or arbitrary PR ancestry. Those were useful in a human audit but cannot establish unattended deletion authority.

### 2. Durable release and exclusive claims, not expiring deletion leases

Use an atomic per-repository lock for queue mutation, session claims/releases, and the destructive phase. A cleanup claim transitions a released candidate to a journaled deleting state. A session cannot reacquire it during that phase; cleanup cannot claim an owned candidate. Process identity assists diagnostics only. Crashed or stale ownership remains blocked until explicit recovery. Git worktree locks remain an independent veto and are never removed automatically.

The worker runs from a trusted, stable checkout outside the target, normally the primary worktree, using an already reviewed tool version. It never loads code, hooks, or configuration as executable cleanup authority from a candidate PR checkout. Delivery guidance requires stopping related development processes and leaving the checkout before release. Retained worktrees still owned by other sessions are never touched.

Alternative rejected: deleting after a TTL or testing only whether a PID exists. PID reuse, paused sessions, and process trees make both unsafe ownership proofs.

### 3. Read-only archive-completion evaluator

Extract or reuse the existing integrated-archive verification behind a side-effect-free reader interface; do not run archive staging/publication merely to decide whether to remove a local directory. Preserve its source acceptance authority checks and add explicit live PR-state, repository, exact identity, and remote-ref-absence results. Verify the implementation and archive merge commits against freshly fetched `origin/develop` during execution. Verify both the PR and committed archive marker, its source identities, archived acceptance, and absence of the active change. Inspect supported legacy specification linkage as required by the existing evidence reader.

Remote branch deletion remains exclusively with current GitHub automation. Local cleanup waits until implementation and archive refs, plus any other candidate-associated PR ref, are absent according to live reads. A recreated branch blocks regardless of SHA. Authentication, pagination truncation, unknown metadata versions, missing acceptance, stale source bodies, or unavailable archive evidence all block.

Preview performs the same remote read checks against the live target without updating local refs or queue state. If additional Git objects are required, it uses a disposable temporary object store outside the repository and removes it on exit. Execution can fetch the exact remote integration ref explicitly, but never checks out or advances the primary branch.

Alternative rejected: trusting a status comment or saved `already-archived` report indefinitely. Reports are explanatory evidence, not live deletion authorization. The local evaluator must not call the pre-merge archive-candidate check unchanged: its exact target-base equality is not the post-merge ancestry condition.

### 4. Predictable opt-in execution and catch-up

Expose a repository-owned local command with register, claim, release, preview, reconcile-once, watch, status, and disable operations. Exact command spelling can be finalized during implementation without changing the contract. Execution requires explicit repository-local enablement; preview is the default inspection route. Delivery guidance calls registration and release, then requests a bounded pass from outside the target. An enabled watcher runs independently of the delivery session so it can observe later archive integration. Nothing in this planning PR installs or starts it.

Initial operational bounds: one pass at startup, then at most one pass every five minutes; at most 100 registrations, 500 read-only remote requests, and 60 seconds per pass; individual remote/Git calls capped at 10 seconds within the remaining deadline. Metadata-list pagination must finish within the budget or mark the candidate deferred, never treat truncation as absence. A durable round-robin cursor ensures blocked early entries do not starve later ones. Back off network failures and respect GitHub rate-limit responses. Watcher state and logs expose the last pass, remaining queue, and next retry. No pass waits for CI.

Stopping the worker or disabling the repository cancels further candidate starts and is checked again before each destructive step. It cannot undo a removal already in progress. A later explicitly enabled invocation resumes from the journal with fresh checks. Automatic cleanup is eventual only while a local process is available, not a promise that GitHub deletes local folders immediately after merging.

Alternative rejected: an implicit product startup hook or automatically provisioned scheduled service. These broaden launch behavior and machine configuration beyond the requested delivery cleanup. Users can supervise watch mode separately later.

### 5. Narrow local mutation with revalidation

For each released candidate:

1. Acquire mutation authority and revalidate remote completion/ref absence and current release generation.
2. Resolve path and filesystem identity again; verify Git common-directory membership, registered path containment, exact HEAD and branch attachment, primary/current exclusions, reserved refs, and lock state. Reject symlink/junction substitution or a nested worktree/repository boundary.
3. Read staged, unstaged, untracked, submodule, and ignored content. Refuse any unapproved content. Treat only explicitly registered generated directories such as build output or dependencies as disposable, with no path traversal or external-link following. The default disposable allowlist is empty; declaring it is a visible registration choice, not a blanket ignore rule.
4. Persist the exact candidate and step intent; run non-force `git worktree remove` from outside the target. Verify both filesystem and worktree metadata outcomes. Never fall back to recursive force deletion.
5. After verified worktree removal, recheck ownership, remote gates, and any associated local branch. Delete only a non-reserved, not-checked-out exact ref with compare-and-delete against the registered old SHA. A changed ref remains intact and is reported separately.
6. Mark completed steps. Normal Git removal already retires its own worktree registration. For stale metadata, use pruning only when its dry-run scope contains exclusively journal-confirmed, absent completed candidates; otherwise report/defer rather than globally pruning unrelated or unavailable worktrees. Recheck that scope under the lock before mutation.

A failed or interrupted Git removal can leave residual files with no usable `.git` pointer, especially on Windows. Retain the journal and mark `partial`; require a separately reviewed repair rather than retrying a generic directory delete. If the path was replaced or ownership/generation changed, preserve it. A branch-only retry likewise checks the journal, path absence, PR evidence, and expected ref again. Never use `git branch --merged` as squash-merge evidence.

Alternative rejected: `git worktree remove --force`, `git clean -fdx`, blanket `rm -rf`, and unconditional `git worktree prune`. Each can discard data beyond the proven candidate.

### 6. Evidence and acceptance

Separate pure eligibility decisions, injected remote/Git readers, queue/ownership transitions, and a minimal executor so adversarial fixtures can assert that forbidden mutations never occur. Store bounded local reports and a write-ahead step journal under the common directory. Retain completed reports for 30 days with a 10 MiB cap; preserve unresolved registrations/journals rather than evicting deletion recovery evidence. Redact tokens, raw credential-bearing errors, and file contents. Preview prints evidence without altering persisted ownership or retry state.

CI covers every spec scenario with GitHub fixtures and real temporary Git worktrees, including Windows path aliases, file locks, dirty/untracked/ignored content, ref races, concurrent claims, and interruption. Live acceptance is a separately authorized isolated lifecycle: before archive merge no cleanup; after accepted implementation and auto-archive integration with absent refs, an enabled worker removes a released clean fixture and leaves dirty/active controls intact. Use a separate fixture change or prior eligible lifecycle so this implementation's own future archive is not a circular prerequisite for marking its substantive acceptance tasks complete. Test results are not claimed as live archive evidence.

## Risks / Trade-offs

- [No worker running or no internet] -> Persist the queue and show pending state; reconcile on the next enabled run rather than promising immediate deletion.
- [Ownership protocol cannot police arbitrary external editors] -> Explicit opt-in release, required claim-before-use for managed sessions, immediate identity/content checks, and no deletion of unknown ownership. Document the cooperative local ownership boundary.
- [Remote refs can change after a live read] -> Recheck immediately before each destructive step, never mutate remote refs, and require exact immutable local identities. There is no distributed GitHub/filesystem transaction; do not claim one.
- [Missing or expired archive provenance] -> Fail closed and retain the checkout for manual review rather than weaken acceptance requirements.
- [Conservative exact-head matching retains old CI checkouts] -> Allow only separately reviewed exact registrations, not automatic ancestor adoption.
- [Locked files or partial Windows removal] -> Preserve residual content and the recovery journal; do not report complete cleanup or broaden deletion.
- [Existing canonical workflow text can lag merged delivery refinements] -> Reuse current accepted runtime linkage and archive checks without reconciling unrelated historical specifications in this change.

## Migration Plan

1. Publish this plan as OpenSpec-only artifacts in an implementation-bound draft PR. Do not merge the planning-only draft or synchronize its new capability yet.
2. After explicit implementation approval, implement in that same draft; add the local command, focused tests, ownership-aware delivery guidance, and runbook without modifying the remote lifecycle's authority. Apply connected PR #401's order: mark the completed implementation ready before normal PR CI, then obtain actual maintainer validation and explicit manual merge authorization. Incorporating its policy in this branch does not merge or accept either PR.
3. Run preview against disposable fixtures first. Obtain separate approval to enable the watcher and perform the isolated live lifecycle acceptance; record actual results before final acceptance and manual integration.
4. New managed streams register their worktrees when local cleanup is enabled. Existing unregistered folders remain untouched unless individually adopted and released after review.
5. After this change's own accepted merge and verified automatic archival, subsequent released worktrees are eligible for cleanup under the same rules. Roll back by disabling/stopping the local worker; retain queue/journals and remote automation unchanged. Recreate only already-removed clean checkouts from their recorded commits if needed.

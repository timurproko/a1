## 1. Identity and ownership foundation

- [x] 1.1 Implement a versioned local registration schema binding repository/common-directory identity, approved root, role/PR, exact HEAD/ref, filesystem identity, disposable paths, and generation; verify malformed, duplicate, cross-repository, and unmanaged-path fixtures are refused.
- [x] 1.2 Implement atomic register, claim, release, and explicit stale-owner recovery with a shared repository mutation lock; verify concurrent claims, active ownership, crashed owners, and Git locks never grant cleanup authority implicitly.
- [x] 1.3 Add durable queue and step-journal storage outside target worktrees; verify atomic-write failure, unknown versions, restart, path reuse, and preservation of unresolved records.

## 2. Read-only lifecycle verification

- [x] 2.1 Extract or reuse integrated-archive evidence evaluation without staging or publication side effects; verify version-2 and legacy version-1 source linkage, exact acceptance, committed/PR markers, and archive merge ancestry fixtures.
- [x] 2.2 Require actual archive integration, retained matching acceptance, and absence of the active change on the fresh remote target; verify missing/open/closed-unmerged archives, stale/contradictory markers, and incomplete remote data preserve candidates.
- [x] 2.3 Add live absence checks for implementation, archive, and additional candidate PR refs with read-only credentials; verify present/recreated refs and authentication failures block cleanup and no remote mutation API is called.
- [x] 2.4 Implement side-effect-free preview using live remote evidence without changing repository refs or durable local state; verify preview snapshots remain identical before and after eligible, blocked, and failed evaluations.

## 3. Local safety and execution

- [x] 3.1 Implement canonical path, filesystem identity, Git membership, exact HEAD/attachment, reserved-ref, primary/current-directory, and nested-worktree checks; verify detached, acceptance-merge, Windows alias/junction, replacement, and wrong-repository cases.
- [x] 3.2 Implement staged, unstaged, complete untracked, ignored-content, nested-repository, and submodule inspection with an explicit disposable-generated-path policy; verify every dirty or unknown-content case is preserved and only declared generated content is permitted.
- [x] 3.3 Implement the journaled non-force Git worktree removal boundary with immediate ownership/local/remote revalidation and post-removal checks; verify successful removal, races, subprocess failure, and residual-directory outcomes with real disposable worktrees.
- [x] 3.4 Add expected-old-SHA local topic-ref deletion only after verified removal and a fresh not-checked-out/reserved-ref check; verify changed refs, refs attached elsewhere, remote recreation, and branch-only retry behavior.
- [x] 3.5 Add candidate-scoped metadata-pruning decisions and interruption recovery; verify unrelated unavailable worktrees are never pruned and partial Windows removals never invoke recursive or force deletion.

## 4. Local orchestration and reporting

- [x] 4.1 Deliver the opt-in local command surface for registration/ownership, preview, one-pass reconciliation, watch, status, and disable; verify default/disabled operation never deletes and execution occurs outside target worktrees using trusted tooling.
- [x] 4.2 Implement five-minute watch scheduling, per-pass candidate/request/time limits, subprocess deadlines, fair resume, and rate-limit backoff; verify deterministic clock/network fixtures cover offline restart, delayed archive merge, and non-starvation.
- [x] 4.3 Implement cancellation checks between destructive steps and repository singleton coordination; verify disabling or overlapping workers cannot start another deletion and interrupted work remains recoverable.
- [x] 4.4 Deliver per-candidate reasoned reports and bounded local retention with credential redaction; verify removed, pending, blocked, unmanaged, already-absent, partial, deferred, and incomplete-coverage outcomes against actual filesystem/ref state.

## 5. Delivery integration and documentation

- [x] 5.1 Update repository-owned delivery guidance to register exact managed checkouts, claim before resume, stop use and release ownership, and request a local pass only after the archive gate; verify the runbook examples preserve implementation approval, acceptance, and unrelated-session boundaries.
- [x] 5.2 Document explicit enable/disable/watch setup, preview, manual individual legacy adoption, stale-owner recovery, and partial-removal handling; verify all documented commands against disposable fixtures without provisioning an OS service or touching live retained worktrees.
- [x] 5.3 Reconcile applicable completion guidance so implementation and retained acceptance/archive worktrees wait for actual archive integration while existing remote cleanup remains independent; verify no remote permissions, archive publication behavior, or auto-merge eligibility is broadened.

## 6. Automated validation

- [x] 6.1 Add focused policy and integration coverage for every local-worktree-cleanup scenario, including mutation-spy assertions and real temporary Git repositories; verify coverage includes squash heads, dirty controls, ignored data, ownership/ref races, and retry journals.
- [ ] 6.2 Include Windows-specific path, junction, and locked-file cases in applicable CI alongside portable local-cleanup tests; verify the required current-head CI result and record any platform limitation without treating skipped cases as passed.
- [x] 6.3 Run strict OpenSpec validation and review the final diff for documentation consistency, least-privilege remote reads, no force-discard paths, and no unrelated behavior changes; record the validation and review results.

## 7. Maintainer validation and final handoff

- [ ] 7.1 Provide exact candidate and focused preview/watch fixture commands, expected deferred/removal behavior, and rollback steps; verify the handoff identifies that watcher activation and destructive live fixtures require separate approval.
- [ ] 7.2 After separate authorization, exercise an isolated accepted implementation and automatic archive lifecycle with released-clean, dirty, active, and open-PR controls; record actual PR/head/archive/ref identities and prove no early deletion, eventual eligible deletion, and control preservation without depending on this change's own future archive.
- [ ] 7.3 Obtain actual final-head maintainer review of safety, resume, disable, and Windows outcomes, then record the authorized exact-head acceptance comment; verify the comment matches the final candidate and renew it if the head changes.

## 8. Mechanical archive preparation

- [ ] 8.1 Record verified implementation acceptance and merge evidence for archive preparation.
- [ ] 8.2 Stage and verify delta synchronization and the archive move in an OpenSpec-only candidate.

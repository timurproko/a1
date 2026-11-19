## Context

The cleanup engine deliberately rejects every filesystem link and every non-empty unregistered worktree. Those defaults protected unknown content, but they also leave two reviewed shapes without a compliant path:

- PR #602's exact disposable `.artifacts` root contains a Windows junction from one generated release `node_modules` path to a generated dependency layer inside the same `.artifacts` root. The merged candidate, archive, remote-ref absence, worktree identity, and tracked cleanliness verify, but inspection stops at `content-link`.
- `hide-copy-error-on-success` is a clean unregistered Git worktree at a normal topic branch. It has no pull request or remote branch, and its tip is already an ancestor of `origin/develop`; no command may currently establish deletion authority for that no-delivery checkout.

## Goals / Non-Goals

**Goals:**
- Remove internally contained links created below exact repository-owned disposable roots without traversing or authorizing an escaped target.
- Provide one exact, confirmed operation for a redundant no-PR worktree whose branch has no unique or remote work.
- Preserve bounded inspection, mutation locking, race revalidation, journaling, non-force Git removal, and compare-and-delete refs.
- Keep ordinary sweep behavior non-adopting and fail closed for active, dirty, linked-to-outside, ambiguous, or unverifiable work.

**Non-Goals:**
- Treat arbitrary links, ignored paths, or junction targets as disposable.
- Infer redundant-worktree authority from age, naming, process disappearance, ancestry alone, or a normal sweep.
- Retire worktrees with any pull request, live remote branch, unique commit, lock, ownership registration, or content blocker.
- Delete remote branches, force-remove worktrees, or change accepted-delivery evidence.

## Decisions

### Admit only links contained by the same exact disposable root

Inspection will continue to reject a disposable root that is itself a link. For a descendant link, it will resolve the target without traversing the link as content and accept it only when both the link and canonical target remain below the same exact central-policy root. The actual target directory remains reachable by its ordinary in-root path and receives the normal bounded nested-repository, special-file, and content inspection.

The inspection result will carry exact link evidence (path, filesystem identity, and resolved target). Immediately before purge, cleanup will re-read that evidence, reject drift or escape, and remove the link entry itself without following it. It will then run the existing bounded recursive removal on the disposable root. A failed pre-journal purge leaves the candidate registered and retryable exactly as today.

Alternatives rejected:
- Allow every link under a disposable root. An internal path could still point at user data outside the checkout.
- Let recursive removal decide whether it follows links. Platform behavior is not the authority boundary and does not provide target/race evidence.
- Special-case the observed installer path. The safe invariant is containment within an already approved root, not one generated version directory.

### Add an exact `retire-redundant` operation instead of automatic adoption

The CLI will accept `retire-redundant --repo <primary> --path <exact-worktree> --confirm-redundant`. It will act only under the repository mutation lock and only when the path is an unregistered, unlocked, non-current Git worktree beneath the canonical `.worktrees` root on a normal unprotected topic branch.

The operation will fetch `origin/develop`, capture the exact filesystem/head/ref identity, and require all of the following:

- no registration or in-progress cleanup names the path or ref;
- no same-repository pull request in any state names the branch;
- the live remote topic ref is absent;
- the local tip is equal to or an ancestor of fresh `origin/develop`;
- staged, unstaged, untracked, unknown ignored, hidden-index, submodule, nested-repository, and protected-boundary checks pass;
- only central-policy generated content remains disposable;
- the worktree is not primary, current, locked, detached, reserved, replaced, or nested.

After a second identity/content/remote/PR/ancestry check, the operation will journal the captured candidate, purge central disposables, use non-force `git worktree remove`, and compare-and-delete only the unchanged local ref. Repeating the exact confirmed command will safely finish a partial journal or report already retired. It will not delete a remote ref.

Ordinary preview, sweep, branch pruning, and queue/watch will continue to report non-empty unregistered worktrees as unmanaged. A closed-unmerged PR remains exclusively owned by `discard`; a merged PR remains owned by `complete`/sweep.

Alternative rejected: make sweep delete any clean checkout whose head is on `develop`. That would silently adopt another session's work and turn ancestry into deletion authority.

### Keep explicit confirmation and reporting separate from delivery acceptance

Redundant retirement is local maintenance, not acceptance or rejection of a delivery. It requires the exact confirmation flag on every invocation, emits a candidate-scoped report, and grants no persistent or remote authority. Delivery guidance will permit agents to invoke it only after an explicit maintainer request naming the redundant cleanup scope; otherwise unmanaged work remains retained.

## Risks / Trade-offs

- **[Risk] A contained link is swapped to an external target after inspection** → Record link identity/target and revalidate immediately before unlinking under the mutation lock; any drift blocks before journaled worktree removal.
- **[Risk] Link removal accidentally traverses its target** → Use the link-entry removal primitive first and test a target sentinel both inside and outside the approved root.
- **[Risk] A clean checkout is still in use** → Require exact maintainer confirmation, reject current/locked/registered worktrees, revalidate twice, and keep sweep non-adopting. Explicit retirement is the authority; elapsed time or process state is not.
- **[Risk] An unpushed commit is lost** → Require the tip to be contained by fresh `origin/develop` and compare the same captured SHA again immediately before worktree/ref deletion.
- **[Risk] A branch's PR or remote appears during cleanup** → Re-query both before mutation; any presence blocks. Local ref deletion remains compare-and-delete.
- **[Trade-off] Redundant detached checkouts still remain** → Retain them because no exact local topic ref exists to bind and compare through the full operation.

## Migration Plan

1. Extend the cleanup specification and command contract without changing existing registrations or completed journals.
2. Add contained-link inspection/purge evidence and temporary-repository fixtures for internal targets, external escapes, drift, cycles, nested Git metadata, and Windows junctions.
3. Add the explicit redundant-retirement journal and command with fixtures for clean integrated tips, unique commits, PR/remote presence, dirt, locks, races, interruption, and idempotency.
4. Update workflow guidance, CLI help, and cleanup documentation; keep sweep and queue/watch behavior unchanged.
5. After authorized merge, use deployed `complete` to remove `published-installer-smoke` and deployed `retire-redundant` to remove `hide-copy-error-on-success`, then verify only the excluded active worktree remains.
6. Roll back by disabling the new command route and restoring all-link blocking; existing delivery journals remain compatible, and any incomplete redundant-retirement journal remains fail-closed for reviewed recovery.

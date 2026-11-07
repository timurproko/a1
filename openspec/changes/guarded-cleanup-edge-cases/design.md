## Context

`discardLocalCleanup` derives identity from a captured worktree or an existing registration. A branch-only candidate with neither fails before remote evidence can be evaluated. PR 815 currently has this shape. Existing closed-unmerged evidence checks and expected-SHA Git deletion primitives already provide the required remote boundary.

`inspectWorktree` admits central disposable-root links and internally contained descendant links, but blocks an external descendant link. PR 869 has an ignored `.artifacts/agent/shared-node-modules` symlink pointing to the primary `node_modules`. The refusal is correct for automatic disposal; a separate named-link remediation can remove the obstruction without admitting its external target into recursive purge.

## Goals / Non-Goals

**Goals:** Support explicit cleanup of exact closed-unmerged branch-only candidates; remove one explicitly named disposable link without touching its target; preserve all existing default refusals and resumability.

**Non-Goals:** Automatically discard closed PRs; delete protected `master` or `develop`; close or remove the open nightly repair; stop processes holding directories; bypass Windows locks; remove arbitrary ignored files; traverse external links; create fake worktrees or journal identities; change product behavior.

## Decisions

### Branch-only mode stays inside explicit discard

Add an exact `--branch` selector to `discard`, mutually exclusive with `--path`, and retain `--change`, `--pr`, and `--confirm-closed-unmerged`. Normalize and validate the branch through the existing topic-ref rules. Require the named same-repository PR to remain closed-unmerged into develop, match its exact branch, head, and implementation association, and have no other open PR for that branch. Any present local or remote ref must equal that PR head; absent refs support safe resumption.

Reject a branch checked out in any Git worktree, a live registration for that ref, conflicting ownership, reserved/protected refs, unavailable evidence, and advanced or recreated refs. Hold the shared ref-scoped resource lock and repeat checks immediately before each deletion. Use a real branch-scoped journal identity rather than a fabricated directory/filesystem fingerprint. Preserve existing worktree journal compatibility. Delete the remote ref under expected-head enforcement, verify absence, then compare-and-delete only the unchanged local ref. Repeat invocations must not delete a ref recreated after successful completion.

### Named-link remediation does not widen purge

Add `unlink-disposable-link` with the exact worktree path, change, PR, relative `--link`, and `--confirm-link-only`. Require an existing released candidate, matching registered identity/accepted ancestry, ordinary eligible merged delivery evidence and absent remote topic ref, no current/foreign owner, and clean local content apart from this one explicitly named link. Lock the candidate path and ref using the same scopes as completion and sweep.

The named path must be ignored, untracked, strictly below a central-policy disposable root, and reached through real non-link parent directories inside the canonical worktree. Require a resolvable symlink or junction whose target is outside the verified worktree; reject absolute/escaping paths, root aliases, ordinary files/directories, cycles, Git-metadata targets, unapproved roots, additional unsafe links, and changed identity or target. Internal targets retain their existing ordinary cleanup path and are refused by this remediation command before full-tree inspection, preserving its no-target-enumeration guarantee. Record the link's lexical path, filesystem identity, and canonical target, then revalidate immediately before the existing bounded non-recursive link-removal primitive. Never enumerate, recursively delete, or mutate the target. Produce an audit report and leave the worktree and its release state intact; a later ordinary completion/sweep must repeat all normal checks. Do not add automatic external-link admission or queue authorization.

### Scope and policy integration

Document branch-only discard and link-only remediation as explicit maintenance operations, including partial failure and retry behavior. Preserve ordinary path-mode behavior, default sweep results, existing refusal tests, and lock budgets. No cleanup of the motivating real candidates occurs during fixture tests or from task-worktree policy before the fix is integrated.

## Risks / Trade-offs

- A second candidate shape affects journal validation and resumability. Keep old worktree records compatible and test malformed or conflicting branch records.
- Filesystem and ref changes can race inspection. Revalidate lexical ancestors, exact link/ref identity, and ownership at each destructive boundary under the existing cooperative scoped locks.
- Windows junction removal differs from POSIX unlink. Use the existing bounded non-recursive primitive and platform-aware tests with external target sentinels.
- Real locked residue remains a blocker and requires its holding process to release it; this change adds no process-killing or force-removal route.

## Validation strategy

After plan approval, use focused dependency-free cleanup node tests and their Vitest wrapper, TypeScript checking, strict OpenSpec change validation, and targeted CLI argument tests. Fixtures cover local-only/remote-only/both-ref candidates, checked-out/registered/protected/open/reopened/advanced branches, interrupted deletion, target preservation, link replacement and ancestor drift, unsafe paths, additional blockers, budgets, and concurrent operations. No full-regression selection or broad local test run is needed for this ordinary change.

## Implementation and focused observations

Branch-only state uses a separate validated ref-scoped journal beside existing worktree state, preserving all existing registration schemas. Windows ref-scoped locks are case-folded to exclude casing aliases. Named-link evidence is kept out of the ordinary purge-approved link list; the unlink primitive reruns candidate, content, ancestor, and target validation on every attempt and Windows junction fallback.

Focused local checks passed: 35 new maintenance regressions (including a real hermetic bare-remote CLI deletion), the complete cleanup Vitest wrapper over all four dependency-free node-test files, `npm run typecheck`, `npm run check:architecture`, `npm run check:docs-governance`, and strict OpenSpec change validation. An early ancestor-replacement fixture initially reached the generic unsafe-link blocker; validation ordering was tightened so ancestor drift is checked before full-tree inspection, and all focused regressions passed afterward. No real candidate was discarded or unlinked using this unintegrated policy.

## Known gaps

No proposed safety exemptions beyond the two explicitly scoped operations. Protected master, open PR 876, and locked transparent-tab-bar residue remain outside this fix.

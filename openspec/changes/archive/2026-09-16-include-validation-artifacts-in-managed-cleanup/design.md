## Context

See `proposal.md` for motivation. The completed-delivery command currently owns a frozen list of exact disposable roots. Local validation tooling writes ignored selection and result reports below `.artifacts/validation`, but that root is absent from the list, so the first live completion retained the worktree as designed. The retained registration and worktree must remain untouched until deployed policy recognizes the path.

## Goals / Non-Goals

**Goals:**
- Extend the same central completion policy with one exact generated root.
- Prove the real retained blocker shape is accepted while sibling and near-match paths still fail closed.
- Preserve the existing path, ignored-status, link, special-file, nested-repository, evidence, journal, and non-force removal gates.

**Non-Goals:**
- Authorizing the entire `.artifacts` tree.
- Adding a manual cleanup bypass or retroactively editing PR #435's accepted record.
- Deleting the retained worktree before this correction is merged and verified.
- Changing low-level registrations owned by other sessions.

## Decisions

### Add one exact central root

Add `.artifacts/validation` beside `.artifacts/openspec-archive` in the immutable completion policy. The existing component-boundary path matcher already distinguishes descendants of an approved root from siblings and near matches, so no broader `.artifacts` entry is needed.

Alternative considered: authorize all `.artifacts`. Rejected because unrelated tools or users may place valuable ignored content there, and the cleanup contract requires explicit generated roots.

### Exercise both content classification and completion defaults

Focused tests will place representative ignored files below `.artifacts/validation` and verify candidate removal through the normal completion path. Separate fixtures will place content in sibling and near-match paths and require a `worktree-content` blocker. Existing link, special-file, and nested-repository tests remain authoritative for boundary protection.

Alternative considered: assert only that the constant contains the new string. Rejected because it would not prove status classification and Git worktree removal behavior.

### Retry live cleanup only after deployment

The correction's evidence will record the retained PR #435 registration and blocker. After this corrective PR is manually merged, accepted, archived, and its remote ref is absent, the deployed primary command can retry PR #435 and then clean this corrective worktree. No file is deleted manually and no registration gains ad hoc disposable paths.

## Risks / Trade-offs

- [A validation tool writes valuable user-authored data under the reserved generated root] → Keep the root documented as repository-owned output and retain the existing ignored/type/nested-content checks; do not authorize its parent.
- [A near-match accidentally gains authority] → Pin component-boundary tests for sibling and suffix variants.
- [The retained worktree changes before retry] → Preserve exact registration identity and let the existing HEAD/filesystem checks fail closed.

## Migration Plan

1. Merge and verify this correction through the normal version-3 delivery workflow.
2. Update the primary checkout so the expanded policy is deployed.
3. Re-run the exact `complete` command for retained PR #435; do not modify its registration or files manually.
4. Run the exact command for this corrective worktree after its own verified merge.

Rollback is an ordinary corrective PR removing the exact root from the central policy. Previously removed worktrees are recoverable from merged Git history; retained blockers remain untouched.

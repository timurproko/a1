## Context

The local cleanup evidence path currently begins with `loadArchiveEvidence`. A pull request without an `openspec-implementation` fence is returned as `unlinked`, and cleanup immediately attempts the narrow corrective-association path intended for implementation that integrated without lifecycle metadata. That is correct for unassociated code delivery but wrong for ordinary standalone documentation, which repository policy deliberately permits and automatically integrates without an implementation fence.

PR #714 is the concrete live case. It modified only `openspec/specs/silent-installer/spec.md`, was non-draft and same-repository, passed `Development validation required` for head `c941b96919a7ad3c8e3e09bb209222eb767fc26b`, was squash-merged into `develop` as `45d2e9bb33c7f836ee34bddb2d1c78cd429e3254`, and its remote topic ref is absent. Its released local registration remains clean and identity-bound, but evidence verification reports `association-repair` because no corrective archive should exist for a standalone canonical-spec revision.

## Goals / Non-Goals

**Goals:**

- Let standard `complete` and `sweep` clean a registered standalone documentation worktree after its existing integration authority is fully verified.
- Reuse the same complete changed-path and lifecycle classifiers that controlled documentation integration.
- Keep exact-head validation, target ancestry, remote-ref absence, local identity, cleanliness, ownership, and non-force removal mandatory.
- Preserve the stronger archive/acceptance requirements for implementation-bound deliveries.
- Make PR #714 removable through the repository command after this correction reaches `develop`.

**Non-Goals:**

- Treat every merged unassociated PR as documentation.
- Expand the documentation auto-merge path allowlist or include release notes, mixed code, generated baselines, acceptance records, or newly introduced active changes.
- Infer eligibility from title, branch name, merger identity, absent branch, or current `develop` content alone.
- Delete PR #714's worktree before corrected tooling is integrated.
- Add a force option, manual unlink instruction, or a second worktree-removal implementation.

## Decisions

### 1. Classify standalone documentation with existing trusted policy

For an unlinked source PR, load the complete paginated file list and require `changed_files` to match. Apply `classifyDocumentationAutoMerge` and `inspectDocumentationLifecycle` to the immutable PR base/head identities. Eligibility requires the ordinary documentation allowlist and an unheld lifecycle result such as `standalone-documentation` or an existing-change/archive revision.

This preserves the exact policy that allowed integration. Reimplementing a shorter cleanup-specific path check was rejected because it could drift from rename handling, reserved release-note paths, acceptance association, malformed metadata, or active-change introduction rules.

If the documentation classifier is not eligible or lifecycle is held, cleanup continues to the existing corrective-association path only where that path can prove an actual repair. It never downgrades failed implementation evidence to documentation merely because the final diff includes Markdown or OpenSpec paths.

### 2. Bind documentation cleanup to exact remote evidence

A documentation candidate must be a closed, merged, non-draft, same-repository PR into `develop` with a valid head and merge identity. Its registered candidate PR must be that PR, its local role must remain the standard completed-candidate role accepted by existing registrations, its registered/live head must equal or be a GitHub-known ancestor of the PR head, and its local ref must match the PR topic branch.

Use the existing exact-head CI reader to require a successful current-head workflow and the stable `Development validation required` aggregate. Read current `develop` and require it to descend from the PR merge commit. Require the exact remote topic ref to be absent. These checks prevent a merged-status-only, stale, reverted, or recreated-branch result from authorizing deletion.

Merger identity is not a substitute for these facts. The route may be exercised by trusted documentation automation under branch protection, while the complete path/lifecycle/CI/ancestry evidence remains the durable cleanup authority.

### 3. Return the ordinary accepted-head cleanup shape

The standalone documentation verifier returns the same candidate identities needed by existing worktree and local-ref safeguards: source PR, source head and merge, current target, and associated topic ref. It records a distinct evidence kind/reason for audit output but does not create a second deletion path.

The worktree inspection, generated-content purge, journal transition, non-force `git worktree remove`, residue handling, and compare-and-delete local branch logic remain unchanged. Existing registrations such as PR #714 require no state rewrite or hand edit.

### 4. Keep implementation association repair fail closed

An unlinked candidate that changes code, has incomplete file metadata, introduces an active change, carries acceptance metadata, or otherwise fails standalone documentation policy must not become eligible under the new route. The existing exact `association-repair.json` path remains the only cleanup exception for integrated implementation without valid lifecycle association.

Focused negative fixtures will prove that a documentation-looking implementation cannot bypass finalization, acceptance, or archival, and that errors loading classification, trees, validation, target ancestry, or refs remain blockers.

### 5. Remove the original blocked worktree only after deployment

PR #714 is not a disposable test fixture and will not be removed from the implementation branch. Once this change is finalized, validated, accepted, and merged, use the updated command from current `develop` to rerun exact cleanup for:

- path `E:/Git/a1/.worktrees/describe-silent-installer`;
- candidate label `describe-silent-installer`;
- PR `714`.

Report removal only when the repository tool returns `removed` or verified `already-absent`. Any new local or remote blocker retains the worktree.

## Validation Matrix

| Layer | Evidence |
| --- | --- |
| Positive classification | Standalone `openspec/specs/**`, eligible `docs/**`, and root `README.md` changes with complete file metadata |
| Lifecycle exclusions | Implementation fence, acceptance record, new active change, release note, malformed body metadata, mixed/code path, rename escape |
| Remote identity | Same repository, `develop` base, merged non-draft state, exact candidate PR/head/ref, current target ancestry |
| Validation | Successful current-head CI and exactly one successful protected aggregate; missing, stale, failed, or malformed runs block |
| Ref handling | Absent topic ref permits local evaluation; present or recreated ref remains pending |
| Local safety | Existing identity, ownership, cleanliness, generated-content, journal, non-force removal, and local-ref compare-and-delete fixtures remain unchanged |
| Live follow-through | After integration, exact cleanup of PR #714 reports removal or a new named blocker |

## Risks / Trade-offs

- **[Documentation policy and cleanup classification drift]** → Import and exercise the existing classifiers rather than duplicating their rules.
- **[An implementation removes its association and appears documentation-only]** → Inspect complete paths and immutable base/head lifecycle state; newly introduced active changes and non-documentation paths remain held, and malformed evidence fails closed.
- **[A merged PR was later reverted]** → Require the recorded merge commit to remain ancestral to current `develop`; content-level business intent is not inferred.
- **[Historical workflow evidence is unavailable]** → Retain the worktree with a bounded evidence blocker rather than accepting merge state alone.
- **[PR #714 changes locally before cleanup]** → Existing local identity and cleanliness checks block removal.

## Migration Plan

1. Add standalone-documentation evidence classification and focused positive/negative fixtures without changing deletion mechanics.
2. Update cleanup documentation and canonical requirements to distinguish implementation archival from standalone documentation integration.
3. Validate the candidate through ordinary version-3 delivery and merge it through authorized maintainer integration.
4. From current `develop`, rerun exact cleanup for PR #714 and report the repository command's result.

Rollback removes the standalone-documentation evidence route. Existing registrations remain intact and blocked rather than becoming manually removable.

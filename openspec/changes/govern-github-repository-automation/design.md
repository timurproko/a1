## Context

GitHub currently reports this repository state:

- public repository, default branch `develop`;
- auto-merge and automatic branch deletion enabled;
- merge, squash, and rebase enabled repository-wide;
- Actions enabled with all actions allowed, SHA pinning not enforced, default token
  read-only, and workflow review approval disabled;
- secret scanning and push protection enabled, Dependabot alerts/updates disabled;
- an unprotected `npm-publish` environment;
- active no-bypass rulesets protecting `develop`, `master`, and `v*` tags.

`develop` requires a pull request, resolved review threads, and
`Development validation required`, but zero approvals and no strict up-to-date-base
policy. `master` and `v*` are forward-only records written after publication.

The four workflows are Development validation, Documentation auto-merge, Full
regression, and Release. Documentation auto-merge correctly checks trusted
same-repository PR metadata and the exact path allowlist without executing PR code
with its write token. Its event list does not include `closed`, and its manager exits
immediately for any non-open pull request.

## Incident evidence: PR #163

The observed facts are sufficient to identify the owned gap without claiming an
undocumented GitHub internal cause:

1. Repository API: `delete_branch_on_merge` was `true`.
2. PR #163 head: `docs/test-openspec-auto-merge` at
   `ef2c419bc8dfef4e24167681a73d5dbe7defc940`, in `timurproko/a1`, unprotected.
3. PR timeline: `auto_squash_enabled`, `merged`, and `closed`, all by
   `github-actions[bot]`; no head-ref deletion event.
4. Merge: squash commit `8e4b4cb6ad6d6dce7b4016ea3a4e175a032fd095`.
5. Post-merge ref: `refs/heads/docs/test-openspec-auto-merge` still resolved to the
   exact PR head SHA.
6. A1 had no trusted close-event handler and therefore made no deletion request.

GitHub exposes no API reason for omitting the configured deletion. The design SHALL
therefore treat platform-side automatic deletion as a helpful first attempt, not an
owned completion signal. A1's defect is the absence of deterministic reconciliation.

## Goals

- Make GitHub repository policy reviewable and drift-detectable from the repository.
- Guarantee safe cleanup of merged same-repository topic branches.
- Preserve least privilege and the trusted-code boundary.
- Align canonical CI/publication requirements with accepted workflows.
- Prevent docs-only changes from leaving generated governance state stale.
- Produce live evidence before archiving governance changes.

## Non-goals

- Deleting branches in forks or any local branch/worktree.
- Deleting `develop`, `master`, release tags, protected refs, unmerged branches, or a
  branch that advanced after its pull request merged.
- Giving pull-request code a write token.
- Mutating live settings from ordinary CI.
- Enabling Dependabot, changing merge methods, adding approval requirements, or
  restricting the npm environment without separate explicit maintainer decisions.

## Decisions

### One declarative repository policy surface

Extend repository policy configuration beyond rulesets to include selected repository
merge/lifecycle settings, Actions permissions, environment policy, workflow inventory,
and complete ruleset fields. A read-only checker compares live GitHub state with the
reviewed definition and fails with field-level drift. Applying changes remains a
separate command requiring an exact confirmation token and post-apply verification.
Secrets and external npm trusted-publisher configuration are reported by capability,
not serialized.

### Cleanup is a trusted close-event reconciliation

Use a dedicated minimal workflow on `pull_request_target: closed`, checked out from
the default branch with `contents: write` and no PR checkout. It processes only a
merged pull request whose base is `develop` and whose head repository is this
repository.

The reconciler validates the head ref as a normal non-protected topic ref, loads the
live Git ref, and compares its object SHA with `pull_request.head.sha`. If the ref is
absent, cleanup is already complete. If it matches, delete that exact ref. If it
advanced, is protected/reserved, belongs to a fork, is malformed, or the PR was merely
closed, refuse deletion and report the reason. A deletion API failure fails the
workflow and preserves bounded evidence.

The SHA comparison closes the reuse race between merge and cleanup. Branch-name
filtering alone is not sufficient authority.

### Auto-merge and cleanup are independent states

Documentation eligibility controls whether a pull request may merge automatically.
Branch cleanup applies after any accepted same-repository PR into `develop`, including
a manually accepted code PR. Cleanup never changes merge eligibility and never uses
changed paths as deletion authority.

### Documentation validation includes docs-sensitive governance

Documentation remains exempt from product builds and test suites. OpenSpec changes
still run strict OpenSpec validation. Any documentation surface scanned by a generated
governance inventory also runs a lightweight consistency check. A stale inventory
fails that documentation PR rather than the next unrelated code PR.

If preserving a generated baseline would require a path outside the automatic-merge
allowlist, the change follows the manual mixed/code path; automation SHALL NOT widen
the allowlist to accommodate it.

### Publication requirements follow accepted trigger semantics

Nightly and explicit dispatch select the exact current `origin/develop` source.
Merging or pushing does not publish by itself. Development versions derive from the
unique merged PR associated with that source; manual development publication may
no-op for an existing immutable version, while nightly revalidates existing registry
bytes. Stable publication remains explicit and records tag, release, and `master`
only after npm serves verified bytes.

## Risks and mitigations

- **A branch advances before cleanup** — exact live-ref/head-SHA comparison refuses
  deletion.
- **A malformed event names a reserved ref** — same-repository, merged, base, ref,
  and reserved/protected checks fail closed.
- **Platform deletion already succeeded** — missing ref is idempotent success.
- **Write-token workflow is exposed to PR code** — use `pull_request_target`, trusted
  default-branch checkout, no dependency install, and no PR script execution.
- **Policy checker gains mutation power accidentally** — normal check mode is read-only;
  apply requires explicit maintainer confirmation and verification.
- **Documentation auto-merge is blocked by generated state** — this is intentional;
  generated configuration remains outside the allowlist and requires manual review.

## Delivery and acceptance

1. Merge this OpenSpec-only specification automatically.
2. Start implementation only after explicit authorization, from updated `develop` in
   a fresh worktree and separate manual code PR.
3. Add mocked GitHub API tests for every cleanup and drift branch.
4. After manual implementation merge, open a root-README-only PR and an OpenSpec-only
   PR from disposable topic branches.
5. Record automatic squash integration and remote head-ref absence for both.
6. Prove a mixed/code PR stays manual and its branch is removed only after explicit
   manual merge.
7. Record stale/advanced-ref refusal without deleting the reused branch.
8. Archive only after live settings, rulesets, workflow runs, PR timelines, and refs
   match the contract.

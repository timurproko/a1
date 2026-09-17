# Design

## Finalization is a function of the branch

Everything finalization needs is already in the pull request: the active change under `openspec/changes/<change>/`, the acceptance list in the body, the target baseline at `develop`, and the date. Nothing in it is a human decision; the decision is the maintainer's merge. The step sits in the developer's hands only because the tool was written for a local worktree. Moving it into a trusted workflow removes the revert/fix/refinalize loop without changing what a finalized head looks like, what `Finalized delivery validation` verifies, or what manual merge means.

The workflow is `OpenSpec finalization` on `pull_request_target` for `synchronize`, `ready_for_review`, `reopened`, and `edited` against `develop`, with a per-PR concurrency group that queues rather than cancels so two events for one PR never race. It checks out the default branch, installs the pinned tooling without hooks, and runs `scripts/governance/publish-openspec-finalization.mjs --pr <n>`. PR-head bytes reach that process only as data: the `openspec/` tree of the head is read into a sandbox and handed to the pinned `@fission-ai/openspec` engine from the trusted checkout, exactly as the local command does today. No PR-head script, package manifest, or Git hook runs. The App credential is the one the legacy archive publisher already uses; pushes made with it trigger `Development validation` on the new head, which `GITHUB_TOKEN` pushes would not.

## One operation, four starting states

`publish-openspec-finalization.mjs` reads the PR, refuses anything that is not an open, non-draft, same-repository version-3 candidate targeting `develop`, and then reconciles the head to a finalized form:

1. **Active and current.** The head contains the active change and descends from the `develop` tip. Ordinary finalization runs with today's UTC date and produces one `docs(openspec): finalize <change>` commit.
2. **Finalized, valid, and current.** Verification of the existing manifest passes against the `develop` tip. Nothing is pushed; the run reports `already-finalized`.
3. **Finalized but drifted.** The head is finalized but verification fails on content, acceptance, or gap drift because a later commit edited the archived tasks, evidence, design, or deltas, or the body's acceptance list changed. Re-finalization restores the active form inside the sandbox (the archive directory becomes the active directory again, `acceptance.md` is dropped, and every synchronized capability spec is reset to the target's bytes), then runs the ordinary finalization with the archive's existing date so the archive path is stable. The result is one commit whose diff against the head touches only the archive contents and the synchronized specs.
4. **Behind `develop`.** The `develop` tip is not an ancestor of the head, so the manifest's `specBaseSha` is stale or would be. The workflow first restores the active form as a commit of its own (state 3's restoration, using the merge-base's spec bytes), merges `develop` with a merge commit, and then finalizes against the new tip. Restoring before merging is what makes the merge clean: the branch's synchronized specs return to the bytes the merge-base had, so `develop`'s version wins without a conflict, and the delta is reapplied afterwards. A conflict outside `openspec/` stops the run with `finalization-merge-conflict`; the developer reconciles as today.

The same reconciliation is exposed to the local command. `finalize-openspec-delivery.mjs` gains the re-finalization path for states 3 and 4 (using `git show <target>:<path>` for the target's spec bytes), so a developer who prefers to finalize locally sees the same result the workflow would produce, and a locally finalized head lands in state 2.

Re-finalization is deterministic for the same inputs: running the operation on its own output yields no changes. The workflow's own push therefore triggers a second run that reports `already-finalized`, and the body edit described below triggers a third with the same result.

## Push first, then the body

The finalized head and the body's `openspec-implementation` fence must agree before `Finalized delivery validation` can pass. The workflow pushes the finalization commit with `--force-with-lease` against the head it read, so a developer push in the meantime fails the lease and the next event retries. Only after the push succeeds does it `PATCH` the PR body with the fence the finalization emitted, and only when the body still equals the one it read; a concurrent body edit leaves the body alone for the next `edited` event to reconcile. A body that already carries the emitted paths is not rewritten.

`Development validation` cancels an in-progress run for the same PR when a new event arrives, so the run started by the developer's push is replaced by the run on the finalized head, and the `edited` event from the body update replaces that one only if it is still running. The cost is a cancelled partial run per developer push, not a second full run.

## What the developer sees

A developer pushes implementation commits and edits the active change's tasks and evidence as before. When the PR is marked ready, the finalization commit appears within a couple of minutes and CI runs on it. A later fix is pushed on top of the finalized head; if it touched the archived artifacts, the workflow re-finalizes in place. The branch gains bot commits, so the developer pulls before pushing; a rebase that drops them is harmless because the next push is re-finalized from whatever the head contains. The `Revert "docs(openspec): finalize ..."` commit no longer exists.

When finalization cannot proceed — incomplete tasks, a missing or malformed acceptance list, an undispositioned gap, a strict-validation failure, or a merge conflict — the workflow fails with the finalization code in its summary, and `Finalized delivery validation` on the unfinalized head reports that automated finalization is pending and names the workflow run instead of the bare `delivery-not-finalized` code. Nothing is pushed on failure.

## Trust boundary and authority inventory

The App token is minted with `contents: write` and `pull_requests: write` as the legacy publisher mints it, and revoked at the end of the run. The publisher's route guard grows one entry: pushing to `refs/heads/<head ref>` of the same repository, and only when the pushed commit descends from the head the run read and its diff against that head is confined to the change's active path, its archive path, and its declared canonical specs by the same `assertArchiveDiff` rule that bounds legacy archive publication. The body `PATCH` remains on the existing allowed route and rewrites only the fence.

`config/github-repository-governance.json` gains the workflow with authority `single-pr-finalization-publication` and trusted source `default-branch`; `github-repository-governance.mjs` derives that authority from the presence of `publish-openspec-finalization.mjs` beside the App secret. Post-merge handling is unchanged and still uses no App credential; the "App credentials are absent" scenario keeps applying to verification, not to pre-merge finalization.

## Not done here

The workflow reacts to events on the PR. It does not fan out to every open candidate when `develop` advances; a finalized green PR whose target moved remains mergeable under the current non-strict status policy, and its next own event brings it current. Deriving the archive path from the head instead of the body fence, which would remove the body `PATCH` and the `edited` run entirely, changes the version-3 metadata contract and is left for a later change.

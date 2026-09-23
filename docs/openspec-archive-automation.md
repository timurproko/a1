# Atomic OpenSpec delivery and legacy archival

New OpenSpec deliveries use one ordinary development pull request from draft planning through implementation, validation, acceptance, specification synchronization, and archival. The only integration action is an authorized maintainer's manual merge. Automation never auto-merges implementation-bound work and never creates a version-3 acceptance or archive follow-up PR.

Unrelated standalone documentation remains separate: a non-draft unassociated PR changing only `openspec/**`, `docs/**`, and/or root `README.md` retains the existing CI-gated automatic route. A new active change, implementation association, malformed lifecycle data, or mixed path keeps the manual hold.

Version-1 and version-2 deliveries and their existing comments, acceptance PRs, archive PRs, receipts, retries, and bounded catch-up remain supported under [Legacy delivery](#legacy-delivery). Do not silently convert an in-flight legacy delivery.

## Version-3 lifecycle

1. **Draft plan:** create one normally named branch/PR such as `feature/...`, `fix/...`, or `chore/...`. Start the body with `## Proposal`, use it for one or two sentences of intent, follow it with `## Implementation` for the concrete planned work, omit quoted phase lines and routine validation command lists, and keep machine linkage under final collapsed `Automation`. Keep it draft and include only planning artifacts until the maintainer approves the plan and explicitly requests implementation.
2. **Same-PR implementation:** continue after explicit approval in the same worktree, branch, history, draft PR, and phase-free body. Reconcile approved refinements in proposal, design, deltas, and tasks before corresponding code edits.
3. **Complete evidence:** finish implementation, required tests/evidence, substantive tasks, and explicit known-gap disposition. CI success is objective evidence, not acceptance.
4. **Plain acceptance list:** keep the body phase-free and add final `## Acceptance` with one to ten concise implementation-specific behavior-and-result bullets. Do not use checkboxes, generic review/CI/approval/archive statements, URLs, mentions, or automated-test inventory.
5. **Ready and automated finalization:** mark the PR ready. The trusted `OpenSpec finalization` workflow reconciles current `develop`, conservatively synchronizes all deltas, moves the active change into its dated archive, stages the conditional acceptance manifest, commits that to the same branch with the archive App identity, and writes the emitted paths into the body's implementation fence. Running the [finalization command](#finalization-command) locally first is optional and yields the same bytes.
6. **Validate:** one normal exact-head workflow validates the finalized head: implementation, synchronized specs, archive, manifest, tasks/evidence, exact PR-body list, and every selected product/governance scope before emitting the stable protected aggregate. A new commit or acceptance-list change re-finalizes automatically when needed and requires full renewed validation; no lifecycle body edit or second workflow run is required.
7. **Manual merge accepts:** after the stable protected aggregate succeeds, an authorized human reviews and manually merges the exact validated head. That single action means the listed scenarios are accepted and explicitly authorizes integration. Auto-merge, merge queue, Apps, bots, and documentation reconciliation are forbidden.
8. **Verify and clean:** trusted post-merge policy derives `Archived` and reports `accepted-and-archived` from committed bytes and immutable GitHub provenance without editing the accepted PR body. It publishes no lifecycle branch or PR. Shared exact-head remote cleanup may delete the unchanged topic ref; local cleanup remains separately ownership-controlled: the agent parks the worktree with `handoff` at step 7, and the next session's `sweep` removes it once the merge, archive, and remote-ref evidence verify (see [local cleanup](local-worktree-cleanup.md)).

### Complete-regression evidence ordering

PR-attached Full regression is selected only for a repair that the trusted triage created from a failed Full regression: base policy verifies the immutable `openspec-ci` App author, generated candidate identity, and `regression-provenance.json`. Human-authored lookalikes, publishing or validation-authority changes, labels, Release-only repairs, and successful-run persistent-overrun candidates retain bounded ordinary validation. Generated repair drafts run no Development test suites, including after implementation begins. Finish substantive implementation tasks, focused local evidence, pre-finalization observations, and known-gap disposition before marking ready. The ready active head defers testing while trusted finalization publishes the candidate; the finalized head then receives all four native lanes as new full evidence, required by `Development validation required` alongside the existing gates.

The final exact-head run is a handoff gate, not a task requiring a future run ID in committed `design.md`. Keep final head/run/selection identity in Actions outcomes and the maintainer handoff; do not invalidate successful evidence with an extra recording commit. Changed code, acceptance/body metadata, selection labels, or target baseline requires fresh evidence. A selected PR success removes the additional mandatory Full regression dispatch, but a standalone/manual run never substitutes for selected PR checks. Before deployment, existing separate-dispatch obligations remain. Neither PR validation nor manual regression proves numbered-package nightly publication recovery.

The implementation, synchronized canonical specs, conditional acceptance record, and archive therefore reach `develop` atomically. Closing the PR unmerged integrates none of them.

## Draft PR body

The first screen should separate purpose from delivery detail, not foreground CI mechanics. Distill `Proposal` into one or two sentences answering why the PR exists, then put two to five concrete points under `Implementation` answering what it will deliver:

```markdown
## Proposal

Replace the multi-PR OpenSpec handoff with one manually merged development PR while preserving standalone documentation automation.

## Implementation

- Keep planning and implementation in the same draft PR.
- Integrate implementation, synchronized specs, acceptance, and archive atomically.
- Preserve standalone documentation auto-merge while forbidding implementation auto-merge.

## Automation

<details>
<summary>Used by CI to link this PR to its OpenSpec change</summary>

<!-- the openspec-implementation fence goes here -->

</details>
```

Do not add a quoted phase line or a routine `Validation` section listing commands to an initial draft. Actual validation results belong in CI and the eventual implementation handoff. Continue with the same phase-free body after approval. When implementation is complete and ready for required tests, use this visible order:

```markdown
## Proposal

<!-- one or two sentences explaining why the PR exists -->

## Implementation

<!-- concrete implementation bullets -->

## Acceptance

<!-- one to ten plain behavior-and-result bullets -->

## Automation

<details>
<summary>Used by CI to link this PR to its OpenSpec change</summary>

<!-- the finalized openspec-implementation fence goes here -->

</details>
```

Keep acceptance absent during proposal review so unfinished intent is not mistaken for final acceptance criteria. The finalization workflow rewrites only the implementation fence; keep the rest of the phase-free body unchanged through exact-head validation, maintainer review, and authorized manual merge. The same workflow run validates its finalized delivery record and applicable product/governance scopes before the stable protected aggregate succeeds. Do not add a lifecycle body edit or start a second validation run. After manual merge, trusted verification derives `Archived`; do not rewrite the accepted body.

## Version-3 implementation metadata

The initial draft uses the existing metadata fence:

````markdown
## Automation

<details>
<summary>Used by CI to link this PR to its OpenSpec change</summary>

```openspec-implementation
{
  "version": 3,
  "change": "example-change"
}
```

</details>
````

After finalization, replace it with the exact emitted paths:

````markdown
## Automation

<details>
<summary>Used by CI to link this PR to its OpenSpec change</summary>

```openspec-implementation
{
  "version": 3,
  "change": "example-change",
  "archive": "openspec/changes/archive/2026-09-15-example-change/",
  "acceptanceManifest": "openspec/changes/archive/2026-09-15-example-change/acceptance.md"
}
```

</details>
````

Version 3 forbids `specificationPr` and `archivePreparationTasks`. Both final paths must be absent for a draft or present and mutually consistent for a finalized candidate. Unknown fields, duplicate fences/JSON keys, unsafe paths, mismatched dates/change identities, and partial finalization fail closed.

## Acceptance list

Use plain bullets:

```markdown
## Acceptance

- Conservative fallback runs all required validation.
- Failed or stale evidence blocks integration.
- Finalized specs and archive match the implementation.
```

The committed conditional manifest contains the same ordered text. Trusted policy validates membership but never checks or edits it and never claims that the scenarios passed. Manual merge is the acceptance decision; no acceptance comment, checkbox edit, review-approval requirement, JSON edit, acceptance PR, archive PR, or later command is needed.

If the body list changes, candidate validation reruns and compares it with the committed manifest. If the head changes, all prior exact-head CI is stale. If only the body changes to disagree with the manifest, integration remains blocked until the list and committed candidate agree again. No lifecycle body edit is needed after green CI.

## Automated finalization

The `OpenSpec finalization` workflow (`.github/workflows/openspec-finalization.yml`) runs on `pull_request_target` for `synchronize`, `ready_for_review`, `reopened`, and `edited` events of every non-draft PR targeting `develop`, one event at a time per PR. It checks out default-branch policy, installs the pinned tooling without hooks, and runs `scripts/governance/publish-openspec-finalization.mjs --pr <n>`; the PR head enters that process only as the `openspec/` tree the pinned OpenSpec engine reads. Drafts, closed, legacy, and unassociated PRs are skipped. For a version-3 candidate it reconciles the head to its finalized form:

- **Active and current:** ordinary finalization with today's UTC date; one `docs(openspec): finalize <change>` commit.
- **Finalized, valid, and current:** nothing is pushed; the run reports `already-finalized`.
- **Finalized but drifted:** a later commit edited the archived tasks, evidence, design, or deltas, or the acceptance list changed. Finalization reruns from the archived form under the same archive date; one `docs(openspec): refinalize <change>` commit replaces the manifest and resynchronized specs.
- **Behind `develop`:** a restore commit returns the archive to its active form with the merge-base's spec bytes, a merge of `develop` follows, and finalization runs against the new tip. A merge conflict outside `openspec/` stops the run with `finalization-merge-conflict`; rebase or merge `develop` yourself and push.

The commit is pushed with a lease on the head the run read, so a developer push in between makes the run report `retry` and the next event finishes the work. Only after the push does the workflow `PATCH` the body fence, and only when the body is unchanged since it was read. The workflow's own push and body edit trigger further runs that report `already-finalized`. Every pushed commit is either a merge of the exact `develop` tip or confined to the change's active path, its archive path, and its declared canonical specs.

Because the branch gains commits from the archive App, pull before pushing. A rebase that drops them is harmless: the next push is reconciled from whatever the head contains. Do not revert a finalization commit to make a fix; push the fix and let the workflow re-finalize. When the workflow fails, its summary names the finalization code (`tasks-incomplete`, `acceptance-*`, `delivery-known-gaps`, `openspec-operation`, `finalization-merge-conflict`, ...), nothing is pushed, and `Finalized delivery validation` on the unfinalized head reports that automated finalization is pending.

## Finalization command

The local command remains available for inspection or when a developer prefers to finalize before marking the PR ready; the workflow then verifies the head and pushes nothing. It has inspection mode by default and an explicit `--write` mode. It never commits, pushes, edits GitHub, marks a PR ready, or merges. Use a temporary body file so the operation can update exact version-3 paths without mutating remote PR state:

```bash
git fetch origin develop
git rebase origin/develop
gh pr view <pr> --json body --jq .body > "$TMPDIR/openspec-pr-body.md"
node scripts/governance/finalize-openspec-delivery.mjs \
  --change example-change \
  --repository owner/repo \
  --pr <pr> \
  --date YYYY-MM-DD \
  --target "$(git rev-parse origin/develop)" \
  --body-file "$TMPDIR/openspec-pr-body.md"
```

Inspect the reported paths. Then rerun with `--write` and update the existing PR body from the emitted file:

```bash
node scripts/governance/finalize-openspec-delivery.mjs \
  --change example-change \
  --repository owner/repo \
  --pr <pr> \
  --date YYYY-MM-DD \
  --target "$(git rev-parse origin/develop)" \
  --body-file "$TMPDIR/openspec-pr-body.md" \
  --write
gh pr edit <pr> --body-file "$TMPDIR/openspec-pr-body.md"
```

Use repeated `--known-gap "exact disposition"` only for an actually reviewed explicit gap. Gaps remain visible in the committed manifest and do not become test results. Missing or ambiguous disposition blocks finalization.

The operation validates the active change strictly, requires complete substantive tasks, runs the pinned OpenSpec archive/synchronization engine in isolation, verifies the resulting canonical specs, retains every archive artifact, computes deterministic content digests, writes `acceptance.md`, and applies only the allowed OpenSpec diff. Repeating it against identical finalized inputs is verification-only and byte-stable.

Before a first finalization, canonical specs must still equal the selected target. On an already finalized head the command re-finalizes from the archived form: it resets the synchronized specs to the target's bytes, reapplies the deltas, and rewrites the manifest under the same archive path, reporting `refinalized` (or `would-refinalize` without `--write`). If `develop` advances, merge or rebase onto it and rerun; the archive engine, not a hand edit, must produce the synchronized spec and archive copy.

## Conditional acceptance and derived receipt

`acceptance.md` truthfully says its verdict activates only when the containing exact head is manually merged by an authorized human after required current-head checks. Its `openspec-delivery` block records stable pre-merge facts:

- schema version, repository, change, and source PR;
- archive and manifest paths and finalization date;
- reviewed target/spec baseline;
- ordered acceptance scenarios;
- archive, canonical-spec, task, and evidence digests; and
- explicit known-gap dispositions.

It does not predict source head, merge commit, merger, or merge time. The PR head contains the manifest, so required CI binds those bytes without a recursive self-hash. After merge, the shared reader combines the manifest with immutable GitHub source head, successful required run, authorized human actor, absence of automatic/queue/App provenance, merge commit/time, and `develop` ancestry. That derived result is the durable version-3 receipt used by audit and cleanup.

Unavailable, stale, automatic, unauthorized, conflicting, or contradictory provenance produces `invalid-provenance`/`blocked`, not acceptance. Post-merge code does not repair it by pushing `develop` or publishing another PR.

## CI and automation ownership

Normal Development CI remains complete for the implementation once its reviewable candidate exists. An archive-shaped final diff does not select documentation-only validation because the authoritative version-3 association remains implementation-bound. Base-controlled readiness defers a ready head that still holds the active change without running test suites or emitting `Development validation required`. The finalization workflow pushes the finalized head and updates its implementation fence; that update starts one complete selected validation, while PR-level concurrency cancels any superseded eligible run.

`pull_request` body edits rerun required CI. The ordinary finalized phase-free run exposes the stable protected aggregate directly; it does not wait for a lifecycle body edit. Documentation auto-merge's trusted owner also reevaluates lifecycle association and disables any armed merge. Every publication entry point explicitly refuses version 3.

The OpenSpec archive workflow remains default-branch trusted. For version 3 it uses read-only contents, PR, and Actions access to report the integrated result; App credentials are unnecessary and are not minted for post-merge verification. For legacy candidates it retains its existing scoped App publication behavior. The OpenSpec finalization workflow is the one version-3 user of the archive App: it mints a short-lived installation token with `contents: write` and `pull_requests: write`, pushes only to the candidate's own branch under a lease, edits only the body fence, and revokes the token when the run ends.

## Status and audit

Read-only inspection remains:

```bash
GH_TOKEN="$(gh auth token)" node scripts/governance/reconcile-openspec-archive.mjs --dry-run --pr <implementation-pr>
```

For version 3, status distinguishes `needs-finalization`, `ready-for-manual-merge`, `accepted-and-archived`, `closed`, `blocked`, and `invalid-provenance`. A successful workflow invocation does not imply acceptance while the PR is open. Dry run never mutates refs, PRs, body text, tasks, evidence, specs, or acceptance.

Scheduled scans continue to serve legacy catch-up. Version-3 candidates are verification-only and do not consume publication slots or block the legacy queue.

## Cleanup

After version-3 merge, verify:

- the source PR is merged with the exact reviewed head by an authorized human;
- required exact-head CI succeeded;
- current `develop` descends from the merge;
- the active change is absent;
- the declared archive, conditional manifest, and synchronized specs match their digests; and
- the unchanged remote topic ref is absent.

Only then shall the owning agent invoke the exact-candidate `complete` operation documented in [local cleanup](local-worktree-cleanup.md) from the primary checkout. The command owns registration/release, repository-generated disposables, one bounded evidence pass, non-force worktree removal, and unchanged local-ref cleanup; agents do not manually delete generated content, worktrees, or branches. Version 3 uses the implementation PR as both source and candidate and does not wait for nonexistent acceptance/archive PRs.

Closing an unmerged PR does not by itself authorize local or remote deletion. After explicit candidate-specific rejection and remote-deletion confirmation, the repository-owned local `discard` command may compare-and-delete only that closed-unmerged PR's exact unchanged same-repository unprotected topic ref, then apply the ordinary non-force local safeguards. Automatic remote cleanup remains merge-only and never touches local worktrees.

## Legacy delivery

Version 1 retains `specificationPr` and authorized exact-head comment-backed acceptance. Version 2 retains the same-PR planning/implementation link, final `## Acceptance checks` handoff, generated `#<source>(accept): ...` checkbox PR, verified authorized manual acceptance merge, and generated CI-gated archive PR. Existing records remain immutable and readable.

Legacy reconciliation may create/reuse only its established acceptance/archive branches and PRs, uses bounded catch-up/retry, preserves human edits, fails closed on missing evidence or conflicts, and never treats version 3 as publishable. Its App remains repository-scoped without administration/ruleset bypass; write credentials execute only trusted default-branch policy and never PR-head code.

A closed legacy follow-up requires targeted retry authorization. Existing valid acceptance comments and PR receipts are not rewritten. Legacy local cleanup continues to wait for implementation, acceptance where applicable, and archive integration.

## First version-3 canary

This bootstrap policy itself finishes under deployed version-2 authority. The first isolated version-3 canary must record live evidence of:

- draft planning remaining unmerged;
- explicit plan approval and same-PR implementation;
- automated current-target finalization and exact-head CI;
- authorized human manual merge with plain acceptance scenarios;
- integrated canonical specs/archive and no generated acceptance/archive PR;
- read-only `accepted-and-archived` verification and exact-head branch cleanup;
- stale head/body/base, incomplete tasks/evidence, malformed manifest, and automatic-merge refusal fixtures; and
- an unrelated standalone spec/docs PR retaining auto-merge.

Unit tests or API success alone are not live acceptance. Until this evidence exists, version 3 is deployable but documented as awaiting its operational canary.

## Disable or roll back

Before a version-3 merge, disable new version-3 authoring and continue using legacy version 2. After a version-3 merge, preserve its integrated archive and provenance and use an ordinary explicit corrective PR. Never direct-push a rewritten receipt, delete historical evidence, relax branch protection, or reinterpret an automatic merge as human acceptance.

Disabling the OpenSpec archive workflow stops legacy publication and version-3 post-merge reporting, but does not change existing acceptance records, documentation auto-merge, remote branch cleanup, or release authority.

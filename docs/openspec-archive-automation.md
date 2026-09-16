# Atomic OpenSpec delivery and legacy archival

New OpenSpec deliveries use one ordinary development pull request from draft planning through implementation, validation, acceptance, specification synchronization, and archival. The only integration action is an authorized maintainer's manual merge. Automation never auto-merges implementation-bound work and never creates a version-3 acceptance or archive follow-up PR.

Unrelated standalone documentation remains separate: a non-draft unassociated PR changing only `openspec/**`, `docs/**`, and/or root `README.md` retains the existing CI-gated automatic route. A new active change, implementation association, malformed lifecycle data, or mixed path keeps the manual hold.

Version-1 and version-2 deliveries and their existing comments, acceptance PRs, archive PRs, receipts, retries, and bounded catch-up remain supported under [Legacy delivery](#legacy-delivery). Do not silently convert an in-flight legacy delivery.

## Version-3 lifecycle

1. **Draft plan:** create one normally named branch/PR such as `feature/...`, `fix/...`, or `chore/...`. Start the body with `## Proposal`, use it for one or two sentences of intent, follow it with `## Implementation` for the concrete planned work, omit quoted phase lines and routine validation command lists, and keep machine linkage under final collapsed `Automation`. Keep it draft and include only planning artifacts until the maintainer approves the plan and explicitly requests implementation.
2. **Same-PR implementation:** continue after explicit approval in the same worktree, branch, history, draft PR, and phase-free body. Reconcile approved refinements in proposal, design, deltas, and tasks before corresponding code edits.
3. **Complete evidence:** finish implementation, required tests/evidence, substantive tasks, and explicit known-gap disposition. CI success is objective evidence, not acceptance.
4. **Plain acceptance list:** keep the body phase-free and add final `## Acceptance` with one to three concise implementation-specific behavior-and-result bullets. Do not use checkboxes, generic review/CI/approval/archive statements, URLs, mentions, or automated-test inventory.
5. **In-branch finalization:** reconcile current `origin/develop`, conservatively synchronize all deltas, move the active change into its dated archive, and stage the conditional acceptance manifest in the same branch.
6. **Ready and validate:** mark the finalized PR ready without changing its body lifecycle marker because none exists. One normal exact-head workflow validates the implementation, synchronized specs, archive, manifest, tasks/evidence, exact PR-body list, and every selected product/governance scope before emitting the stable protected aggregate. A new commit, acceptance-list change, or advanced target requires full renewed validation; no lifecycle body edit or second workflow run is required.
7. **Manual merge accepts:** after the stable protected aggregate succeeds, an authorized human reviews and manually merges the exact validated head. That single action means the listed scenarios are accepted and explicitly authorizes integration. Auto-merge, merge queue, Apps, bots, and documentation reconciliation are forbidden.
8. **Verify and clean:** trusted post-merge policy derives `Archived` and reports `accepted-and-archived` from committed bytes and immutable GitHub provenance without editing the accepted PR body. It publishes no lifecycle branch or PR. Shared exact-head remote cleanup may delete the unchanged topic ref; local cleanup remains separately ownership-controlled.

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

<!-- one to three plain behavior-and-result bullets -->

## Automation

<details>
<summary>Used by CI to link this PR to its OpenSpec change</summary>

<!-- the finalized openspec-implementation fence goes here -->

</details>
```

Keep acceptance absent during proposal review so unfinished intent is not mistaken for final acceptance criteria. Keep the finalized phase-free body unchanged through exact-head validation, maintainer review, and authorized manual merge. The same workflow run validates its finalized delivery record and applicable product/governance scopes before the stable protected aggregate succeeds. Do not add a lifecycle body edit or start a second validation run. After manual merge, trusted verification derives `Archived`; do not rewrite the accepted body.

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

## Finalization command

Finalization has inspection mode by default and an explicit `--write` mode. It never commits, pushes, edits GitHub, marks a PR ready, or merges. Use a temporary body file so the operation can update exact version-3 paths without mutating remote PR state:

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

Before finalization, canonical specs must still equal the selected target. If `develop` advances, rebase/reconcile and regenerate. To refine a finalized but unmerged change, restore the active artifacts with ordinary branch history, update plan/code coherently, and rerun finalization; never hand-edit only the synchronized spec or archive copy.

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

Normal Development CI remains complete for the implementation. An archive-shaped final diff does not select documentation-only validation because the authoritative version-3 association remains implementation-bound. The trusted acceptance-policy job validates finalization from base-controlled policy while ordinary impact selection retains all applicable product and governance owners.

`pull_request` body edits rerun required CI. The ordinary finalized phase-free run exposes the stable protected aggregate directly; it does not wait for a lifecycle body edit. Documentation auto-merge's trusted owner also reevaluates lifecycle association and disables any armed merge. Every publication entry point explicitly refuses version 3.

The OpenSpec archive workflow remains default-branch trusted. For version 3 it uses read-only contents, PR, and Actions access to report the integrated result; App credentials are unnecessary and are not minted. For legacy candidates it retains its existing scoped App publication behavior.

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

Closing an unmerged PR does not authorize local or remote deletion. Remote cleanup deletes only the exact unchanged same-repository unprotected topic ref and never touches local worktrees.

## Legacy delivery

Version 1 retains `specificationPr` and authorized exact-head comment-backed acceptance. Version 2 retains the same-PR planning/implementation link, final `## Acceptance checks` handoff, generated `#<source>(accept): ...` checkbox PR, verified authorized manual acceptance merge, and generated CI-gated archive PR. Existing records remain immutable and readable.

Legacy reconciliation may create/reuse only its established acceptance/archive branches and PRs, uses bounded catch-up/retry, preserves human edits, fails closed on missing evidence or conflicts, and never treats version 3 as publishable. Its App remains repository-scoped without administration/ruleset bypass; write credentials execute only trusted default-branch policy and never PR-head code.

A closed legacy follow-up requires targeted retry authorization. Existing valid acceptance comments and PR receipts are not rewritten. Legacy local cleanup continues to wait for implementation, acceptance where applicable, and archive integration.

## First version-3 canary

This bootstrap policy itself finishes under deployed version-2 authority. The first isolated version-3 canary must record live evidence of:

- draft planning remaining unmerged;
- explicit plan approval and same-PR implementation;
- current-target finalization and exact-head CI;
- authorized human manual merge with plain acceptance scenarios;
- integrated canonical specs/archive and no generated acceptance/archive PR;
- read-only `accepted-and-archived` verification and exact-head branch cleanup;
- stale head/body/base, incomplete tasks/evidence, malformed manifest, and automatic-merge refusal fixtures; and
- an unrelated standalone spec/docs PR retaining auto-merge.

Unit tests or API success alone are not live acceptance. Until this evidence exists, version 3 is deployable but documented as awaiting its operational canary.

## Disable or roll back

Before a version-3 merge, disable new version-3 authoring and continue using legacy version 2. After a version-3 merge, preserve its integrated archive and provenance and use an ordinary explicit corrective PR. Never direct-push a rewritten receipt, delete historical evidence, relax branch protection, or reinterpret an automatic merge as human acceptance.

Disabling the OpenSpec archive workflow stops legacy publication and version-3 post-merge reporting, but does not change existing acceptance records, documentation auto-merge, remote branch cleanup, or release authority.

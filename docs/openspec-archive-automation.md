# Automatic OpenSpec archival

The archive workflow handles accepted implementation merges into `develop`, a daily 90-day catch-up, and targeted retries. It creates an OpenSpec-only PR; existing documentation auto-merge remains responsible for squash integration after real current-head CI. An archive PR being open is not a completed archive.

Documentation CI installs only the pinned OpenSpec archive tool into runner temporary storage, not the repository dependency tree. Candidate validation selects that installation with `--tool-root`; the override is unavailable to publication and audit modes. The documentation job has read-only contents, PR, and Actions permissions; the existing merge owner also declares Actions read access for checking source validation.

## One PR: specs, implementation, CI, validation, merge, archive, cleanup

A new implementation-bound change starts as OpenSpec-only artifacts in one draft PR, not a plan merged ahead of its implementation. Planning requests authorize no code. The agent prepares the link below while opening that draft. After explicit plan approval and an implementation request, continue in the same worktree, branch, history, and PR; reconcile approved planning refinements before their code edits and include related product documentation there too.

Use this delivery sequence:

1. **Specs:** prepare and approve the plan in the draft PR. Planning does not authorize implementation by itself.
2. **Implementation:** after explicit approval/request, implement in that same worktree, branch, history, and PR. Keep it draft while implementation is unfinished.
3. **CI:** push the completed candidate and mark the PR **ready for review before running required CI**. Normal `ready_for_review`/`synchronize` events provide PR-visible test progress. Do not manually dispatch ordinary CI merely to keep the completed candidate draft and then run it again on readiness. Dedicated Full regression/native workflows remain separate required evidence where applicable.
4. **Validation:** after applicable CI passes, obtain actual maintainer validation of the exact final head. Readiness, plan approval, and green CI are not acceptance or merge authorization. A changed candidate requires current-head CI and renewed acceptance.
5. **Implementation merge:** record genuine acceptance and merge manually only after explicit authorization; implementation auto-merge stays disabled.
6. **Docs/specs auto-merge, only after implementation merge:** first confirm the accepted implementation PR is merged. Only then may the archive workflow record verified evidence, synchronize canonical specs, and prepare the completed change's OpenSpec-only archive PR. Documentation automation merges that follow-up after its own required CI. Do not separately merge the change's specs/docs or archive it before implementation integration.
7. **Cleanup:** verify both implementation and archive PR integration before removing retained local task/acceptance worktrees. Preserve ownership, clean-tree, and closed/unmerged safety checks. The owning agent performs eligible local cleanup or explicitly releases a registered checkout to the opt-in [local cleanup worker](local-worktree-cleanup.md); no always-running service is provisioned automatically. Hosted remote-branch cleanup remains independently gated on the corresponding PR's verified merge.

The implementation and archive PRs each need their own CI because they contain different changes. The redundant draft-dispatch-then-ready implementation run is what this sequence avoids. The documentation merge owner holds implementation-associated PRs and new active changes even if marked ready or their marker is removed. PR body edits trigger reconciliation and disable an excluded armed merge. Ordinary docs, standalone revisions to existing merged plans, and verified archive moves remain automatic under the exact path allowlist.

## Normal implementation handoff

The delivery agent adds one version-2 block to the initial draft PR description. It identifies the plan and implementation in that same PR, without `specificationPr`:

````markdown
```openspec-implementation
{
  "version": 2,
  "change": "example-change",
  "archivePreparationTasks": { "recordEvidence": "7.1", "stageArchive": "7.2" }
}
```
````

The minimal link is `{ "version": 2, "change": "example-change" }`. Version 2 verifies that the linked artifacts are present and identical in the accepted source and implementation merge; it never invents a separate specification PR. Omit `archivePreparationTasks` when no mechanical task mapping is needed. If used, the mapped task IDs must have exactly these descriptions:

```markdown
- [ ] 7.1 Record verified implementation acceptance and merge evidence for archive preparation.
- [ ] 7.2 Stage and verify delta synchronization and the archive move in an OpenSpec-only candidate.
```

All implementation, tests, CI, and manual-review tasks must be completed separately before acceptance. Never combine physical review or merge authorization into these mechanical tasks. An old mixed task is a blocker, not permission to tick unperformed work.

After the maintainer actually accepts the final candidate, record one authorized maintainer PR comment:

````markdown
```openspec-acceptance
{
  "version": 1,
  "change": "example-change",
  "headSha": "REPLACE_WITH_FINAL_REVIEWED_40_CHARACTER_SHA",
  "specBaseSha": "REPLACE_WITH_REVIEWED_SPEC_BASELINE_40_CHARACTER_SHA",
  "verdict": "accepted",
  "implementationComplete": true,
  "manualReview": "passed",
  "specSyncReviewed": true,
  "evidence": "Identify the exact candidate, applicable commands, scenarios reviewed, and actual outcomes."
}
```
````

The placeholders intentionally fail validation. The agent fills actual identities and reports; it must never invent a positive review. The spec baseline is an ancestor commit containing the canonical requirements against which the maintainer reviewed the deltas. It is not automatically moved to a newer baseline to conceal conflicts.

The comment author needs repository write/maintain/admin authority. A newer head needs renewed acceptance; missing, edited, contradictory, revoked, stale, or known-gap records block the automatic route. Acceptance records remain version 1 and require one unambiguous current-head acceptance record. Earlier-head records are retained; same-head contradictions or a later conflicting record require explicit reconciliation before retrying. Source acceptance is copied into the archived `acceptance.md` with PR, head, merge, check-run, and comment provenance.

The code PR still requires explicit manual merge authorization. After that merge, no additional archive request is needed for an eligible change. Planning-only and archive PRs never count as implemented changes. Existing `acceptance.md` files require manual reconciliation rather than being silently overwritten.

## Rejection, standalone docs, and legacy migration

- **New draft rejected:** if `example-change` never merged, close its PR. Neither its plan nor code lands on `develop`, and no main-branch reconciliation or completed-change archive is required. Closing alone does not authorize deleting an unmerged branch or dirty worktree; follow separate cleanup approvals.
- **Legacy merged plan rejected:** preserve its historical merge. Obtain an explicit reconciliation disposition; do not claim successful implementation or archive it as complete.
- **Legacy implementation continues:** keep the existing PR (for example #376 following #362), or create an isolated implementation stream only if none exists and implementation is explicitly requested. Retain the original version-1 link; the historical specification merge and ancestry are still verified. Unknown versions and version-2 links containing `specificationPr` are rejected.
- **Standalone docs/revision:** an unassociated non-draft README/docs PR or revision of an already-present active change retains the usual CI-gated automatic path. Renaming an archive into a new active plan establishes a hold; moving a completed active change into its archive does not.

Legacy link example:

````markdown
```openspec-implementation
{ "version": 1, "change": "legacy-change", "specificationPr": 123 }
```
````

The repository-owned [change-delivery skill](../.agents/skills/change-delivery/SKILL.md) follows these boundaries without changing external or globally installed skills. This bootstrap still needs live evidence of the new draft/approval/same-PR/refinement lifecycle, a ready-but-unimplemented plan remaining held, rejection without archival, an ordinary docs control, and accepted merge through automatic archival. Unit tests are not that evidence.

## One-time publication setup

Provisioning is a separate maintainer-approved operation, not performed by installing or running the script.

1. Create and install a repository-scoped GitHub App for this repository, without administration permissions or ruleset bypass.
2. Grant repository contents and pull-request read/write permissions. The workflow's ordinary token reads contents, PR metadata, and Actions validation; the App token is restricted to publication and status comments.
3. Set repository Actions secrets `OPENSPEC_ARCHIVE_APP_ID` and `OPENSPEC_ARCHIVE_APP_PRIVATE_KEY`. Do not paste keys into PRs, source, reports, or acceptance evidence.
4. Verify trusted default-branch deployment and run a read-only audit before the isolated live lifecycle test.
5. Record a real App-authored archive PR triggering ordinary CI, automatic protected squash integration, and exact-head branch cleanup before accepting live operation.

The script mints and revokes a short-lived installation token. It does not publish with `GITHUB_TOKEN`: GitHub can suppress the resulting PR events, leaving a PR without required CI. Missing App setup blocks mutation and does not relax protection. No extra merge owner, status spoofing, or automatic repository-settings application is introduced.

## Audit and retry

From a dependency-installed checkout, run a read-only audit using existing GitHub CLI authentication:

```bash
GH_TOKEN="$(gh auth token)" node scripts/governance/reconcile-openspec-archive.mjs --dry-run
```

To inspect one implementation PR, including one older than the scheduled window:

```bash
GH_TOKEN="$(gh auth token)" node scripts/governance/reconcile-openspec-archive.mjs --dry-run --pr 123
```

These commands do not launch the product UI and do not require a product build. They never mutate remote refs, PRs, comments, source specs/tasks, or persistent scan checkpoints. Disposable local staging verifies the proposed archive; the audit report is written to `.artifacts/openspec-archive/report.json`.

For authorized publication or retry, use the **OpenSpec archive** Actions dispatch. Keep `dry_run` enabled for inspection. Set a specific PR and `retry_closed` only when deliberately authorizing replacement of its closed/unmerged archive PR. Closing an archive PR otherwise stops automatic recreation.

## Outcomes and bounds

- **eligible**: evidence and isolated staging passed; dry-run did not publish.
- **blocked**: a named evidence/task/spec/setup/ownership problem requires attention.
- **pending**: archive PR exists; current-head CI and automatic merge are not yet complete.
- **already-archived**: merged archive identity and retained evidence were verified.
- **deferred**: the queue or scan budget prevented work this run.
- **unlinked**: no explicit implementation metadata; not presumed accepted or archived.

Only one automatic archive PR is outstanding at a time. Runs never wait on CI. A failing pending PR blocks the queue until fixed or explicitly closed; neither a rerun nor a successful old head bypasses its required checks. Human-edited branches and unrelated paths are preserved.

Catch-up scans a fixed 90-day window, up to 500 PRs per pass, with a 10-minute workflow budget and one publication per run. A small versioned cursor resumes unfinished windows; reports and cursors are retained for 14 days. Missing/expired cursors restart a bounded scan, not an assumed complete audit. Older PRs remain targetable. Exceptionally dense search buckets or incomplete GitHub search results are explicit blockers rather than silent truncation.

Known-gap archival remains a separately authorized manual path. The existing backlog is not bulk-approved when automation starts. Local worktree cleanup remains local: the owning agent can release an explicitly registered checkout to the separately enabled [local reconciler](local-worktree-cleanup.md) after stopping its use. The reconciler waits for verified archive integration and remote-ref absence, checks ownership and all local content, and never force-discards dirty work. Unregistered or unreleased worktrees remain untouched.

## Disable or roll back

Disable the **OpenSpec archive** workflow or revoke its App publication credentials. Preserve active changes and open archive PRs for review. Do not delete documents, undo synchronized specs, or modify repository rulesets merely to stop automation. Existing documentation auto-merge and remote branch cleanup remain independently governed.

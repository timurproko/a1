# Automatic OpenSpec archival

The archive workflow handles accepted implementation merges into `develop`, a daily 90-day catch-up, and targeted retries. It creates an OpenSpec-only PR; existing documentation auto-merge remains responsible for squash integration after real current-head CI. An archive PR being open is not a completed archive.

Documentation CI installs only the pinned OpenSpec archive tool into runner temporary storage, not the repository dependency tree. Candidate validation selects that installation with `--tool-root`; the override is unavailable to publication and audit modes. The documentation job has read-only contents, PR, and Actions permissions; the existing merge owner also declares Actions read access for checking source validation.

## Normal implementation handoff

The delivery agent adds one block to the implementation PR description, linking the original merged specification PR that introduced the change:

````markdown
```openspec-implementation
{
  "version": 1,
  "change": "example-change",
  "specificationPr": 123,
  "archivePreparationTasks": { "recordEvidence": "7.1", "stageArchive": "7.2" }
}
```
````

Omit `archivePreparationTasks` when all tasks are already complete. If used, the mapped task IDs must have exactly these descriptions:

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

The comment author needs repository write/maintain/admin authority. A newer head needs renewed acceptance; missing, edited, contradictory, revoked, stale, or known-gap records block the automatic route. Version 1 requires one unambiguous current-head acceptance record. Earlier-head records are retained; same-head contradictions or a later conflicting record require explicit reconciliation before retrying. Source acceptance is copied into the archived `acceptance.md` with PR, head, merge, check-run, and comment provenance.

The code PR still requires explicit manual merge authorization. After that merge, no additional archive request is needed for an eligible change. Planning-only and archive PRs never count as implemented changes. Existing `acceptance.md` files require manual reconciliation rather than being silently overwritten.

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

Known-gap archival remains a separately authorized manual path. The existing backlog is not bulk-approved when automation starts. Local worktree cleanup remains with the local agent after verified integration and a clean-tree check.

## Disable or roll back

Disable the **OpenSpec archive** workflow or revoke its App publication credentials. Preserve active changes and open archive PRs for review. Do not delete documents, undo synchronized specs, or modify repository rulesets merely to stop automation. Existing documentation auto-merge and remote branch cleanup remain independently governed.

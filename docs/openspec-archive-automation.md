# Automatic OpenSpec archival

The archive workflow handles merged OpenSpec implementations, visible acceptance review, a daily 90-day catch-up, and targeted retries. When acceptance is missing, it creates or reuses `#<number>(accept): <original implementation subject>`; only an authorized maintainer's verified manual merge of a complete exact record grants PR-backed acceptance. It then creates an OpenSpec-only archive PR, which existing documentation automation squash-integrates after real current-head CI. An open acceptance or archive PR is not completed acceptance or archival.

Documentation CI installs only the pinned OpenSpec archive tool into runner temporary storage, not the repository dependency tree. Candidate validation selects that installation with `--tool-root`; the override is unavailable to publication and audit modes. The documentation job has read-only contents, PR, and Actions permissions; the existing merge owner also declares Actions read access for checking source validation.

## One PR: specs, implementation, CI, validation, merge, archive, cleanup

A new implementation-bound change starts as OpenSpec-only artifacts in one draft PR, not a plan merged ahead of its implementation. Planning requests authorize no code. The agent prepares the link below while opening that draft. After explicit plan approval and an implementation request, continue in the same worktree, branch, history, and PR; reconcile approved planning refinements before their code edits and include related product documentation there too.

Use this delivery sequence:

1. **Specs:** prepare and approve the plan in the draft PR. Planning does not authorize implementation by itself.
2. **Implementation:** after explicit approval/request, implement in that same worktree, branch, history, and PR. Keep it draft while implementation is unfinished.
3. **CI:** push the completed candidate and mark the PR **ready for review before running required CI**. Normal `ready_for_review`/`synchronize` events provide PR-visible test progress. Do not manually dispatch ordinary CI merely to keep the completed candidate draft and then run it again on readiness. Dedicated Full regression/native workflows remain separate required evidence where applicable.
4. **Implementation review:** after applicable CI passes, obtain actual maintainer validation of the exact final head. Readiness, plan approval, and green CI are not acceptance or merge authorization. A changed candidate requires current-head CI and renewed review.
5. **Implementation merge:** merge manually only after explicit authorization; implementation auto-merge stays disabled. This integrates code but does not invent post-merge archival acceptance.
6. **Visible acceptance:** before implementation merge, add a final `## Acceptance checks` section to the implementation PR with one to three concise behavior-and-expected-result bullets unique to that implementation. Trusted automation creates or reuses one acceptance PR whose title preserves the original implementation subject and whose body contains only a plain source-PR reference plus those checks as unchecked boxes. Do not use generic review, CI, no-gap, approval, archive, source-task, or automated-test boilerplate. Candidate CI validates integrity without claiming unchecked scenarios passed; an authorized maintainer checks the scenarios and manually merges, and auto-merge is always forbidden. The exact all-checked body plus verified manual merge records archival acceptance without JSON work or an acceptance-of-acceptance PR.
7. **Docs/specs auto-merge:** the verified acceptance merge resumes conservative synchronization and prepares the OpenSpec-only archive PR. Documentation automation merges that follow-up after its own required CI. Do not separately merge specs/docs or archive before implementation and acceptance integration.
8. **Cleanup:** verify implementation, acceptance, and archive integration before removing retained local task/acceptance worktrees. Preserve ownership, clean-tree, and closed/unmerged safety checks. The owning agent performs eligible local cleanup or explicitly releases a registered checkout to the opt-in [local cleanup worker](local-worktree-cleanup.md); no always-running service is provisioned automatically. Hosted remote-branch cleanup remains independently gated on the corresponding PR's verified merge.

When a PR check fails, repair routine failures in its existing worktree, branch, and PR and repush; a separate proposal or PR is not required solely for the repair, including a narrowly scoped inherited failure. Preserve the tested behavior, assertions, coverage, and required checks, record the cause and validation, and obtain fresh current-head CI and renewed implementation review; post-merge acceptance remains separately recorded. Substantive new scope still requires clarification. Reclaim a registered released checkout before resuming work; a repair grants no live cleanup or merge authority.

The implementation, acceptance, and archive PRs each need their own CI because they carry different decisions and bytes. The redundant draft-dispatch-then-ready implementation run is what this sequence avoids. The documentation merge owner holds implementation-associated PRs, new active changes, and acceptance records/branches even if marked ready or their editable marker is removed. PR body edits trigger reconciliation and disable an excluded armed merge. Ordinary docs, standalone revisions to existing merged plans, and verified archive moves remain automatic under the exact path allowlist.

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

After implementation merge, automation commits one version-2 internal source-binding record at `openspec/acceptance/<change>/<source-head>.json` on `docs/accept-<change>-<source-pr>`. The PR is titled `#<source-pr>(accept): <original implementation subject>` after stripping only a conventional type/scope prefix. Its body begins with the linked original PR as plain reference text and then reproduces only the one to three reviewed implementation checks. The implementation link, CI, approval, archival, task inventory, and automated tests are not checkboxes. Manual merge itself is approval.

The implementation handoff section must use plain bullets, not checkboxes. Checks are 20–300 bytes each, contain no URLs or mentions, are distinct after normalization, and cannot exactly reuse another implementation's recorded checklist. Missing, duplicate, oversized, generic, or repetitive lists block before publication. For example:

```markdown
## Acceptance checks

- Overflowing pane content displays a scrollbar beside the visible viewport.
- Dragging the scrollbar updates the viewport while preserving the selected pane.
```

The generated JSON is not maintainer evidence and maintainers never inspect or edit it. It binds source identity, CI, source tasks, and the reviewed scenario text. Stale `pending` task labels do not override an exact all-checked authorized manual merge. During isolated archive staging, that receipt reconciles all remaining non-mechanical task boxes in the archived copy; the two designated archive-preparation tasks remain tied to their actual operations.

The acceptance PR starts draft when exact-head source CI is incomplete or a known gap requires separate disposition. Automation preserves valid checkbox-state edits but rejects added prose, missing or changed checks, reordered items, and altered reference text. Candidate-integrity CI may pass with unchecked boxes because it validates membership and source binding, not human outcomes. Closing without merge records no acceptance; replacement requires an authorized targeted retry. Never enable auto-merge.

Candidate CI checks the exact single added record, immutable source bindings, implementation handoff, and referenced-evidence integrity using trusted base policy and read-only permissions. After manual merge, the reader separately requires every exact box checked and verifies the final body digest, exact committed bytes, current-head CI including the acceptance check, source identities, develop ancestry, write/maintain/admin human merger, and absence of automatic/App/merge-queue provenance. Archive evidence retains scenario text and final-body digest with acceptance PR/head/merge, record digest, and author. Acceptance integration alone never authorizes local deletion.

Existing valid version-1 `openspec-acceptance` comments remain supported. Existing version-1 acceptance PR records also remain readable: their exact originally generated body must be all checked and manually merged, so completed historical reviews such as #412 can resume archival without JSON edits. Historical record files for other implementation heads coexist and are ignored during exact-head selection. Comment authors still need repository write/maintain/admin authority, and edited, contradictory, revoked, stale, known-gap, or same-head conflicts fail closed. Automation never creates a synthetic comment or chooses between conflicting comment-backed and PR-backed authority.

The code PR still requires explicit manual merge authorization. After a verified acceptance merge, no additional archive command is needed for an eligible change. Planning-only and archive PRs never count as implemented changes. Existing `acceptance.md` files require manual reconciliation rather than being silently overwritten.

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

- **awaiting-evidence**: an acceptance PR exists but exact-head source CI or a separately dispositioned known gap is unresolved; update that same request without fabricating results.
- **awaiting-manual-acceptance-merge**: the validated acceptance request needs explicit maintainer review and manual merge.
- **eligible**: accepted evidence and isolated archive staging passed; dry-run did not publish.
- **accepted-archive-blocked**: acceptance is verified, but tasks, synchronization, archive CI, or publication still blocks archival.
- **blocked**: a named evidence/task/spec/setup/ownership/conflict problem requires attention.
- **pending**: archive PR exists; current-head CI and automatic merge are not yet complete.
- **already-archived**: merged archive identity and retained evidence were verified.
- **deferred**: the queue or scan budget prevented work this run.
- **unlinked**: no explicit implementation metadata; not presumed accepted or archived.

Only one automatic archive PR is outstanding at a time. Runs never wait on CI. A failing pending PR blocks the queue until fixed or explicitly closed; neither a rerun nor a successful old head bypasses its required checks. Human-edited branches and unrelated paths are preserved.

Catch-up scans a fixed 90-day window, up to 500 PRs per pass, with a 10-minute workflow budget and one publication per run. A small versioned cursor resumes unfinished windows; reports and cursors are retained for 14 days. Missing/expired cursors restart a bounded scan, not an assumed complete audit. Older PRs remain targetable. Exceptionally dense search buckets or incomplete GitHub search results are explicit blockers rather than silent truncation.

Known-gap archival remains a separately authorized manual path. The existing backlog is not bulk-approved when automation starts. Local worktree cleanup remains local: the owning agent can release an explicitly registered checkout to the separately enabled [local reconciler](local-worktree-cleanup.md) after stopping its use. The reconciler waits for verified archive integration and remote-ref absence, checks ownership and all local content, and never force-discards dirty work. Unregistered or unreleased worktrees remain untouched.

## Disable or roll back

Disable the **OpenSpec archive** workflow or revoke its App publication credentials to stop new request/archive publication. Preserve authoritative acceptance records, their manual auto-merge hold, active changes, and open review/archive PRs. Do not delete receipts, undo synchronized specs, or modify repository rulesets merely to stop automation. Readers must remain compatible with existing PR-backed and legacy comment receipts or fail closed. Existing documentation auto-merge and remote branch cleanup remain independently governed.

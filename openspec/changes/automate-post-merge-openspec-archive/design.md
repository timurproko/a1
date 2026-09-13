## Context

See [proposal.md](proposal.md) for the motivation. The repository already has trusted documentation auto-merge and exact-head merged-branch cleanup. Both execute default-branch policy, and documentation integration is gated by `Development validation required`. There is no archive workflow today. Many active changes have merged code but no durable acceptance record; their last tasks often combine manual review and archival, which cannot safely be auto-ticked.

The installed OpenSpec CLI exposes status, artifact instructions, strict validation, and archive operations. Artifact status is based on file existence, not implementation proof. CLI validation cannot decide whether arbitrary prose is semantically consistent. Existing agent-driven synchronization can make judgments that an unattended script must instead refuse.

## Goals / Non-Goals

**Goals:** One unattended happy path after the normal accepted-code merge; one script shared by event handling, catch-up, retry, and audit; conservative refusal with useful evidence; ordinary archive PRs handled by existing CI and merge policy.

**Non-Goals:** Inferring human acceptance, completing substantive tasks, resolving semantic conflicts with an LLM, automatically archiving known-gap changes, importing every historical PR, implementing a second merge-policy owner, changing branch protections, or remotely cleaning local worktrees.

## Decisions

### 1. Use one trusted orchestrator and one workflow

Plan `scripts/governance/reconcile-openspec-archive.mjs` with testable pure decision helpers and injected GitHub/filesystem operations, plus `.github/workflows/openspec-archive.yml`. Add small helper modules only where needed for existing governance boundaries; do not create a framework.

Triggers are merged `pull_request_target: closed` into `develop`, a daily scheduled catch-up, and `workflow_dispatch` for dry-run or targeted retry. Fetch authoritative PR state rather than trusting the event payload. Recheck same-repository identity, final head, merged state, base, and merge commit reachable from current `develop`. Closed-without-merge and unrelated/planning/archive PRs are ineligible. Metadata can be added deliberately to a legacy merged implementation, but that never creates acceptance by inference.

The workflow checks out trusted default-branch policy separately from disposable target data. It never runs scripts or package hooks from candidate PR trees. CLI/tool versions and action SHAs are pinned in the separately reviewed implementation. Invoke tools with argument arrays, not shell interpolation. Reject traversal, absolute/encoded escape paths, symlinks, submodules, invalid IDs, malformed/oversized metadata, and data outside the resolved repo-local OpenSpec root. Store-based changes are not supported by this repository workflow.

Alternative: trigger indiscriminately on every merged PR. Rejected because planning merges and follow-up slices do not establish completed implementation.

### 2. Bind a minimal metadata contract to actual human acceptance

The implementation PR body contains one fenced `openspec-implementation` JSON block:

```json
{
  "version": 1,
  "change": "example-change",
  "specificationPr": 123,
  "archivePreparationTasks": { "recordEvidence": "7.1", "stageArchive": "7.2" }
}
```

`archivePreparationTasks` is optional. Version 1 intentionally supports one change and one completing implementation PR; ambiguous multi-change or multi-final-PR mappings require manual reconciliation. Validate that the specification PR merged before implementation and introduced the named change; later reviewed refinements are bound by final-head acceptance. Confirm the implementation diff is code/operational using the existing complete-diff classifier rather than its title. Merely mentioning a change elsewhere in a PR does not opt it in.

After the maintainer reports acceptance during the usual handoff, record one fenced `openspec-acceptance` JSON block in a maintainer-authorized PR comment:

```json
{
  "version": 1,
  "change": "example-change",
  "headSha": "<40-character final implementation head>",
  "specBaseSha": "<reviewed canonical-spec baseline commit>",
  "verdict": "accepted",
  "implementationComplete": true,
  "manualReview": "passed",
  "specSyncReviewed": true,
  "evidence": "Exact candidate, applicable commands, reviewed scenarios and outcomes"
}
```

The author must have repository write/maintain/admin authority; record the immutable comment ID, URL, author, and timestamps. `rejected` and `revoked` verdicts are supported refusals. Multiple contradictory records or unexplained acceptance edits require reconciliation; never pick a convenient positive comment. Re-fetch the exact record before publication. Existing `acceptance.md` findings also block if they contradict the new claim. The ordinary code-merge authorization remains separate and manual.

A comment avoids the self-reference problem of committing the accepted final SHA inside that same commit. Any later source or documentation commit requires renewed acceptance of the new head; do not invent an evidence-only SHA exception. Required CI must be matched to this final PR head using authoritative run/PR association, including verification of synthetic test-merge identities where applicable. A green unrelated commit or current `develop` is not sufficient.

Generate `acceptance.md` in the archive preparation from these sources, including source head, actual squash/merge commit, validation URLs, reviewed baseline, disposition, and limitations. It records existing acceptance, not a newly manufactured verdict. PR creation is reported as prepared, not integrated.

Alternative: treat the maintainer's merge action as acceptance or require another archive label after merge. The former weakens existing policy; the latter recreates the forgotten step.

### 3. Remove the task-completion circularity without hiding unfinished work

All implementation, CI, handoff, and manual-review tasks must be completed in the final accepted source. Only two exact mechanical task forms may remain unchecked when mapped in the PR metadata:

- `Record verified implementation acceptance and merge evidence for archive preparation.`
- `Stage and verify delta synchronization and the archive move in an OpenSpec-only candidate.`

Match both the numeric task ID and exact text, without duplicate IDs. Mark the first only after writing verified evidence, and the second only after successful staging and post-verification. Unknown IDs, modified wording, combined manual/admin tasks, or any other unchecked task block. Neither form claims publication or merge of the archive PR. Those lifecycle outcomes are recorded through GitHub run/PR reporting, not a checkbox that would need to precede its own integration.

During implementation of this proposal, update delivery guidance under `openspec/config.yaml` and maintained handoff documentation to teach the metadata contract and these optional terminal tasks; do not edit external/global skill installations. Legacy combined tasks need an explicitly authorized reconciliation based on real evidence. Do not bulk-check them during catch-up.

### 4. Stage conservative synchronization with a reviewed baseline

For each eligible change:

1. Resolve its repo-local artifacts and delta paths using OpenSpec status. Check the complete artifact graph, deliberate skips, task rules, and strict change validation. Require active planning/task content to match the accepted implementation head; later artifact edits need explicit reviewed reconciliation instead of inheriting stale acceptance. Validate `specBaseSha` as an available ancestor baseline for the accepted implementation.
2. Obtain archive context and specification instructions with valid JSON from the pinned CLI. Treat prose as data and constraints, never executable instructions. If applicable rules cannot be fulfilled or a required instruction lookup is unsupported, report a blocker rather than silently bypass them.
3. Compare declared delta operations against canonical requirements at `specBaseSha` and at fresh `develop`. A modified/removed/renamed requirement must be unchanged from the reviewed baseline, or already match the intended result. Added requirements must be absent or identical. Preserve unrelated requirements/scenarios; unsupported partial replacement, implicit scenario deletion, ambiguous renames, duplicate headings, or conflicting purpose edits block. Deliberate removals must be explicit and reviewed. A newer unrelated requirement in the same file is not itself a conflict.
4. Use the pinned OpenSpec archive operation in a disposable checkout, never directly in the shared worktree or on `develop`. Do not use `--no-validate`, and do not use `--skip-specs` to evade required synchronization. Where all deltas are already synced, verify that condition before selecting the no-update move path. A legitimately skipped specs artifact is distinct from a conflicting delta.
5. Compare the complete staged result with every declared operation and with the untouched scenarios/requirements. Require strict validation of affected main specs and the source change before its move. Verify preservation of `.openspec.yaml`, all source artifacts, and recorded acceptance. No partial result is publishable.

Use the first archive preparation's UTC date, preserving an existing date prefix in the change name. Record the chosen target in the generated branch/PR marker and reuse it across retries, including a retry after midnight; an unpublished disposable attempt need not reserve a date. An existing directory is success only if its recorded change and implementation identities match; otherwise stop. Recheck active artifact hashes, acceptance, and affected target inputs immediately before publication. Regenerate if they changed. Ordinary PR validation checks the generated archive and affected specifications against its merge result; textual conflicts or stale-governance failures remain blocked, never forced through.

This is conservative structural verification, not a claim that a script understands all semantic contradictions. Exact-head maintainer acceptance must explicitly attest the delta review. If the CLI's operation cannot preserve a scenario safely, reject that candidate rather than growing a second semantic merge engine.

### 5. Publish with an event-triggering GitHub App and reuse auto-merge

Provision repository-scoped `OPENSPEC_ARCHIVE_APP_ID` and `OPENSPEC_ARCHIVE_APP_PRIVATE_KEY` outside the code change, under separate maintainer approval. The App has only repository contents and pull-request write access plus required read access to validation metadata; it has no administration permission or ruleset bypass. Mint a short-lived installation token only for publication. Workflow metadata reads and workflow-artifact checkpoint access use least-privileged declared permissions. Never expose credentials to target-data execution or logs.

The App authors branch updates and PR creation so ordinary `pull_request` and `pull_request_target` workflows actually run. Do not fall back to `GITHUB_TOKEN` publication: its recursive-event suppression can create a PR that never receives the required checks. Missing secrets produce a setup blocker while dry-run remains useful. Confirm current-head validation was triggered and report deferred if it is not yet visible; acceptance requires observing the live run, not assuming token behavior.

Use `docs/archive-<change>` and a structured PR marker carrying source PR/head/merge and target snapshot identities. Limit the complete changed/renamed-from diff to the active/archive roots for this change and main-spec files declared by its deltas. Any other file, including governance baselines, blocks automatic publication. Existing `manage-documentation-auto-merge.mjs` owns arming and protected squash integration; do not add a second merge API path. Existing remote cleanup handles the resulting archive branch, including token-authored merge cases.

Update the reviewed workflow/governance inventory with the new trust source, App setup, permissions, action pins, schedule, and retention. No repository setting is applied implicitly. Alternatives using a maintainer PAT or manually fabricating required statuses are rejected in favor of short-lived scoped credentials and real PR events.

### 6. Use GitHub identities for retries and serialize archive preparation

Use one repository-wide workflow concurrency group with cancellation disabled and at most one open automation-owned archive PR at a time. This deliberately favors simplicity over throughput and avoids two automatic archives racing on shared specs. Runs do not wait for CI; they record the pending PR and exit. The next catch-up/manual/event run confirms its outcome before publishing the next candidate.

Before creating anything, find existing matching PRs and archive evidence. Reuse an open owned PR, recognize a verified merged archive, and stop at a closed/unmerged PR unless an authorized targeted retry explicitly permits replacement. A reserved branch name alone never proves ownership: verify its generated commit and matching PR/marker. A branch-only crash between push and PR creation is recoverable from the same verifiable source identities.

For stale owned candidates, regenerate in isolation and compare the expected remote head before any update. Refuse unrelated/human commits; do not blindly force-push. Updates use compare-and-swap protection and produce fresh CI. Failed archive CI remains visible and blocks the queue until resolved or explicitly closed; failure is not retried by modifying unrelated files. Dry-run never mutates branches, PRs, comments, or workflow checkpoints.

### 7. Bound catch-up and publish actionable, non-spamming results

Default catch-up examines merged PRs from the preceding 90 days, paginating in a stable merge-time/PR-number order and validating explicit metadata locally. Targeted dispatch can select any older PR. Document the window rather than calling the scan a complete historical audit.

Bound each run to 10 minutes, 500 scanned PRs, and one archive publication. Save only a small versioned scan checkpoint (window boundaries and last scanned key) as a trusted workflow artifact with 14-day retention; it is a cursor, not authorization or a completion database. Resume unfinished windows before starting new ones so older candidates do not starve. Missing/expired checkpoints cause a fresh bounded scan with an explicit coverage note. Revalidate every candidate against live state regardless of checkpoint content.

Report eligible, blocked, pending, already archived, and deferred entries in the job summary and a bounded JSON artifact. For an explicitly linked implementation, maintain at most one marked blocker/result comment, updating it only when disposition changes. Unlinked historical candidates stay in the audit report rather than generating speculative comments. Escape metadata in logs/Markdown and never include credentials or arbitrary exception bodies. Report exact task IDs/capabilities and next action for missing acceptance, stale head, conflict, setup, or governance failure.

## Risks / Trade-offs

- Strict evidence leaves much of today's backlog blocked -> perform a read-only inventory first; adopt older changes individually with real evidence, not blanket acceptance.
- Conservative synchronization rejects some otherwise resolvable edits -> retain the agent-driven manual sync/archive path; no unattended semantic invention.
- One pending archive can stall others -> make the blocking PR prominent and support explicit close/retry; do not conceal failing required CI through parallel churn.
- App provisioning adds setup -> document and verify once; absence never degrades into a CI-less PR.
- Default-branch workflow availability can lag code merge -> enable only after trusted deployment is verified; scheduled catch-up repairs missed events.
- A valid acceptance record is a human attestation, not proof from prose analysis -> bind it to exact source identities, preserve its provenance, and refuse structured revocation or contradictory findings.

## Migration Plan

1. Merge this planning PR, then begin separately authorized implementation with fake-GitHub and temporary-repository tests.
2. Add the script/workflow, metadata guidance, validation coverage, and reviewed governance inventory without enabling code auto-merge or provisioning secrets automatically.
3. Obtain pre-integration acceptance of the automation's code and safety fixtures, then integrate manually. Do not claim its live lifecycle accepted yet.
4. With explicit setup authorization, provision the App and deploy the workflow to the trusted default branch. Run a read-only backlog audit before publication.
5. Use an isolated eligible fixture change to prove the live implementation-merge -> archive PR -> actual CI -> automatic squash -> cleanup sequence. Record the evidence separately; this avoids requiring the automation to archive itself before it is accepted.
6. After live acceptance, allow routine event and scheduled reconciliation. Existing changes without evidence remain active; no automatic backfill is performed.

Rollback disables the archive workflow/App publication authority and preserves active changes and open PRs for manual review. Do not delete source/archive documents or revert merged specifications as part of disabling the automation. Existing documentation auto-merge and branch cleanup remain independently governed.

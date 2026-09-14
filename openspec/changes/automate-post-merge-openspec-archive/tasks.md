## 1. Adopt single-PR planning and implementation

- [x] 1.1 Reconcile the separately authorized implementation stream with this revised plan, including existing PR #376 rather than assuming its older implementation conforms; verify a recorded gap review covers the single-PR boundary, documentation hold, metadata versions, and live acceptance additions without claiming unverified tasks complete.
- [ ] 1.2 Update `openspec/config.yaml` and repository-owned delivery skills/handoff guidance for draft planning, explicit approval before implementation, same-worktree/branch/PR continuation, coherent refinements, and manual final integration; verify no applicable repository-owned instruction still requires a separate planning merge for new changes, and update the canonical delivery-spec purpose wording consistently.
- [ ] 1.3 Extend the existing documentation auto-merge owner to hold drafts, implementation-associated PRs, and newly introduced active changes using complete diff and authoritative base/head state; verify OpenSpec-only plans remain held when marked ready, marker removal cannot bypass the hold, malformed metadata fails closed, and an armed merge is disabled.
- [ ] 1.4 Reconcile lifecycle metadata on PR body edits and preserve ordinary docs, standalone existing-change revisions, and archive eligibility; verify fixtures cover no-commit association edits, both rename paths, current-head checks, archive-directory exclusion, and code/mixed PRs remaining manual.
- [ ] 1.5 Document rejection and legacy migration handling with concrete examples; verify closing an unmerged draft requires neither main-branch reconciliation nor completed-change archival, while already-merged rejected plans and unmerged local cleanup still require explicit disposition.

## 2. Bind the normal handoff to archive eligibility

- [ ] 2.1 Parse the minimal version-2 one-change PR link without `specificationPr` and retain explicit version-1 legacy specification linkage; verify valid single-PR and legacy fixtures plus rejection of duplicate/oversized/malformed blocks, unknown versions, ambiguous links, and planning-only/archive PRs as completion evidence.
- [ ] 2.2 Resolve authoritative same-repository implementation merge identity, linked accepted artifacts, exact-head required validation, and maintainer acceptance provenance; verify closed-unmerged/wrong-base/fork cases, stale/revoked/conflicting acceptance, missing authority, and unrelated or synthetic CI identities fail closed without requiring a prior specification merge for version 2.
- [ ] 2.3 Implement artifact/task eligibility and the two optional exact mechanical task forms; verify unfinished substantive work, duplicate IDs, altered wording, and mixed legacy acceptance/archive tasks block without being checked automatically.
- [ ] 2.4 Provide agent-prepared link and acceptance examples in the normal handoff; verify final-head acceptance records real reported manual review and delta review without treating approval-to-implement, CI, or merge alone as acceptance, and no post-merge archive request is required.

## 3. Stage verified synchronization and archival

- [ ] 3.1 Load repo-local artifacts in isolation with a pinned OpenSpec CLI and instruction/strict-validation checks; verify path escapes, symlinks, unsupported stores/rules, missing artifacts, and invalid JSON cannot execute candidate code or mutate shared targets.
- [ ] 3.2 Compare declared operations against the reviewed baseline and fresh target requirements; verify additions, modifications, removals, renames, multi-capability changes, already-synced deltas, and deliberately skipped specs preserve unrelated scenarios and refuse conflicting or implicit deletion cases.
- [ ] 3.3 Stage the CLI sync/archive operation, generated acceptance evidence, and only verified mechanical task updates; verify all-capability post-validation, metadata preservation, stable date naming, matching archive reuse, collisions, and mid-operation failures produce a complete candidate or no publishable diff.
- [ ] 3.4 Recheck accepted source/evidence/target identities and enforce the exact generated-path allowlist; verify intervening artifact or target edits require reviewed reconciliation or regeneration and code, unrelated OpenSpec files, or external governance-baseline changes block publication.

## 4. Publish once through existing merge policy

- [ ] 4.1 Implement deterministic archive identity, prior-result discovery, and branch-only crash recovery; verify duplicate events/retries reuse one verifiably owned archive PR and recognize confirmed integration.
- [ ] 4.2 Implement expected-head-protected regeneration and closed-PR handling; verify human edits and unknown ownership are preserved, closed-unmerged PRs require explicit replacement authorization, and updated heads require fresh CI.
- [ ] 4.3 Publish with the scoped GitHub App and hand archive integration to existing documentation auto-merge; verify missing credentials, CI-suppressing fallback, direct merge/bypass attempts, and publication outside the selected OpenSpec paths are rejected.
- [ ] 4.4 Serialize automatic archives and report pending, failed, and merged outcomes; verify shared-spec candidates regenerate after predecessors resolve, runs do not wait for CI, and existing exact-head cleanup alone owns remote branch deletion without touching local worktrees.

## 5. Add trusted triggers, recovery, and reporting

- [ ] 5.1 Add the trusted merged-implementation, daily catch-up, and targeted dispatch/dry-run workflow and inventory the documentation policy's added lifecycle trigger; verify default-branch execution, pinned actions, least-privilege authority, retention, concurrency, and runtime bounds match reviewed governance.
- [ ] 5.2 Implement the bounded 90-day/500-PR recovery scan, stable pagination, resumable trusted artifact cursor, and explicit older-PR targeting; verify missed eligible merges recover, scan coverage and deferred work are visible, and checkpoints cannot authorize archival or silently imply complete backlog coverage.
- [ ] 5.3 Emit bounded JSON/job summaries and deduplicated linked-PR result comments; verify eligible, blocked, pending, archived, and deferred reports identify task/capability/setup blockers without leaking credentials or generating speculative comments for unlinked history.
- [ ] 5.4 Verify read-only dry-run with mutation-recording API fixtures and temporary repositories; confirm no refs, PRs, comments, task/spec files, or persistent checkpoints change, including missing-credential, rejected-draft, and historical-backlog cases.

## 6. Validate and integrate manually

- [ ] 6.1 Integrate focused single-PR policy, metadata, sync, publication, and generated-archive validation tests into required CI; verify the final implementation head passes without relaxing path allowlists, branch protections, or documentation governance checks.
- [ ] 6.2 Deliver the separately authorized implementation update with exact commit, focused dry-run/fixture commands, App prerequisites, and known gaps; verify maintainer acceptance and explicit manual merge authorization are recorded without auto-merging the implementation or declaring live lifecycle acceptance prematurely.
- [ ] 6.3 Confirm manual integration and trusted-default-branch deployment of the policy and workflow; verify their source/merge identities before claiming the single-PR process or unattended archival is active.

## 7. Prove live behavior and close the bootstrap change

- [ ] 7.1 Obtain explicit App provisioning/activation authorization and perform a read-only backlog audit; verify scoped publication authority and real CI-trigger capability without auto-adopting legacy changes.
- [ ] 7.2 Exercise an isolated new change from draft plan through explicit implementation approval, same-PR refinement/code, final-head acceptance, and manual merge to automatic archive PR creation, ordinary CI, squash integration, and exact-head cleanup; record all source/acceptance/head/run/merge identities and verify no extra docs merge or archive command is needed.
- [ ] 7.3 Exercise a still-planning PR marked ready and then rejected/closed unmerged, plus an ordinary standalone docs PR; verify the former never auto-merges or archives and the latter retains its normal automatic path.
- [ ] 7.4 Record maintainer live acceptance and complete this bootstrap change through a specification-only follow-up; verify all findings and substantive tasks are resolved before synchronization/archival, retain worktrees until confirmed merged and clean, and do not require this automation to archive its own still-unaccepted implementation.

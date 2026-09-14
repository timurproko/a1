## 1. Define eligibility and normal handoff evidence

- [x] 1.1 Add strict parsing of versioned implementation and acceptance metadata with repository/change/PR/head/baseline identities; verify fixtures reject duplicate blocks, malformed or oversized values, unsupported versions, ambiguous links, and planning/archive PRs.
- [x] 1.2 Resolve authoritative merged-PR state, specification ancestry, exact-head required validation, and maintainer acceptance provenance; verify stale acceptance, revoked/conflicting records, missing permissions, wrong-base/fork/unmerged PRs, and unrelated or synthetic CI identities fail closed.
- [x] 1.3 Implement artifact/task eligibility with the two exact optional mechanical task forms; verify incomplete substantive tasks, duplicate IDs, altered wording, and mixed legacy acceptance/archive tasks remain unchecked and block.
- [x] 1.4 Update repository-owned delivery guidance and provide copy-pasteable metadata examples for the usual pre-merge handoff; verify examples bind final-head acceptance without requiring a post-merge archive request or treating CI/merge as manual acceptance.

## 2. Stage verified synchronization and archival

- [x] 2.1 Add isolated repo-local artifact loading with the pinned OpenSpec CLI and instruction/strict-validation checks; verify path escapes, symlinks, unsupported stores/rules, missing artifacts, and invalid JSON cannot execute candidate code or mutate shared targets.
- [x] 2.2 Compare declared operations against the reviewed baseline and fresh target requirements; verify additions, modifications, removals, renames, multi-capability changes, already-synced deltas, and deliberately skipped specs preserve unrelated scenarios and refuse conflicting or implicit deletion cases.
- [x] 2.3 Stage the CLI sync/archive operation, generated acceptance evidence, and verified mechanical task updates; verify all-capability post-validation, metadata preservation, stable date naming, matching archive reuse, collisions, and mid-operation failures produce either a complete candidate or no publishable diff.
- [x] 2.4 Recheck source/evidence/target identities and enforce the exact generated-path allowlist; verify intervening edits require regeneration and any code, unrelated OpenSpec file, or external governance-baseline change blocks publication.

## 3. Publish once through existing merge policy

- [x] 3.1 Implement deterministic archive branch/PR identity, existing-result discovery, and branch-only crash recovery; verify duplicate events and retries reuse one verifiably owned candidate and recognize already integrated archives.
- [x] 3.2 Implement expected-head-protected regeneration and closed-PR handling; verify human commits and unknown branch ownership are preserved, a closed/unmerged PR is not recreated without explicit retry authorization, and regenerated heads require fresh CI.
- [x] 3.3 Publish with the scoped GitHub App and hand integration to existing documentation auto-merge; verify fake-GitHub coverage rejects missing credentials, suppressed-event fallback, direct merge/bypass attempts, and publication outside the selected OpenSpec paths.
- [x] 3.4 Serialize automatic archive candidates and report pending, failed, and merged outcomes; verify a second shared-spec candidate is regenerated only after the preceding archive is resolved, no run waits for CI, and existing exact-head cleanup remains the branch-deletion owner.

## 4. Add bounded triggers, catch-up, and reporting

- [x] 4.1 Add the trusted workflow for merged implementation events, daily catch-up, and targeted dispatch/dry-run; verify its default-branch checkout, pinned actions, least-privilege credentials, concurrency, and runtime bounds match the reviewed governance inventory.
- [x] 4.2 Implement the 90-day/500-PR scan, stable pagination, resumable trusted workflow-artifact cursor, and explicit older-PR targeting; verify missed events recover, scan coverage is reported, deferred work resumes, and missing/expired checkpoints never authorize work or silently imply a complete audit.
- [x] 4.3 Emit bounded JSON/job summaries and deduplicated linked-PR comments for eligible, blocked, pending, already archived, and deferred outcomes; verify reports identify task/capability/setup blockers without leaking credentials, arbitrary exception content, or posting speculative comments on unlinked PRs.
- [x] 4.4 Verify dry-run and safety regressions with mutation-recording API fixtures and temporary repositories; confirm no refs, PRs, comments, task/spec files, or persistent scan checkpoints change, including credential-missing and historical-backlog cases.

## 5. Validate and integrate the implementation manually

- [ ] 5.1 Integrate focused metadata/sync/publication/workflow tests into required governance validation, including generated-archive strict validation; verify the current implementation head passes required CI without relaxing allowlists, rulesets, or documentation baseline checks.
- [ ] 5.2 Deliver the separately authorized implementation PR with its exact commit, focused dry-run/fixture commands, App setup prerequisites, and known gaps; verify maintainer acceptance and explicit code-merge authorization are recorded without enabling code auto-merge.
- [ ] 5.3 Confirm manual implementation integration and trusted-default-branch deployment; verify the merge SHA and workflow source, leaving live lifecycle acceptance pending rather than treating code integration as proof of unattended archiving.

## 6. Prove live operation and close the change

- [ ] 6.1 Obtain explicit App provisioning/activation authorization and perform a read-only backlog audit; verify publication identity permissions, real CI-trigger capability, and actionable candidate/blocker output without bulk-adopting legacy changes.
- [ ] 6.2 Exercise an isolated accepted implementation merge through the deployed workflow; record the source PR/head/acceptance/merge, generated archive PR/head, ordinary required validation run, automatic squash commit, and exact-head cleanup outcome, verifying no extra archive command or manual archive-PR merge was needed.
- [ ] 6.3 Record maintainer live acceptance and use a specification-only completion follow-up for this bootstrap change; verify all remaining findings are resolved before claiming full completion, synchronize/archive only with the recorded evidence, and preserve local worktrees until their PRs are confirmed merged and clean.

## Implementation verification record

Local verification on 2026-09-13: 193 focused tests passed across the archive, documentation-auto-merge, and repository-governance fixtures; typecheck and changed-file code-documentation governance passed. Coverage includes the actual pinned OpenSpec CLI, skipped specs, generated merge-result verification, temporary Git remotes with concurrent-ref protection, retry recovery, bounded discovery, and authority revocation. A real read-only GitHub probe verified historical successful CI for PR #349 despite GitHub clearing its run's PR association array; that PR remains unlinked and was not adopted or archived.

Tasks 5 and 6 remain open: local fixtures are not required CI, maintainer acceptance, manual implementation integration, App provisioning authorization, or live unattended lifecycle evidence. No publication credentials or repository settings have been provisioned by this implementation.

CI correction on 2026-09-14: run 34848414212 failed the existing lightweight docs-job assertion because archive validation installed the full checkout dependency tree. The docs job now installs only OpenSpec 1.11.0 into runner temporary storage and selects it with a validation-only tool-root option; the original assertion remains unchanged. Required read-only PR/Actions metadata permissions are explicit in the workflows and reviewed inventory. All 198 focused tests across 9 files, including that previously omitted governance regression, passed locally with typecheck, changed-file documentation checks, and strict OpenSpec validation. An isolated 80-package tool installation also completed a real read-only candidate check. Replacement required CI and maintainer acceptance remain pending.

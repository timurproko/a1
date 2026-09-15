## 1. Acceptance record and review policy

- [x] 1.1 Implement strict versioned acceptance request/receipt schemas binding exact source, artifact/task, baseline, and evidence identities; verify malformed, oversized, duplicate, wrong-repository, stale, and forged records fail closed.
- [x] 1.2 Implement explicit evidence-backed task reconciliation and pure signoff designations; verify pending/live/mixed tasks are not auto-completed, known gaps stay blocked, and signoff needs no recursive acceptance PR.

## 2. Manual merge protection and candidate checks

- [x] 2.1 Add authoritative acceptance-path/association exclusion to every documentation auto-merge route; verify arming, direct merge, unstable recovery, renamed/deleted records, removed markers, ambiguous data, and already-armed PRs remain held while ordinary docs/archive controls remain eligible.
- [x] 2.2 Add trusted read-only acceptance candidate validation to ordinary PR CI; verify exact diff/source/evidence checks, real current-head check publication, no privileged candidate execution, and no self-referential wait for the validator's own success.

## 3. Visible request publication and reconciliation

- [x] 3.1 Publish a clearly titled/body-rendered acceptance request through the existing App with source/CI/evidence/task links and conditional merge meaning; verify incomplete work is visibly draft/blocked and generation never publishes a positive receipt or another proposal.
- [x] 3.2 Integrate merge events, bounded catch-up, and targeted retry with one shared publication budget; verify duplicate events, crash recovery, human edits, unknown ownership, closed-request retry authorization, fair progress, and acceptance merges routing back to the original implementation.
- [x] 3.3 Extend implementation comments, PR summaries, and read-only audit output with explicit lifecycle states and next actions; verify dry runs mutate no lifecycle objects and successful jobs with blockers do not claim archival success.

## 4. Receipt verification through archival and cleanup

- [x] 4.1 Verify acceptance-head CI, authorized human manual-merge provenance, committed/merged record equality, and current integration; return tagged PR-backed or legacy comment-backed receipts and verify bot/auto/unknown merges, stale heads, duplicate authority, and revocation block.
- [x] 4.2 Carry verified receipts and reviewed task reconciliation through conservative archive staging, committed/PR markers, candidate validation, retained evidence, and already-archived checks; verify original source identity, legacy compatibility, baseline drift, and no partial synchronization.
- [x] 4.3 Update local cleanup evidence consumption for the tagged receipt; verify acceptance alone never permits removal and all archive/ref/ownership/content gates remain intact for both receipt formats.

## 5. Documentation and automated verification

- [x] 5.1 Update delivery skill, OpenSpec context, archive runbook, and local-cleanup guidance for the visible human action and rollback; verify examples explain missing work, same-PR repairs, legacy compatibility, and no automatic acceptance or watcher activation.
- [x] 5.2 Add adversarial policy/integration/workflow fixtures covering all new scenarios and supported backlog shapes including #400's pending tasks; verify generated requests cannot become self-authorizing and normal docs/archive controls still work.
- [x] 5.3 Run strict OpenSpec and applicable focused validation; verify documentation coherence, complete validation-suite ownership, least privilege, and the final scoped diff, and record actual results.
- [ ] 5.4 Push the completed implementation ready for normal PR CI and verify required checks on the exact current head; retain failures and platform limitations explicitly rather than treating earlier or skipped checks as passed.
- [x] 5.5 Render acceptance PR titles as `#<source PR>(accept): <original implementation subject>` and reduce the body to the source link plus required verification checklist; verify conventional title-prefix handling and concise pending/complete states.
- [x] 5.6 Separate candidate-record integrity from receipt completeness so unresolved review items do not fail acceptance PR CI while incomplete merged records remain blocked from archival; add regression coverage for both boundaries.
- [x] 5.7 Run strict OpenSpec and focused acceptance governance validation for this refinement, then push it for normal current-head CI without changing #408's acceptance record or inferring completion.

## 6. Maintainer and live acceptance

- [ ] 6.1 Provide the exact candidate, focused preview/review commands, expected results, and known gaps; obtain and record actual maintainer review without treating implementation approval as acceptance or merge authority.
- [ ] 6.2 After trusted deployment and separate authorization, verify an isolated implementation-to-acceptance-to-archive lifecycle, manual-only acceptance merge, negative controls, and linked status; record actual PR/head/merge/check identities without relying on this change's own future archive.

## 7. Mechanical archive preparation

- [ ] 7.1 Record verified implementation acceptance and merge evidence for archive preparation.
- [ ] 7.2 Stage and verify delta synchronization and the archive move in an OpenSpec-only candidate.

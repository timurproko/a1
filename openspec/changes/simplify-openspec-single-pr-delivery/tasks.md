## 1. Versioned Delivery Contracts

- [ ] 1.1 Extend implementation-link parsing and types for strict version-3 `change`, `archive`, and `acceptanceManifest` fields while retaining version-1/version-2 behavior; verify focused fixtures reject unknown versions, conflicting fences, forbidden legacy fields, malformed paths, and ambiguous associations.
- [ ] 1.2 Define the version-3 conditional acceptance manifest and derived receipt models; verify schema tests cover required repository/change/PR/baseline/scenario/digest data, forbid predicted merge provenance, and fail closed on unknown or contradictory fields.
- [ ] 1.3 Replace implementation-checklist parsing for version 3 with exact `## Acceptance` plain-bullet parsing; verify one-to-three implementation-specific scenarios pass while checkboxes, reordered/mismatched lists, generic boilerplate, duplication, URLs/mentions, oversize text, and unrelated exact reuse fail.
- [ ] 1.4 Add deterministic archive-input and synchronized-spec digest calculation that excludes inherently post-merge fields; verify byte/order/path changes invalidate the manifest without creating a recursive head or self-file hash.

## 2. In-Branch Finalization

- [ ] 2.1 Extract conservative synchronization and archive preparation from publication-specific orchestration into reusable staging primitives; verify existing version-1/version-2 archive fixture outputs and conflict refusals remain unchanged.
- [ ] 2.2 Implement version-3 finalization inspection and explicit write modes against a fresh target baseline; verify successful write synchronizes every delta, moves the complete active change to the dated archive, writes the conditional manifest, updates association paths, and changes no remote ref or PR state.
- [ ] 2.3 Enforce artifact, substantive-task, evidence, known-gap, archive-target, and source-baseline prerequisites before finalization; verify incomplete, failed, stale, ambiguous, occupied, or undispositioned inputs preserve the active working state and produce actionable blockers without partial writes.
- [ ] 2.4 Make finalization deterministic and idempotent and document/refactor a safe pre-merge refinement path; verify repeated check/write on identical inputs is byte-stable and a reconciled target or changed implementation requires regeneration rather than stale reuse.
- [ ] 2.5 Add final-candidate verification that reconstructs the intended synchronization from archived deltas and baseline data; verify missing active removal, altered canonical specs, incomplete archive contents, unexpected paths, or manifest digest disagreement blocks readiness.

## 3. Exact-Head CI and Merge Holds

- [ ] 3.1 Integrate version-3 final-candidate validation into the stable Development required aggregate using immutable-base policy; verify the exact head, current target baseline, archive, synchronized specs, manifest, body scenarios, tasks, evidence, and gaps are all bound to the required result.
- [ ] 3.2 Preserve complete impact-selected implementation validation after the active change becomes an archive-shaped diff; verify version-3 fixtures retain every selected product/governance owner and cannot use documentation-only or legacy acceptance-only shortcuts.
- [ ] 3.3 Extend body-edit, ready, synchronize, and completion reconciliation so current-head body-to-manifest validation is refreshed; verify a changed body, head, baseline, or required run invalidates stale success and cannot claim human acceptance.
- [ ] 3.4 Make every automatic integration owner explicitly exclude version-3 delivery PRs and disable any already-armed request; verify native auto-merge, documentation reconciliation, merge queue, archive publication, and App/bot paths all leave a green candidate open for authorized manual merge.
- [ ] 3.5 Update workflow triggers, permissions, concurrency, and declarative governance inventory for finalization validation and read-only post-merge verification; verify trusted write workflows execute only default-branch policy and no new branch-protection bypass or publication authority is introduced.

## 4. Manual-Merge Acceptance and Post-Merge Verification

- [ ] 4.1 Extend the shared acceptance reader to derive a version-3 accepted receipt from the committed conditional manifest plus exact GitHub head/check/actor/method/time/target ancestry; verify authorized human manual merge succeeds and open, stale, automatic, queued, bot/App, unauthorized, or unverifiable provenance fails closed.
- [ ] 4.2 Add version dispatch to archive reconciliation so version 3 performs verification/status only; verify it never mints publication credentials, pushes `develop`, edits tasks/specs/evidence, or creates/updates acceptance or archive refs and PRs.
- [ ] 4.3 Preserve version-1/version-2 comment, acceptance-PR, archive-PR, catch-up, retry, and publication behavior; verify mixed historical records select the exact version/head and legacy mutation never treats version 3 as publishable.
- [ ] 4.4 Update audit and status outcomes for draft, needs-finalization, ready-for-manual-merge, accepted-and-archived, closed, legacy-pending, blocked, and invalid-provenance cases; verify successful workflow execution does not overstate acceptance or archival.
- [ ] 4.5 Feed the derived version-3 receipt into already-archived and local-cleanup evidence checks while retaining exact-head remote branch cleanup; verify cleanup requires merged archive ancestry and remote-ref absence and still refuses dirty, unowned, unreleased, advanced, protected, fork, or unverifiable state.

## 5. Repository Guidance and Canonical Policy

- [ ] 5.1 Update the repository-owned delivery skill and `openspec/config.yaml` from the version-2 three-PR sequence to draft planning, approved same-PR implementation, in-branch finalization, `## Acceptance` plain bullets, exact-head CI, and authorized manual merge; verify guidance explicitly forbids implementation auto-merge and follow-up acceptance/archive PRs while retaining standalone-doc auto-merge.
- [ ] 5.2 Rewrite the archive automation runbook for version-3 finalization, conditional receipts, manual-merge meaning, read-only verification, rollback, audit, and legacy operation; verify every documented command and outcome matches the implemented CLI and no direct-push recovery is suggested.
- [ ] 5.3 Update local-cleanup and related handoff documentation for one integrated delivery PR; verify cleanup no longer waits for nonexistent version-3 follow-ups and still requires verified merge, archive, remote-ref, ownership, release, and clean-tree evidence.
- [ ] 5.4 Update the three affected canonical capability purposes when implementation is finalized and reconcile all related examples/terminology from `Acceptance checks` checkboxes to plain `Acceptance` bullets for version 3; verify strict OpenSpec validation preserves explicitly labeled legacy semantics.

## 6. Verification and Rollout Evidence

- [ ] 6.1 Add focused policy tests for valid single-PR finalization and every fail-closed edge in the delta specs, including stale head/body/base, incomplete work, conflicting sync, malformed manifest, unexpected diff, automatic merge attempt, and post-merge provenance failure; verify the focused governance suite passes.
- [ ] 6.2 Add regression fixtures for version-1/version-2 readers, acceptance/archive publication, standalone documentation auto-merge, protected expected-head integration, and cleanup; verify no legacy or unrelated documentation behavior regresses.
- [ ] 6.3 Pass strict OpenSpec validation, typecheck, documentation governance, and applicable exact-head Development CI for this bootstrap change under the existing version-2 lifecycle; record exact commands/runs/heads and keep failed attempts separate from successful evidence.
- [ ] 6.4 Produce the exact final non-UI handoff with one to three implementation-specific plain acceptance scenarios and record actual maintainer review under the currently deployed version-2 authority; verify this bootstrap does not claim to self-authorize through unmerged version-3 policy.
- [ ] 6.5 Prepare a bounded first-version-3 canary plan covering draft hold, explicit approval, same-PR implementation/finalization, ordinary CI, authorized manual merge, no generated follow-ups, read-only verification, and branch cleanup plus negative and standalone-doc controls; verify documentation marks version 3 fully operational only after that live evidence exists.

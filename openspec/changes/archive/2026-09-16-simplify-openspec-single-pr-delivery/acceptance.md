# Recorded implementation acceptance

Verdict: accepted. Archive preparation is not archive-PR integration.

Source PR: https://github.com/timurproko/a1/pull/425
Accepted head: ed6baa1d18d05aa327037e8928b5812deb31e7aa
Implementation merge: 29cc4c03684ca05451c5e6f93b45810f261eb95b
Validation: https://github.com/timurproko/a1/actions/runs/35061215617
Acceptance: https://github.com/timurproko/a1/pull/426
Author: timurproko
Recorded: 2026-09-16T06:27:56Z

```openspec-acceptance-receipt
{
  "kind": "pull-request",
  "pr": 426,
  "head": "b761cab0ca0651584d162ebd0d0df6170cb15bfd",
  "merge": "034df1d3786883bc0da193bf48117689b4ad331a",
  "path": "openspec/acceptance/simplify-openspec-single-pr-delivery/ed6baa1d18d05aa327037e8928b5812deb31e7aa.json",
  "digest": "849329c60b7572603096abe6681b1865ef597fecd47873295f472efcf34f4204",
  "author": "timurproko",
  "createdAt": "2026-09-16T06:27:56Z",
  "checklistDigest": "960cd0128235106770c537e5e74cf405de39ee0bb33a49f05159b8fee7308c15",
  "checks": [
    "Draft delivery PRs lead with concise proposal intent while explained automation metadata stays collapsed and final scenarios remain visible.",
    "Finalization stages synchronized specs, conditional acceptance, and the archive with the implementation while every automatic integration path refuses that PR.",
    "Authorized manual merge supplies acceptance without follow-up PRs, while legacy delivery and standalone documentation auto-merge remain operational."
  ]
}
```

Accepted implementation checks:
- Draft delivery PRs lead with concise proposal intent while explained automation metadata stays collapsed and final scenarios remain visible.
- Finalization stages synchronized specs, conditional acceptance, and the archive with the implementation while every automatic integration path refuses that PR.
- Authorized manual merge supplies acceptance without follow-up PRs, while legacy delivery and standalone documentation auto-merge remain operational.

Original internal source-binding request:

```json
{
  "version": 2,
  "repository": "timurproko/a1",
  "change": "simplify-openspec-single-pr-delivery",
  "sourcePr": 425,
  "sourceHead": "ed6baa1d18d05aa327037e8928b5812deb31e7aa",
  "sourceMerge": "29cc4c03684ca05451c5e6f93b45810f261eb95b",
  "sourceBodyDigest": "f89299d8a965fa36a4cfc9cde3cfda5aa8ed92c88f932a660e6a766cc85a3912",
  "artifactDigest": "5b2fe6501dfc76489a6835b2c94eb1e3f1a7444927333cfab8931e9c01666601",
  "specBaseSha": "3942a97a2aa4872e9beb44442228aafc91ff3431",
  "acceptanceChecks": [
    "Draft delivery PRs lead with concise proposal intent while explained automation metadata stays collapsed and final scenarios remain visible.",
    "Finalization stages synchronized specs, conditional acceptance, and the archive with the implementation while every automatic integration path refuses that PR.",
    "Authorized manual merge supplies acceptance without follow-up PRs, while legacy delivery and standalone documentation auto-merge remain operational."
  ],
  "validation": {
    "runId": 35061215617,
    "headSha": "ed6baa1d18d05aa327037e8928b5812deb31e7aa",
    "checkedSha": "ed6baa1d18d05aa327037e8928b5812deb31e7aa",
    "attempt": 3
  },
  "tasks": [
    {
      "id": "1.1",
      "done": true,
      "text": "Extend implementation-link parsing and types for strict version-3 `change`, `archive`, and `acceptanceManifest` fields while retaining version-1/version-2 behavior; verify focused fixtures reject unknown versions, conflicting fences, forbidden legacy fields, malformed paths, and ambiguous associations.",
      "digest": "22067a48274fd76b4a7d991606f8b0ddf0a5e2e02fcc7e4156d11c31db607e67",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "1.2",
      "done": true,
      "text": "Define the version-3 conditional acceptance manifest and derived receipt models; verify schema tests cover required repository/change/PR/baseline/scenario/digest data, forbid predicted merge provenance, and fail closed on unknown or contradictory fields.",
      "digest": "1c471b9376db1de86260069b47820059e092d18f20c31b5a6ad2354f0168fe48",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "1.3",
      "done": true,
      "text": "Replace implementation-checklist parsing for version 3 with exact `## Acceptance` plain-bullet parsing; verify one-to-three implementation-specific scenarios pass while checkboxes, reordered/mismatched lists, generic boilerplate, duplication, URLs/mentions, oversize text, and unrelated exact reuse fail.",
      "digest": "efbd5ac9f7821f7cbefab68175cdd00af08fe97b6364d3d989ceb5c3cf93baa9",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "1.4",
      "done": true,
      "text": "Add deterministic archive-input and synchronized-spec digest calculation that excludes inherently post-merge fields; verify byte/order/path changes invalidate the manifest without creating a recursive head or self-file hash.",
      "digest": "bee3fbf85bc82dd6de60c878793b024cac4627849b80ad91da902fc7ee57fba8",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "2.1",
      "done": true,
      "text": "Extract conservative synchronization and archive preparation from publication-specific orchestration into reusable staging primitives; verify existing version-1/version-2 archive fixture outputs and conflict refusals remain unchanged.",
      "digest": "28ef6440187f2c776072c691cfdba68a540f89fc5997d78ff381de49e82ad3f3",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "2.2",
      "done": true,
      "text": "Implement version-3 finalization inspection and explicit write modes against a fresh target baseline; verify successful write synchronizes every delta, moves the complete active change to the dated archive, writes the conditional manifest, updates association paths, and changes no remote ref or PR state.",
      "digest": "258e7b9a24509d80e19b4ac918610a213ca8f741b78cfe1d1077cfa36458456a",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "2.3",
      "done": true,
      "text": "Enforce artifact, substantive-task, evidence, known-gap, archive-target, and source-baseline prerequisites before finalization; verify incomplete, failed, stale, ambiguous, occupied, or undispositioned inputs preserve the active working state and produce actionable blockers without partial writes.",
      "digest": "10a45b5b1d6c9d9d81c11f9b6bc51f7e8b11a41dd511f181e04a2c4495e3ec9a",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "2.4",
      "done": true,
      "text": "Make finalization deterministic and idempotent and document/refactor a safe pre-merge refinement path; verify repeated check/write on identical inputs is byte-stable and a reconciled target or changed implementation requires regeneration rather than stale reuse.",
      "digest": "16fe4f5aeffc1b4af4519661225465e5a039e40d8096c47ee87173d53bda59c2",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "2.5",
      "done": true,
      "text": "Add final-candidate verification that reconstructs the intended synchronization from archived deltas and baseline data; verify missing active removal, altered canonical specs, incomplete archive contents, unexpected paths, or manifest digest disagreement blocks readiness.",
      "digest": "8362be9e3aa54000c6077060be12064eb845cad73d5c1faff7bd399785aa7759",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "3.1",
      "done": true,
      "text": "Integrate version-3 final-candidate validation into the stable Development required aggregate using immutable-base policy; verify the exact head, current target baseline, archive, synchronized specs, manifest, body scenarios, tasks, evidence, and gaps are all bound to the required result.",
      "digest": "0f55fbaad35f1364da5c4f038e18cf2cc5e0bee5a021128083c6086ddb074ae7",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "3.2",
      "done": true,
      "text": "Preserve complete impact-selected implementation validation after the active change becomes an archive-shaped diff; verify version-3 fixtures retain every selected product/governance owner and cannot use documentation-only or legacy acceptance-only shortcuts.",
      "digest": "4319f8b5ca520fca7ba449519a09b10c81a115c94d62ce4b9b0c5820688aad12",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "3.3",
      "done": true,
      "text": "Extend body-edit, ready, synchronize, and completion reconciliation so current-head body-to-manifest validation is refreshed; verify a changed body, head, baseline, or required run invalidates stale success and cannot claim human acceptance.",
      "digest": "797cc73478ead639bf342c3def9625507d421969339a9e7c7fea6ce360615be1",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "3.4",
      "done": true,
      "text": "Make every automatic integration owner explicitly exclude version-3 delivery PRs and disable any already-armed request; verify native auto-merge, documentation reconciliation, merge queue, archive publication, and App/bot paths all leave a green candidate open for authorized manual merge.",
      "digest": "43653ab6e88341ee7f329d50095c34fdab5d05eeed83a01cc7f5b7bf7aab0a5a",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "3.5",
      "done": true,
      "text": "Update workflow triggers, permissions, concurrency, and declarative governance inventory for finalization validation and read-only post-merge verification; verify trusted write workflows execute only default-branch policy and no new branch-protection bypass or publication authority is introduced.",
      "digest": "c5ebc495cdf1cdb2afb6a76e16f3833d80f7ebf15da2e22d9e04fe019fdf74c1",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "4.1",
      "done": true,
      "text": "Extend the shared acceptance reader to derive a version-3 accepted receipt from the committed conditional manifest plus exact GitHub head/check/actor/method/time/target ancestry; verify authorized human manual merge succeeds and open, stale, automatic, queued, bot/App, unauthorized, or unverifiable provenance fails closed.",
      "digest": "ed26444287d746dd77140f3c1c2a51347582fe06e962fb80c56784a45ad297c8",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "4.2",
      "done": true,
      "text": "Add version dispatch to archive reconciliation so version 3 performs verification/status only; verify it never mints publication credentials, pushes `develop`, edits tasks/specs/evidence, or creates/updates acceptance or archive refs and PRs.",
      "digest": "981d590518d12ba561bd1835c86fdf61ca7b73852ada7aa196f23a9add80ecd8",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "4.3",
      "done": true,
      "text": "Preserve version-1/version-2 comment, acceptance-PR, archive-PR, catch-up, retry, and publication behavior; verify mixed historical records select the exact version/head and legacy mutation never treats version 3 as publishable.",
      "digest": "32101d2d86027667ab9074a71d7deba9cf6e62e85425c4c2b47fcd4dc487fe9e",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "4.4",
      "done": true,
      "text": "Update audit and status outcomes for draft, needs-finalization, ready-for-manual-merge, accepted-and-archived, closed, legacy-pending, blocked, and invalid-provenance cases; verify successful workflow execution does not overstate acceptance or archival.",
      "digest": "6bf4103bc37dade996fe740605e8fb378d7ab775e30a8e3b75a2be7f5dd695ac",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "4.5",
      "done": true,
      "text": "Feed the derived version-3 receipt into already-archived and local-cleanup evidence checks while retaining exact-head remote branch cleanup; verify cleanup requires merged archive ancestry and remote-ref absence and still refuses dirty, unowned, unreleased, advanced, protected, fork, or unverifiable state.",
      "digest": "25dc33aaea72692463f889523f3f44c5e57d18afd02f0e247f1e10089d3a8e9b",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "5.1",
      "done": true,
      "text": "Update the repository-owned delivery skill and `openspec/config.yaml` to unify every agent-created OpenSpec delivery PR around a first-line quoted phase advancing from `Proposal` to `Implementation`, then to `Acceptance` only after required product tests pass with only the phase gate blocked, with verified post-merge state derived as `Archived` without editing the accepted body, a one-or-two-sentence `## Proposal`, concrete `## Implementation` bullets, final `## Acceptance` plain bullets, and collapsed linkage under final `## Automation`; retain same-PR implementation/finalization, exact-head CI, authorized manual merge, legacy compatibility, and standalone-doc auto-merge while omitting routine validation-command noise and forbidding implementation auto-merge or lifecycle follow-ups.",
      "digest": "45e52ae1929fab308d57d56e59eb0f2b5a27410deb8454f9b537337e9c4bd14d",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "5.2",
      "done": true,
      "text": "Rewrite the archive automation runbook for version-3 finalization, conditional receipts, manual-merge meaning, read-only verification, rollback, audit, and legacy operation; verify every documented command and outcome matches the implemented CLI and no direct-push recovery is suggested.",
      "digest": "ca409310856cb97cacc40e4e0c2ffd418095f8ec953650ba764e6188b051cb5c",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "5.3",
      "done": true,
      "text": "Update local-cleanup and related handoff documentation for one integrated delivery PR; verify cleanup no longer waits for nonexistent version-3 follow-ups and still requires verified merge, archive, remote-ref, ownership, release, and clean-tree evidence.",
      "digest": "403d81b767e2209dd54bcff1e859b272bb8b41acf438f43778131e765854e779",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "5.4",
      "done": true,
      "text": "Update the three affected canonical capability purposes when implementation is finalized and reconcile all related examples/terminology from `Acceptance checks` checkboxes to plain `Acceptance` bullets for version 3; verify strict OpenSpec validation preserves explicitly labeled legacy semantics.",
      "digest": "a71302bed590adfc4ffe50cfb841de6e0e29ba2293f08d232e500ece3ef21298",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "6.1",
      "done": true,
      "text": "Add focused policy tests for valid single-PR finalization and every fail-closed edge in the delta specs, including stale head/body/base, incomplete work, conflicting sync, malformed manifest, unexpected diff, automatic merge attempt, and post-merge provenance failure; verify the focused governance suite passes.",
      "digest": "3968089454edafa54b68c44cff2d8c6228abf79a596e7f6768a953c4918e89a0",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "6.2",
      "done": true,
      "text": "Add regression fixtures for version-1/version-2 readers, acceptance/archive publication, standalone documentation auto-merge, protected expected-head integration, and cleanup; verify no legacy or unrelated documentation behavior regresses.",
      "digest": "344aebcc3ac9f286dad07e5407fd87c1848df93f1c53425bb2798faa0ff1328a",
      "completion": "recorded",
      "evidence": []
    },
    {
      "id": "6.3",
      "done": false,
      "text": "Pass strict OpenSpec validation, typecheck, documentation governance, and applicable exact-head Development CI for this bootstrap change under the existing version-2 lifecycle; record exact commands/runs/heads and keep failed attempts separate from successful evidence.",
      "digest": "4ef401761edef94c6a481faf0206dc3e2febb76d9a0bda48b35cd38191eccb5f",
      "completion": "pending",
      "evidence": []
    },
    {
      "id": "6.4",
      "done": false,
      "text": "Produce the exact final non-UI handoff with one to three implementation-specific plain acceptance scenarios and record actual maintainer review under the currently deployed version-2 authority; verify this bootstrap does not claim to self-authorize through unmerged version-3 policy.",
      "digest": "c96781b62637a47ac7906d941555cb77e2876b360f38e0dd07228cd46f6b18d4",
      "completion": "pending",
      "evidence": []
    },
    {
      "id": "6.5",
      "done": true,
      "text": "Prepare a bounded first-version-3 canary plan covering draft hold, explicit approval, same-PR implementation/finalization, ordinary CI, authorized manual merge, no generated follow-ups, read-only verification, and branch cleanup plus negative and standalone-doc controls; verify documentation marks version 3 fully operational only after that live evidence exists.",
      "digest": "b7ca518ebc2c9e3151b1ec1442096afce7028a717d19bf114e6909628bdbafe8",
      "completion": "recorded",
      "evidence": []
    }
  ],
  "review": {
    "decision": "accept-on-manual-merge",
    "evidence": [
      {
        "url": "https://github.com/timurproko/a1/blob/ed6baa1d18d05aa327037e8928b5812deb31e7aa/openspec/changes/simplify-openspec-single-pr-delivery/implementation-evidence.md",
        "outcome": "Recorded source evidence; review its actual outcomes and limitations before accepting."
      }
    ],
    "gaps": []
  }
}

```

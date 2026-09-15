## Context

See `proposal.md` for motivation. The current version-2 lifecycle already keeps planning and implementation in one draft PR, but acceptance is recorded in a generated manual PR and synchronization/archive integration occurs in a third PR. The current archive policy has mature conservative synchronization, evidence/task checks, legacy acceptance readers, bounded catch-up, publication ownership, and cleanup safeguards. The redesign should reuse those checks while moving their execution before the implementation merge.

The central constraint is temporal: merge actor, merge commit, and merge time do not exist while the candidate is being prepared. A repository file therefore cannot truthfully contain a completed acceptance receipt before the same commit is merged. The candidate can contain a conditional manifest; after merge, a read-only verifier combines it with immutable GitHub provenance. The protected manual merge itself is the human acceptance action.

The existing documentation auto-merge route remains useful for unrelated standalone documentation. An implementation association must continue to hold a finalized PR even when its final OpenSpec diff looks like an archive-only documentation change.

## Goals / Non-Goals

**Goals:**
- Produce one ordinary development PR and one atomic `develop` integration for each new delivery.
- Preserve separate plan approval, implementation, machine validation, human acceptance, and merge semantics while representing the last two with one authorized manual merge.
- Reuse conservative synchronization, task/evidence validation, known-gap handling, provenance readers, and exact-head cleanup.
- Keep legacy version-1/version-2 acceptance and archive processing operational during migration.
- Make status and audit output distinguish ready, accepted-and-archived, legacy pending, blocked, closed, and invalid-provenance states.

**Non-Goals:**
- Auto-merging implementation-bound PRs or treating green CI as human acceptance.
- Removing auto-merge from unrelated standalone documentation.
- Changing product validation coverage, branch protection, allowed merge methods, release authority, dependency versions, or product behavior.
- Rewriting historical acceptance comments, acceptance PRs, archive PRs, or archived receipts.
- Directly pushing synchronization, task, acceptance, or archive corrections to `develop` after merge.
- Using this policy change as its own version-3 live canary; bootstrap completes under the currently deployed version-2 rules.

## Decisions

### 1. Introduce a version-3 association while retaining the existing metadata fence

New draft PRs will use the existing `openspec-implementation` fenced JSON with `version: 3` and `change`. The initial draft needs only those fields. Finalization adds exact `archive` and `acceptanceManifest` paths. The parser will reject unknown fields, path disagreement, a version-3 `specificationPr`, and multiple or conflicting associations.

The familiar fence avoids a second mutable marker and lets complete base/head lifecycle classification retain the current implementation hold. In the PR body it will appear last inside a collapsed `Automation metadata` disclosure that explains CI uses it to link the PR to the OpenSpec change. The visible body will lead with `## Intent` and two to five concise bullets distilled from the proposal's motivation and main changes; routine validation commands will not obscure that summary. Version 1 and 2 remain readable and preserve their existing behavior. Unknown versions fail closed.

Alternative considered: infer version 3 from an archive-shaped diff. Rejected because editable paths and partial renames are ambiguous and could bypass the implementation hold.

### 2. Finalize the implementation branch before readiness

A new finalization command will reuse archive staging and OpenSpec synchronization primitives, but write the result into the current implementation branch instead of publishing another branch. It will:

1. read a fresh `origin/develop` identity and the linked active change;
2. validate artifacts, substantive tasks, evidence, and known-gap dispositions;
3. strictly validate the active change;
4. conservatively apply every delta against that target baseline;
5. move the complete active directory to `openspec/changes/archive/YYYY-MM-DD-<change>`;
6. write a conditional `acceptance.md` in that archive;
7. update version-3 association paths; and
8. verify the complete staged result before permitting readiness.

The date is the finalization date, not a claim about a future merge time. Finalization will have inspection/check mode and an explicit write mode, will be deterministic for identical inputs, and will not commit, push, mark ready, or merge. Revision before merge uses ordinary branch history plus rerunning finalization from the reconciled active artifacts; no state reaches `develop` until the PR merges.

Alternative considered: let a post-merge Action push the archive directly to `develop`. Rejected because it bypasses the reviewed PR diff, risks branch-protection exceptions, and separates accepted code from canonical specs.

### 3. Store a conditional manifest, not a fabricated completed receipt

The staged archive's `acceptance.md` will state that its verdict becomes accepted only if the containing exact candidate is manually merged by an authorized human after required current-head checks. Its machine block will include:

- schema version 3, repository, change, source PR, archive path, and finalization time;
- reviewed target/spec baseline;
- ordered acceptance scenarios;
- digests over archived planning/evidence inputs and synchronized main-spec results; and
- required task/evidence/gap disposition summary.

It will not predict `sourceHead`, `sourceMerge`, merger, or merge time. The committed manifest is naturally contained by the PR head, while the exact-head CI run and later GitHub merge provenance bind that head without a recursive self-hash. The post-merge reader derives those remaining receipt fields at verification time.

Alternative considered: amend the archive after merge with an exact receipt. Rejected because that needs a direct push or follow-up PR, recreating the lifecycle being removed.

### 4. Use plain `## Acceptance` bullets and manual merge as the decision

The final ordinary PR body will contain `## Acceptance` followed by one to three plain bullets. Trusted policy will require exact ordered normalized equality with the manifest and reject checkboxes, duplicates, generic process claims, URLs/mentions, oversized text, and unrelated exact reuse. Automation may edit neither the acceptance list nor any pass/fail state.

An authorized human's protected manual merge of the exact current head means they accept those listed scenarios and authorize integration. No separate acceptance comment, checked list, review approval, JSON edit, or second merge is required. A synchronize event makes older CI stale. A body edit reruns body-to-manifest validation; because the manifest is committed, a body-only change cannot silently alter what the merge accepts.

Alternative considered: retain checkboxes in the implementation PR. Rejected because checking boxes creates mutable review state that must be separately bound and renewed; the user's manual merge is already the unambiguous final action.

Alternative considered: arm auto-merge after the maintainer checks scenarios. Rejected because implementation integration would then be performed by automation and merge provenance would no longer itself be the human acceptance event.

### 5. Validate the complete final candidate through ordinary CI

The PR becomes ready only after branch finalization. Normal ready/synchronize CI will cover the complete code, workflow, documentation, synchronized specs, archive, and manifest. The stable Development aggregate will invoke immutable-base delivery policy for version-3 finalization checks and will retain every impact-selected product and governance owner selected by the implementation. Archive-shaped paths cannot trigger the specialized legacy acceptance route or downgrade an implementation-associated PR to documentation-only validation.

Validation binds the current PR head and reviewed target baseline. Base advancement, a new commit, changed manifest, changed body list, incomplete task/evidence, unexpected path, conflicting delta, or stale required run blocks integration. Machine validation reports candidate validity only; it never reports human acceptance.

Alternative considered: run only strict OpenSpec/documentation CI after finalization. Rejected because the same head contains the implementation and must retain its full product validation obligations.

### 6. Make post-merge version-3 processing verification-only

The existing archive workflow will branch on delivery version. For version 3 it will read trusted default-branch policy, verify the manual authorized merger, exact source head, required checks, merge method/time, `develop` ancestry, archive/manifest bytes, and canonical specs, then report `accepted-and-archived`. It will not mint an App token or publish/update acceptance/archive refs, PRs, tasks, specs, or receipts.

The shared reader will expose a derived version-3 receipt to audit, already-archived detection, and local cleanup. Exact-head remote branch cleanup remains the only permitted hosted mutation and retains its existing ref-identity and protection checks. Contradiction after merge is reported for explicit reconciliation; it is never repaired by privileged direct push.

Alternative considered: remove archive reconciliation completely. Rejected because post-merge verification, actionable status, legacy catch-up, and cleanup authorization remain necessary.

### 7. Keep publication code only for legacy lifecycle versions

Acceptance publication, specialized acceptance validation, archive branch publication, archive PR reconciliation, App credentials, and catch-up will remain available for in-flight or historical version-1/version-2 work. Every mutation entry point will explicitly refuse version 3. Version-3 dry-run reports what finalization or provenance is missing but proposes no PR.

Once bounded repository evidence shows no active legacy deliveries depend on publication, a later separately approved change may retire that code and credentials. This change does not perform that removal.

### 8. Bootstrap and accept the policy with a canary

This governance change began under version 2, so it will finish under the currently authoritative acceptance/archive lifecycle. After integration, the first isolated version-3 canary will exercise draft planning hold, explicit implementation approval, finalization, ordinary CI, manual merge, read-only verification, absence of follow-up PRs, and safe branch cleanup. Negative fixtures cover stale head/body/base, incomplete tasks/evidence, malformed manifest, attempted automatic merge, and legacy routing. An unrelated standalone docs PR remains the automatic-integration control.

Version 3 will be documented as deployable after implementation tests pass and as fully operational only after that live canary evidence is recorded. This avoids asking unmerged policy to authorize its own integration.

## Risks / Trade-offs

- **[Finalization makes the branch diff less convenient to refine]** → Keep the PR draft until implementation is complete, provide deterministic check/write commands, and document how to restore/regenerate the active form before another refinement.
- **[A body-only edit could misrepresent acceptance]** → Bind exact ordered bullets to the committed manifest and rerun trusted validation on edited/synchronize/ready events.
- **[A manual merge can be attempted before valid finalization]** → Keep the existing required Development check, fail it on every version-3 invariant, and retain branch protection with no bypass.
- **[Post-merge provenance failure is discovered after bytes integrated]** → Exclude every automated merge path in trusted policy, require authorized-human provenance, and report any contradiction without silently blessing or mutating it.
- **[Concurrent canonical-spec changes stale synchronization]** → Bind finalization to a reviewed target baseline and require rebase/re-finalization/current-head CI after target advancement.
- **[Legacy and version-3 paths create temporary complexity]** → Use explicit version dispatch, shared normalized readers, fixture matrices, and mutation refusal for version 3; retire legacy publication only in a later change.
- **[Conditional acceptance records differ from self-contained old receipts]** → Keep all stable candidate facts committed and derive only inherently post-merge fields from immutable GitHub data through one shared verifier.
- **[Implementation-specific bullets become generic ceremony]** → Preserve concise uniqueness and boilerplate rejection while avoiding checkboxes and process-only items.

## Migration Plan

1. Implement version-3 parsers, manifest validation, finalization check/write behavior, and legacy-compatible readers behind explicit version dispatch.
2. Add current-head CI and documentation-lifecycle enforcement before enabling any version-3 authoring guidance.
3. Update repository-owned delivery skill and runbooks to make `## Acceptance` plus manual merge the final action, while retaining labeled legacy procedures.
4. Update post-merge reconciliation to verify-only for version 3 and preserve version-1/version-2 publication.
5. Deliver this bootstrap under version 2 and verify its existing acceptance/archive completion.
6. Run and record one isolated live version-3 canary plus negative and standalone-doc controls.
7. If severe issues occur before a version-3 merge, keep new changes on version 2. If issues occur after a version-3 merge, disable version-3 authoring, preserve the integrated archive and evidence, and use an explicit corrective PR; do not direct-push or reinterpret provenance.

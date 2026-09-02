## Context

See `proposal.md` for motivation. In release run `33638818217`, `plan`, `package`, and all four matrix validations succeeded. Development mode intentionally skipped the full documentation-review job. Although the publisher's predicate explicitly accepts `needs.documentation.result == 'skipped'`, the job omitted a status-check function, so GitHub applied the implicit `success()` prerequisite guard and skipped the publisher before evaluating that allowance. The aggregate result then observed `PLAN=success`, `WORK=true`, `BUILD=true`, `PACKAGE=success`, `VALIDATE=success`, and `PUBLISH=skipped` and failed correctly.

The package is packed once and publication is the only job permitted to contact npm. Nightly/stable documentation review, exact-package validation, registry serialization, provenance, and final aggregate semantics must remain intact.

## Goals / Non-Goals

**Goals:**

- Make the publisher evaluate explicit prerequisite outcomes after an intentionally skipped optional job.
- Preserve positive fail-closed checks for package, documentation, and matrix validation outcomes.
- Detect a regression in the publisher's skipped-prerequisite scheduling semantics before another release run.
- Prove the repair with one newly numbered immutable package from merged authoritative `develop`.

**Non-Goals:**

- Publishing `.212` manually or changing immutable preview-number derivation.
- Treating failed, cancelled, or missing package/validation/documentation work as publishable.
- Running full documentation review for explicit development publication.
- Changing publication concurrency, npm credentials/environment, provenance, package construction, validation selection, registry checks, timeouts, or stable/nightly behavior.
- Weakening the final publication result to accept a skipped publisher for a newly built candidate.

## Decisions

### Evaluate the publisher with an explicit status-check function

Prefix the publisher's job-level condition with `always()` while retaining every existing positive eligibility clause: the plan must have selected a newly built candidate, package construction must succeed, documentation must either succeed or be intentionally skipped, and the validation matrix must succeed. `always()` removes GitHub's implicit ancestor-success precondition; it does not authorize publication because the remaining predicate still rejects every unsuccessful required outcome.

Alternatives rejected:

- Remove `documentation` from `needs`: this disconnects the publisher from the scheduled/stable documentation gate.
- Run an empty successful documentation job in development mode: this hides the intentional mode distinction and spends a runner only to work around orchestration semantics.
- Accept `PUBLISH=skipped` in the aggregate: this would report success without publishing a package that the request was required to publish.
- Publish `.212` manually or rerun outside the workflow: this bypasses the sole-publisher, exact-source, provenance, and registry-serialization authority.

### Put the regression assertion beside existing release-pipeline policy

Extend the focused repository-governance coverage that already inspects `.github/workflows/release.yml`. The assertion will isolate the publisher block and require both the explicit status-check function and all positive outcome checks. It will also retain the aggregate requirement that a built candidate must observe a successful publisher.

A textual policy assertion matches the repository's existing workflow-governance approach and directly detects removal of the condition that caused this incident. Introducing a YAML parser solely for one workflow predicate would add dependency and expression-normalization complexity without increasing behavioral confidence.

### Use exact-package publication as final acceptance

After the implementation PR passes current-head CI, receives maintainer acceptance, and merges manually, run the documented `npm run develop` command from authoritative `develop`. Acceptance requires a new preview number tied to that implementation merge, successful Windows Node 22/24, macOS Node 24, and Linux Node 24 validation, a successful npm publisher, a successful aggregate result, and registry `next` serving the validated integrity.

The failed `.212` run remains regression evidence; it is not retried or repurposed because a later authoritative merged source derives a different immutable preview version.

## Risks / Trade-offs

- [Risk] `always()` can schedule the publisher after failed or cancelled ancestors. → Mitigation: retain explicit equality checks for every required outcome and add regression assertions for them; absent outputs and non-success results evaluate as ineligible.
- [Risk] A textual workflow test can pass while GitHub expression semantics change. → Mitigation: require exact-package post-merge publication as acceptance and retain the aggregate fail-closed result.
- [Risk] Fixing the publisher exposes a later npm credential, provenance, or registry issue that `.212` never reached. → Mitigation: report that as distinct evidence; do not weaken publication or registry verification.
- [Trade-off] `.212` remains an unpublished validated artifact. → This preserves source/PR-derived immutability and avoids an out-of-band publication path.

## Migration Plan

1. Merge this OpenSpec-only planning change after strict documentation validation.
2. Implement the workflow predicate and focused governance assertion in a fresh worktree from current `origin/develop`.
3. Require current-head CI, maintainer acceptance, and explicit manual merge authorization.
4. From updated authoritative `develop`, run `npm run develop` and record the newly derived package identity, platform outcomes, publisher result, aggregate result, registry integrity, and `next` tag.
5. If the implementation must be rolled back before publication, revert the workflow/test commit; no registry migration is needed. Once a preview is published, its immutable version remains available even if a later workflow correction is reverted.

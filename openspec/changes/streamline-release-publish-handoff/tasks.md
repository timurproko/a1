## 1. Specify the safe handoff

- [ ] 1.1 Add deterministic contracts for review-session baselines, fresh unchanged-body saves, edited-body saves, cancellation, source advancement, draft mutation, duplicate drafts, and exact staged-result resumption.
- [ ] 1.2 Add policy tests proving repository-dispatch payload fields are selectors only, stable authority remains an authorized GitHub `User`, and draft edits, Apps, bots, tag pushes, native publication, and unrelated CI never start npm publication.
- [ ] 1.3 Add state-machine coverage for `prepared -> saved -> staging -> npm-ready -> published -> verified -> reopening`, including every rejected or retryable transition.

## 2. Keep the release command alive through npm staging

- [ ] 2.1 Extend the release client/runtime contracts to arm one source-bound draft review baseline, poll the exact Release with bounded cancellation, and recognize a strictly newer save without requiring changed prose.
- [ ] 2.2 Dispatch one correlated stable-staging request through authenticated GitHub repository dispatch, with no repeated operator version input and no payload authority over source, body, or package identity.
- [ ] 2.3 Locate and follow only the exact trusted default-branch run for that request; report queued, running, failed, cancelled, timed-out, and npm-ready outcomes without duplicate dispatch.
- [ ] 2.4 Make retries require a fresh save unless exact successful staging evidence already matches; preserve maintainer edits and refuse stale, missing, published, retargeted, ambiguous, or advanced-source drafts.

## 3. Split trusted staging from final publication

- [ ] 3.1 Replace the version-entry approval wrapper with a default-branch repository-dispatch receiver that authenticates the event sender and independently derives and validates source, version, Release, body, digest, absent tag, and registry state.
- [ ] 3.2 Refactor stable completion to stop after exact npm pair verification, asset upload, `master` fast-forward, and still-draft/still-untagged checks; remove automatic Release publication and reopening from that run.
- [ ] 3.3 Produce one bounded staging receipt and immutable run artifacts binding workflow/run, actor, source, Release ID, version, note digest, package digests, asset, and `master`; reject missing, duplicate, stale, changed, or contradictory evidence.
- [ ] 3.4 Preserve idempotent partial-npm recovery so a retry verifies identical existing package bytes and never rebuilds, republishes, retargets, moves, deletes, or reuses a tag.

## 4. Verify native publication and reopen development

- [ ] 4.1 Add a trusted default-branch `release.published` workflow that never publishes npm and first authenticates the event sender plus exact successful staging run.
- [ ] 4.2 Verify Release database identity, normalized body digest, source, public state, GitHub-created tag, exact asset, both npm package integrities and `latest` tags, and `master`; fail visibly without mutation on disagreement.
- [ ] 4.3 Move exact reopening preparation behind successful post-publication verification, preserving the one-commit path/version/body invariants, disabled auto-merge, required CI, and manual merge.
- [ ] 4.4 Cover premature native publication, post-staging body edits, missing/forged receipts, wrong workflow/run/actor, wrong tag/source, registry drift, asset drift, and incompatible existing reopening work.

## 5. Preserve release-note product behavior and governance

- [ ] 5.1 Keep Pi-style generated Markdown, exact package/Release/reopening body equality, bounded parsing, preview suppression, startup acknowledgement, bare A1 newest-first `/changelog`, and `a1 pi` oldest-first in-feed history.
- [ ] 5.2 Update workflow/governance declarations and maintainer documentation to present exactly one safe sequence: review, **Save draft**, wait for `npm ready`, refresh, then native **Publish release**; state that premature native publication cannot be repaired automatically.
- [ ] 5.3 Update command and runbook tests so output contains the edit URL once, never asks the maintainer to visit Actions or re-enter a version, and does not imply the native button is safe before npm readiness.

## 6. Validate and deliver

- [ ] 6.1 Run focused release-command, approval, publication-client, release-note, pipeline-policy, workflow, governance, and runbook tests while developing; retain protected Windows CI as the authority for Defender-dependent package-startup evidence.
- [ ] 6.2 Complete implementation evidence and gap disposition, reconcile current `origin/develop`, and finalize the OpenSpec change only after every substantive task is complete.
- [ ] 6.3 Mark the same PR ready for exact-head CI, address any failure before further work, and leave the validated candidate for authorized human manual merge without publishing a stable release.

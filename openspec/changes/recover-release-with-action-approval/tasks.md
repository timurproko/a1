## 1. Preserve and classify release authority

- [ ] 1.1 Re-read and record the exact orphan `v0.2.2` tag/source, missing Release, npm pair absence, npm `latest`, prior complete tag, `master`, and authoritative `develop`; fail implementation reconciliation if the tag/source/package/baseline state changes.
- [ ] 1.2 Add a trusted classifier for one normal exact draft path and one orphan-tag recovery path, rejecting stale sources, unsafe bodies, unauthorized/App actors, existing or partial npm identities, contradictory baseline/`master` evidence, and ambiguous records before package construction.
- [ ] 1.3 Let preparation create one replacement draft for an exact qualifying orphan tag using the prior registry-backed stable baseline; preserve the existing `v0.2.2` tag, require fresh draft review and Actions approval, and prove no code path deletes, moves, recreates, or treats the tag/native publication as package authority.

## 2. Add the GitHub Actions approval button

- [ ] 2.1 Add **Approve stable release** as a version-only `workflow_dispatch` entry whose trusted default-branch code independently derives the actor, authoritative source, Release ID/state/body/digest, and normal-versus-recovery disposition.
- [ ] 2.2 Refactor publication invocation so stable package jobs accept only the dedicated human Actions approval artifact while nightly/development retain their existing authority; ensure tag pushes, `release.published`, native Release controls, Apps, and direct technical-input dispatch cannot start stable npm work.
- [ ] 2.3 Keep a normal approved Release draft through every validation, package, registry, published-pair, tag, asset, and `master` failure, and publish that same Release with the exact approved body only as the final successful completion mutation.
- [ ] 2.4 Cover actor permissions, version grammar, draft mutation, stale source, duplicate/missing Releases, direct-dispatch bypass, native publication, cancellation, exact retry, and public-record recovery refusal/success with workflow-policy and trusted-script fixtures.

## 3. Simplify preparation and automate reopening

- [ ] 3.1 Make `npm run release -- <target>` print the draft editing URL exactly once and the approval workflow URL exactly once for both creation and exact reuse; remove duplicate lifecycle URL logging and point retired `--approve` usage to Actions without dispatching.
- [ ] 3.2 Move exact next-development-and-note branch/PR creation into trusted post-publication automation with bounded branch/PR identity, empty-ref lease, current-`develop` compatibility, approved digest, exact changed paths, and no auto-merge or bot merge.
- [ ] 3.3 Add idempotent reopening recovery that reuses only an exact pending PR, refuses conflicting/closed/advanced work, reports the manual merge requirement, and never republishes an already completed stable version.
- [ ] 3.4 Update README, release runbook, draft-editing guidance, failure recovery, workflow declarations, and governance tests for the two-link preparation output, Actions approval button, draft-until-success behavior, recovery distinction, and manually merged automated reopening PR.

## 4. Stabilize exact release fixtures and validate

- [ ] 4.1 Remove avoidable repeated disposable-Git work from release fixtures and replace scattered undersized limits with one documented finite integration budget based on observed Windows phases, preserving every caller-work, current-tip, failure, and hang assertion.
- [ ] 4.2 Run focused command/output, approval/recovery, publication pipeline, reopening, release-note/package, workflow YAML, governance, architecture, documentation, and strict OpenSpec checks; record isolated and ordinary multi-file fixture timing without weakening failed assertions.
- [ ] 4.3 Obtain finalized exact-head CI, including Windows Defender-enabled package-startup evidence, and disposition every implementation gap before manual merge.
- [ ] 4.4 After corrective merge, prepare and review the `0.2.2` replacement draft, run the authorized Actions recovery, verify exact npm pair/tag/Release/body/asset/`master` identity, manually merge the generated `0.2.3-dev` reopening PR, and test one-time stable startup, persistent `/changelog`, preview suppression, and unchanged `a1 pi` behavior.

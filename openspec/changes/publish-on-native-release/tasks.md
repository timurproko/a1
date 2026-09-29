## 1. Specification

- [ ] 1.1 Write `continuous-integration` deltas replacing "A stable release is not visible until npm has it" and updating "Publication follows from what was pushed", "Development reopens only after verified stable publication", and "Maintainer release documentation matches the command" with the native-publish trigger and rollback rules.

## 2. Release command

- [ ] 2.1 Make `npm run release` create or reuse the source-bound draft, dispatch pre-click validation of the source, print the draft and run URLs, and exit.
- [ ] 2.2 Remove Save-draft polling, the arming window, and staging dispatch; keep target, source, and existing-version checks.

## 3. Publication workflow

- [ ] 3.1 Publish from `release: published`: authorize the actor, bind tag, source, version, and body, and require the successful pre-click validation run.
- [ ] 3.2 Repack with the published note, run exact-package gates, publish both packages with provenance, verify the pair, upload the asset, and fast-forward `master`.
- [ ] 3.3 Return the Release to draft and delete the unconsumed tag when publication fails or is cancelled while both packages are absent.
- [ ] 3.4 Prepare the manually merged reopening pull request after success.
- [ ] 3.5 Remove `approve-release.yml`, the repository dispatch, and the staging receipt; update governance declarations and trusted-publisher paths.

## 4. Proof

- [ ] 4.1 Cover the command, publication, rollback, and rerun paths with the isolated release harness.
- [ ] 4.2 Update `docs/ci-release-runbook.md` to the three-step flow and recovery rules.
- [ ] 4.3 Record implementation evidence in design.md.

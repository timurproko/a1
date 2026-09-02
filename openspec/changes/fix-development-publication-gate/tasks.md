## 1. Preserve the Regression Evidence

- [ ] 1.1 Record release run `33638818217`, source `cd9f58d0384c630452e5428985737aa85eeacf1a`, package `0.1.8-dev.212`, successful package and Windows Node 22/24, macOS Node 24, and Linux Node 24 outcomes, skipped publisher, and failed aggregate in structured change evidence; verify the recorded job identities and conclusions against GitHub.
- [ ] 1.2 Record the publisher-gate environment `PLAN=success`, `WORK=true`, `BUILD=true`, `PACKAGE=success`, `VALIDATE=success`, and `PUBLISH=skipped`; verify the evidence distinguishes this orchestration defect from the corrected color-depth regression and from npm authentication or registry failure.

## 2. Correct Publisher Scheduling Without Weakening Gates

- [ ] 2.1 Make the release publisher evaluate after skipped prerequisites by adding the explicit status-check function described in `design.md`; verify its condition still requires a newly built candidate, successful package construction, successful validation, and documentation success or the intentional skip.
- [ ] 2.2 Preserve the publisher's sole npm authority, exact tarball download, final registry serialization, provenance upload, post-publish integrity/tag verification, stable release effects, and aggregate requirement for `PUBLISH=success`; verify the workflow diff changes no package-building, validation-selection, timeout, concurrency, environment, credential, or registry semantics.
- [ ] 2.3 Verify failed, cancelled, or missing plan/package/validation outcomes and failed required documentation remain ineligible even though the publisher job evaluates its predicate.

## 3. Add Focused Workflow Regression Coverage

- [ ] 3.1 Extend the existing release-pipeline governance test to isolate the publisher block and require `always()` together with every positive prerequisite clause; verify removing the status-check function reproduces a focused test failure.
- [ ] 3.2 Retain or add an assertion that the aggregate accepts a skipped publisher only for an existing-version no-op and requires publisher success for a newly built candidate; verify the `.212` skipped-publisher outcome cannot be reported as successful.
- [ ] 3.3 Run the focused release-pipeline and related impact-aware workflow governance tests; verify they pass without running local full/release suites.

## 4. Validate, Integrate, and Publish

- [ ] 4.1 Run typecheck, architecture governance, changed-file documentation governance, and strict OpenSpec validation; verify no production source, package manifest/lock, dependency, generated package artifact, or unrelated primary-worktree change is included.
- [ ] 4.2 Push a fresh implementation branch and open a code pull request citing this change with auto-merge disabled; verify required current-head CI passes and report any later npm credential/provenance/registry failure as distinct evidence rather than weakening the gate.
- [ ] 4.3 Provide the exact candidate commit and focused workflow-policy command for maintainer review; verify the expected change is operational-only with no user-visible runtime behavior.
- [ ] 4.4 After explicit maintainer acceptance and manual merge, update authoritative `develop`, run `npm run develop`, and verify one newly numbered exact package passes Windows Node 22/24, macOS Node 24, Linux Node 24, the npm publisher, the aggregate publication result, and registry `next` integrity/tag checks.
- [ ] 4.5 Record implementation PR/current-head CI, merge identity, package number/integrity, every platform result, publisher/aggregate outcomes, registry `next`, and maintainer acceptance in `acceptance.md`, then synchronize/archive this skip-spec change in an OpenSpec-only follow-up.

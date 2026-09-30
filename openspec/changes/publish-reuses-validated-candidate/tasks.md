## 1. Changelog baseline

- [x] 1.1 Replace `normalBaseline` with selection of the highest published, non-prerelease Release below the target, whose remote tag commit is in the source's first-parent history; ignore local tags and fail when none exists.
- [x] 1.2 Test a stale local target tag, a deleted remote tag, a draft or prerelease Release, a tag off the first-parent history, and the v0.2.1 → v0.2.2 range producing all 30 merges.

## 2. Candidate adoption

- [ ] 2.1 Export the approval job's `validationRunId` through `plan` outputs.
- [ ] 2.2 Factor the tar walking and header rewriting from `repair-native-executable-modes.mjs` into one shared helper without changing its behavior.
- [ ] 2.3 Add `scripts/release/adopt-validated-candidate.mjs`: verify the downloaded candidate and installer identities against source, tree, version, and integrity. Keep the bytes when the re-derived note resource is identical. Otherwise swap only that entry and prove every other entry and mode unchanged.

## 3. Stable publication graph

- [ ] 3.1 In `stable` mode, skip `guardians` and `validate`, and have `package` download the candidate artifact by run id and adopt it instead of building.
- [ ] 3.2 Let `publish`, `result`, and the failure summary accept a skipped `validate` only in `stable` mode, and remove the stable validation-scope branch.

## 4. npm trusted publishing

- [ ] 4.1 Add a pre-upload step that requires npm >= 11.5.1 and completes the OIDC token exchange for both packages. On refusal, fail before any upload and name the calling workflow and `npm-publish` environment to register.
- [ ] 4.2 Remove the `NPM_BOOTSTRAP_TOKEN` path so both uploads authenticate through OIDC only.

## 5. Proof

- [ ] 5.1 Test adoption: identical note keeps the validated integrity, an edited note changes only the resource entry, and a mismatched source, tree, version, integrity, extra entry, or oversized resource fails.
- [ ] 5.2 Update release pipeline policy and governance tests for the stable job graph, cross-run download, and preflight ordering.
- [ ] 5.3 Update the CI release runbook with the stable flow and the required npm trusted publishers.
- [ ] 5.4 Record evidence in design.md.

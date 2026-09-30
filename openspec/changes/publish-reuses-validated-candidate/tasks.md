## 1. Candidate adoption

- [ ] 1.1 Export the approval job's `validationRunId` through `plan` outputs.
- [ ] 1.2 Factor the tar walking and header rewriting from `repair-native-executable-modes.mjs` into one shared helper without changing its behavior.
- [ ] 1.3 Add `scripts/release/adopt-validated-candidate.mjs`: verify the downloaded candidate and installer identities against source, tree, version, and integrity. Keep the bytes when the re-derived note resource is identical. Otherwise swap only that entry and prove every other entry and mode unchanged.

## 2. Stable publication graph

- [ ] 2.1 In `stable` mode, skip `guardians` and `validate`, and have `package` download the candidate artifact by run id and adopt it instead of building.
- [ ] 2.2 Let `publish`, `result`, and the failure summary accept a skipped `validate` only in `stable` mode, and remove the stable validation-scope branch.

## 3. npm trusted publishing

- [ ] 3.1 Add a pre-upload step that requires npm >= 11.5.1 and completes the OIDC token exchange for both packages. On refusal, fail before any upload and name the calling workflow and `npm-publish` environment to register.
- [ ] 3.2 Remove the `NPM_BOOTSTRAP_TOKEN` path so both uploads authenticate through OIDC only.

## 4. Proof

- [ ] 4.1 Test adoption: identical note keeps the validated integrity, an edited note changes only the resource entry, and a mismatched source, tree, version, integrity, extra entry, or oversized resource fails.
- [ ] 4.2 Update release pipeline policy and governance tests for the stable job graph, cross-run download, and preflight ordering.
- [ ] 4.3 Update the CI release runbook with the stable flow and the required npm trusted publishers.
- [ ] 4.4 Record evidence in design.md.

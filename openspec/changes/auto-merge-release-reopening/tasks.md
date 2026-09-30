## 1. Classifier

- [x] 1.1 Add `scripts/governance/release-reopening-auto-merge.mjs` with a pure `classifyReleaseReopening` that performs the identity, path, version, and note checks from design.md, reusing the release-note parsing and derivation used by `prepare-reopening.mjs`.
- [x] 1.2 Test acceptance of the #648 shape and rejection of: another author or a forged login, lifecycle metadata in the body, a mismatched branch or version, an extra or renamed path, a dependency change in any manifest, a missing, draft, or prerelease Release, a note that differs from the Release body, and a malformed API response.

## 2. Manager integration

- [x] 2.1 In `manage-documentation-auto-merge.mjs`, treat a PR as eligible when documentation classification or reopening verification passes. Keep disarm-on-ineligible, current-head validation, expected-SHA merge, and branch cleanup unchanged. Summaries must name the route.
- [x] 2.2 Extend documentation auto-merge tests: a reopening PR arms and merges after validation succeeds, stays unmerged on failure or a stale head, and a `docs/releases/` edit outside a reopening PR stays manual.

## 3. Release pipeline

- [x] 3.1 Update the `prepare-reopening.mjs` PR body and reuse check (accept only manager-armed squash auto-merge), and update the `finalize-release.yml` summary step.
- [x] 3.2 Update `docs/ci-release-runbook.md`, the manual-merge check in `check-release-documentation.mjs`, the release command's reopening guidance, and the delivery policy text in `openspec/config.yaml` and `.agents/skills/change-delivery/SKILL.md`.
- [x] 3.3 Update release command, release pipeline policy, and repository governance tests.

## 4. Proof

- [x] 4.1 Record evidence in design.md, including a replay of the classifier against #648.

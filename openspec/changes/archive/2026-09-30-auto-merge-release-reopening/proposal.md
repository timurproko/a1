## Why

After every stable publication, `finalize-release.yml` opens `chore/release-<next>-dev`, a single `openspec-ci[bot]` commit that bumps the three version fields and adds the exact approved `docs/releases/<released>.md`. `prepare-reopening.mjs` has already proven that this commit changes nothing else and that the note matches the approved digest. Required CI then runs, and the maintainer still has to come back and merge it by hand (#648 for 0.2.3-dev). The manual step adds no review: there is nothing in the diff for a human to judge that the automation has not already checked.

## What Changes

- The documentation auto-merge manager gains one more eligible class, the **release reopening PR**. It must be a non-draft, same-repository PR into `develop` from `chore/release-X.Y.Z-dev`, authored by `openspec-ci[bot]` (fixed id), with exactly these four changed paths: `package.json`, `package-lock.json`, `packages/a1-install/package.json`, and a newly added `docs/releases/<released>.md`.
- The manager verifies the content through the GitHub API, not just the paths. Base and head manifests may differ only in their version fields. The base version must be `<released>-dev` and the head version its patch successor `-dev`. The stable Release `v<released>` must be published, and the note must equal that Release's body.
- An eligible reopening PR takes the existing documentation path: squash auto-merge behind current-head `Development validation required`, then exact-head branch cleanup. Anything that fails a check falls back to manual merge and disables any armed auto-merge.
- The reopening PR body, the finalize summary, and the release runbook stop saying "merge manually". The release command still verifies the actual merge before reporting that development reopened.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: The post-publication reopening PR integrates automatically after current-head validation instead of requiring manual merge.
- `github-repository-governance`: Documentation auto-merge admits the exactly verified release reopening PR as a second eligible class.

## Impact

`scripts/governance/manage-documentation-auto-merge.mjs` plus a new pure classifier next to `documentation-auto-merge.mjs`, and `scripts/release/prepare-reopening.mjs` (PR body and reuse check). Also the `finalize-release.yml` summary step, `docs/ci-release-runbook.md`, the runbook check in `check-release-documentation.mjs`, the delivery policy text in `openspec/config.yaml` and the change-delivery skill, and the governance and release tests. Implementation-bound, acceptance, and all other PRs keep manual merge.

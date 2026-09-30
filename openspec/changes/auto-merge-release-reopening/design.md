## Context

`prepare-reopening.mjs` (called from `finalize-release.yml` with the `openspec-ci` App token) creates or reuses one PR. `assertCommit` requires that PR's commit to be a single commit on current `develop` whose diff is exactly the three version files plus `docs/releases/<released>.md`, whose manifests equal the base with only the version fields changed, and whose note matches the approved digest. The PR body then says "This PR must not auto-merge", and `continuous-integration` requires a manual merge.

`Documentation auto-merge` (`pull_request_target` plus `workflow_run` of `Development validation`) runs trusted default-branch code. It classifies paths, disables auto-merge on anything it considers ineligible, arms squash auto-merge, merges a validated exact head directly, and cleans up the branch. Today it disarms reopening PRs because `package*.json` is outside its allowlist and `docs/releases/` is reserved for manual merge.

For #648 the author is `openspec-ci[bot]` (id 329165293, type `Bot`), the branch is `chore/release-0.2.3-dev`, and the files are `added docs/releases/0.2.2.md`, `modified package-lock.json`, `modified package.json`, and `modified packages/a1-install/package.json`.

## Goals / Non-Goals

**Goals:** the reopening PR merges itself once its current head passes required validation, with no weaker guarantees than today's checks.

**Non-Goals:** changing when or how the reopening PR is created. Also out of scope: auto-merging any other version change, release note edits outside the reopening PR, or implementation-bound, acceptance, or Pi upgrade PRs. Branch protection and required checks stay unchanged.

## Decisions

### Reuse the documentation auto-merge manager

The manager already has the necessary safety machinery: current-head validation binding, expected-SHA squash merge, disarm on ineligibility, polling bounds, and synchronous branch cleanup after `GITHUB_TOKEN` merges. A second classifier plugs into `isTrustedEligible`: a PR is eligible if it passes documentation classification **or** release-reopening verification. Documentation classification stays byte-for-byte the same, and `docs/releases/` stays manual for everything that is not a verified reopening PR. A separate workflow would duplicate the merge logic and would race the manager's disarming.

### Verify content, not paths

A pure `classifyReleaseReopening({ pull, files, commits, read })` in `scripts/governance/release-reopening-auto-merge.mjs` checks the following. Any failure makes the PR ineligible and reports the failing check.

1. Identity: same repository, base `develop`, not a draft. The head ref matches `^chore/release-(\d+\.\d+\.\d+)-dev$`. `pull.user` is `openspec-ci[bot]` / 329165293 / `Bot`, and the PR has exactly one commit, authored by that identity. Branch name alone is never enough.
2. Paths: the changed files are exactly `package.json`, `package-lock.json`, and `packages/a1-install/package.json` (all `modified`), plus exactly one `docs/releases/<released>.md` with status `added`. There are no renames.
3. Versions: the three manifests are read at `base.sha` and `head.sha` through the contents API. With `version` (and the lockfile's `packages[""].version`) removed, base and head must be identical JSON. The base must declare `<released>-dev` consistently, and the head must declare `semver.inc(<released>, "patch")-dev`, matching the branch name.
4. Note: GitHub Release `v<released>` is published, not a draft, and not a prerelease. `parseReleaseNote(head note, <released>).markdown` equals the note derived from that Release's body by the same normalization `prepare-reopening` receives through the approved snapshot. The implementation must reuse that derivation, not reimplement it.

These checks mirror `assertCommit`, so the manager accepts exactly the PRs the trusted preparer would produce, re-verified at the current head.

### Remove the "must not auto-merge" contract

`prepare-reopening.mjs` keeps `assertPull`'s `autoMergeRequest === null` check for a PR it is about to reuse. The manager is the only party that arms auto-merge, and that happens after creation. The reuse check therefore changes to accept a PR whose auto-merge was armed by the manager (squash method); any other armed state is still rejected. The body text and the finalize summary now say that the PR merges automatically after required CI.

## Risks / Trade-offs

- **App identity drift**: if the App is renamed or reinstalled, the id check fails closed and the PR is merged manually, as today.
- **`develop` advances during CI**: the PR becomes `behind`. The manager arms auto-merge as it does for documentation PRs, but nothing updates the branch. Like documentation PRs today, this needs a manual branch update. Accepted as a known gap.
- **`GITHUB_TOKEN` merges trigger no `push` workflows**: development publication is dispatch-only (`develop.yml`), so nothing depends on a push event.

## Evidence

To be recorded during implementation.

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

A `classifyReleaseReopening({ pull, files, repository, read, release })` in `scripts/governance/release-reopening-auto-merge.mjs` checks the following. Any failure makes the PR ineligible and reports the failing check.

1. Identity: same repository, base `develop`, not a draft. The head ref matches `^chore/release-(\d+\.\d+\.\d+)-dev$`. `pull.user` is `openspec-ci[bot]` / 329165293 / `Bot`, and the body carries no implementation or acceptance metadata. Branch name alone is never enough. Commit count and commit authorship are not checked: the reopening commit is authored as `github-actions[bot]` by `finalize-release.yml`, git author identity is forgeable, and updating a `behind` branch adds a merge commit. Content verification at the current head (items 2-4) is what bounds the merged tree.
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

- Replay against #648 through the live GitHub API (base `622e2153`, head `16e697af`, read as open): `{"eligible":true,"reason":"verified release reopening 0.2.2 -> 0.2.3-dev"}`. The same PR with its author replaced by a user returns `{"eligible":false,"reason":"reopening PR was not opened by openspec-ci[bot]"}`.
- `parseReleaseNote(<v0.2.2 Release body>, "0.2.2").markdown` is byte-identical to the merged `docs/releases/0.2.2.md`, so a reopening PR whose Release was not edited after publication verifies.
- `release-reopening-auto-merge.test.ts` covers the accepted shape and each rejection in tasks 1.2. `documentation-auto-merge.test.ts` drives the real manager against a fake GitHub: it arms behind pending validation, squash-merges and deletes the branch on current-head success, does not merge on failed or stale validation, disarms a dependency change or foreign author, and keeps a `docs/releases/**` edit on an ordinary branch manual without reading contents.
- Release policy, release target, runbook, and delivery guidance suites pass (20 files, 348 tests). The full `test/repository-governance` run passed 1450 of 1453: `naming-selection` and `validation-impact` exceeded 5 s under parallel load and pass when rerun alone, and `startup-descriptor` requires a built `dist/` that the unbuilt worktree lacks. `check:code-documentation` is clean.

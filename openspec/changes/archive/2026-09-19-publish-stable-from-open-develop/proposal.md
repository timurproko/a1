## Why

A stable release currently needs two manually merged version PRs: one that commits `0.1.8` to `develop` so the workflow can pack it, and one that reopens `0.1.9-dev` afterwards. The first PR is a plain version bump, yet it must pass ordinary PR validation like any change, and while it waits `develop` keeps moving. The release helper then refuses to substitute the newer commit, so the maintainer closes the PR, deletes its branch and worktree, and starts over. Release 0.1.8 hit exactly this on 2026-09-19: the version PR's CI exposed a baseline drift that a sibling fix had to land first, which invalidated the version PR. The workflow already stamps preview versions on the runner (`0.1.8-dev.518`) without a commit; the stable version can be stamped the same way.

## What Changes

- Stable publication takes the stable version as an explicit dispatch input and stamps it on the checked-out open development source before packing. `develop` never carries a commit declaring a stable version; the `v<version>` tag and `master` name the open development commit the bytes were built from.
- The Release workflow refuses a stable request whose version is not a final `x.y.z` or is below the open development version, and refuses any source that does not declare exactly one open `x.y.z-dev` version, on every channel.
- `npm run release -- <target>` dispatches publication for the current authoritative `develop` commit directly after the registry and tag guards, then opens the one reopening PR (`x.y.(z+1)-dev`) and waits for its manual merge. A `develop` that declares a stable or numbered version is refused before any Git operation.
- Documentation describes the one-PR flow, the reproduction recipe for a tagged commit, and the recovery paths for a failed publication and for a stalled reopening PR.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: stable publication names and stamps its final version on the open development source instead of requiring a committed stable version; the stable version costs no commit and only the reopening does.

## Impact

- `.github/workflows/release.yml`: `version` dispatch input, stable plan resolution, version stamp for every built candidate.
- `scripts/release/publication-client.mjs`, `scripts/release/release-workflow.mjs`, `scripts/release/release.mjs`, `scripts/release/release-target.mjs`: stable dispatch carries the version; the helper no longer prepares or verifies a stable version PR.
- `test/repository-governance/release-command.test.ts`, `release-pipeline-policy.test.ts`, `publication-client.test.ts`, `release-target.test.ts`, `test/support/release-command-fixture.ts`.
- `README.md`, `docs/ci-release-runbook.md`.

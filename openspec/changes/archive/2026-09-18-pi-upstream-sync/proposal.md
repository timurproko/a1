## Why

Pi is pinned at 0.84.2 while the registry publishes 0.85.1, and there have been zero bumps in three hundred commits because an upgrade starts as a hand migration: two pins, twenty-six vendored copies with recorded deviations, a 4,500-line source ledger, three inventories, parity evidence, and a dozen hard-coded version and commit checks. With the ledger updater and the inventory sync in place, the remaining work is to run those steps in order against a candidate, keep every unresolved item visible, and hand a human a diff.

## What Changes

- Add `scripts/governance/pinned-pi-identity.mjs`: the one identity every pinned-Pi check compares itself to (versions from the dependency authority, the commit from `pinned-pi-interactive-baseline.json`); the ledger check, the ledger updater's default commit, and the five governance suites that hard-coded `0.84.2` and its commit read it instead.
- Add `scripts/pi/propose-pi-upgrade.mjs`: captures the old upstream sources, pins both packages at the target version, runs the candidate evaluator, installs and builds, three-way merges each vendored copy with `git merge-file --diff3` (conflict markers stay as review items), regenerates the ledger and headers (`--commit`), re-resolves the inventories, refreshes parity evidence, runs the type, architecture, engine-conformance, and parity gates, scaffolds `openspec/changes/pi-upgrade-<version>/` with the pin moved in the requirement that names it, and writes the report and pull-request body. A failed step is recorded and the run continues; the upstream commit is resolved from the registry's `gitHead` or the `v<version>` tag.
- Add `scripts/pi/pi-upgrade-report.mjs`: the pure body and scaffold renderers, with a 4-case suite.
- Add `.github/workflows/pi-upstream-sync.yml` (nightly at 03:23 UTC and on dispatch with `version`/`commit`): runs the proposal on default-branch code with pinned actions, uploads the report, pushes `chore/pi-<version>` with the App identity, and opens or refreshes the draft pull request; it never merges. Declared in `config/github-repository-governance.json` with the `pi-upgrade-proposal` authority.
- Document the workflow in `docs/ci-release-runbook.md` and the driver in `docs/architecture/toolchain.md`.
- Two findings from running the driver against the real 0.85.1 candidate: the ledger updater now records a unit new to the package without a copy (status `not-ported`, no hash) instead of crashing, and the inventory sync falls back to the anchors' own span when a behavior's symbols cannot be found instead of widening to the whole file.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: a newer published Pi is proposed as a reviewable draft pull request by a nightly job, and the pinned identity comes from one authority.

## Impact

No runtime changes and no pin change: `develop` stays at 0.84.2 until a proposed pull request is reviewed and merged (plan PR19 is the first). The governance suites pass unchanged with the identity read from the authority; the repository governance inventory gains one workflow.

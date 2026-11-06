## Why

Development validation repeats work that another job of the same run, or an earlier run with identical inputs, has already done. Measured on recent `develop` pull requests: every lane that packs a candidate (`pi`, `package`, `startup`, `promoted`) installs Rust and Zig and rebuilds the release terminal host from the same unchanged native sources, spending 2.6 to 3.4 minutes each and defining the critical path of a UI-only pull request (7.5 of 8.6 wall-clock minutes). When the terminal-host owner is selected, each of the three partition jobs per platform runs the crate's unit tests again although the build-and-probe lane already runs them, and the Linux build-and-probe lane, the slowest job of the run at about 18 minutes, compiles `cargo-fuzz` from source on every run. None of this work produces evidence that the run does not already have.

## What Changes

- Candidate-packing Development lanes restore the release terminal host output (`dist/native/<platform>-<arch>/`) from a cache keyed by every build input and build it only on a miss, so an unchanged native tree costs no Rust or Zig provisioning and no release compile on a pull request that did not change it.
- Terminal-host partition jobs run only their fixed slice of the role-fixture suite; the unit tests run once per target in the build-and-probe lane that already owns them.
- The Linux build-and-probe lane restores the pinned `cargo-fuzz` binary from a cache keyed by its version and the pinned nightly toolchain instead of compiling it on every run.
- The validation documentation and the governance tests that pin these workflow shapes describe and guard the reused steps.

Selection, owners, cadence, platforms, partitions, certification, fuzzing budget, chaos, nightly Full regression, and publication validation are unchanged. No test, probe, or platform is removed; every target still runs every test exactly once.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: candidate-packing Development lanes may reuse an exact-input release terminal-host build instead of rebuilding it; terminal-host partitions run the role-fixture slice only, with unit tests owned by the build-and-probe lane; the Linux fuzz prerequisite may be restored from an exact-version cache.

## Impact

Affects `.github/workflows/ci.yml`, `scripts/development/run-terminal-host-probe.mjs`, `docs/validation.md`, `docs/ci-release-runbook.md`, and the native workflow governance tests. Expected effect per pull request: about 3 minutes less wall-clock on every pull request that packs a candidate without a native change, roughly 10 runner-minutes less per such run, and for pull requests that select the terminal-host owner about 9 to 18 fewer runner-minutes from the partitions plus 2 to 3 minutes off the Linux critical path. Publication lanes keep building their exact bytes in-run and are out of scope. Moving terminal-host certification, fuzzing, or chaos to nightly cadence, splitting the terminal-host owner between Rust and TypeScript triggers, merging the two nightly complete-regression runs, and reducing Windows Node 22 shard coverage change policy rather than remove duplication and are deferred to a separate change.

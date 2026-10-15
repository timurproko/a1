# Proposal

## Why

Fixing one resident-tabs defect costs an eighteen-minute CI cycle per hypothesis. The native host cannot be built on a developer's Windows machine because the vendored `libghostty-vt` Zig build is quarantined by endpoint protection, so no native test runs locally; the resident chaos run picks its actions from an unseeded random source, so a violation it finds cannot be replayed; and a third of the pull-request validation failures during milestone 6 were governance gates (comment prefixes, startup byte budget, skill word bound, naming evidence paths) that nobody runs before pushing. Together these made the certification milestone take ten to twenty validation runs per small fix.

## What Changes

- Publish the Zig-built `libghostty-vt` static library as a CI artifact per platform and let `native/terminal-host/build.rs` consume a prebuilt library from `TERMINAL_HOST_PREBUILT_VT`, so a developer runs `cargo test` for one native test locally in minutes with no Zig toolchain and nothing for endpoint protection to quarantine.
- Add `npm run preflight`: one command that runs every fast governance gate pull-request validation runs (type check, architecture, changed-file code documentation, naming, strict OpenSpec validation, delivery guidance, changed tests) and fails with the same rule identifiers, so a push with a green preflight does not fail governance in CI.
- Seed the resident chaos run: every run prints its seed, records its action schedule, and `--replay <seed>` reproduces that schedule; a violation names the seed that produced it.
- Let Development validation be dispatched for a named lane subset (`lanes=native`: the terminal-host and resident-chaos owners) so iterating on host code costs the native lanes alone.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: manual Development validation dispatch accepts a declared lane subset while pull-request and nightly selection are unchanged.
- `project-structure-governance`: one local preflight command runs the fast governance gates with CI's rule identifiers.
- `resident-tab-reliability`: native host verification runs locally from a published prebuilt terminal library, and resident chaos runs are seeded and replayable.

## Impact

- `native/terminal-host/build.rs`, the `terminal_hosts` and terminal-host validation jobs in `.github/workflows/`, and a `terminal-vt-<platform>` artifact.
- `scripts/development/run-resident-chaos.mjs` and its governance test gain `--seed` and `--replay`.
- `package.json` gains `preflight`; `docs/validation.md` and the delivery skill name it as the pre-push rule.
- `.github/workflows/ci.yml` gains a `lanes` dispatch input; `scripts/release/validation-matrix.mjs` and its selection tests honor it.
- No product behavior changes; the shipped host, its verification, and release packaging are untouched.

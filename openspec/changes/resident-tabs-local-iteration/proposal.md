# Proposal

## Why

Fixing one resident-tabs defect costs an eighteen-minute CI cycle per hypothesis. The native host cannot be built on a developer's Windows machine because the vendored `libghostty-vt` Zig build is quarantined by endpoint protection, so no native test runs locally; the resident chaos run picks its actions from an unseeded random source, so a violation it finds cannot be replayed; and a third of the pull-request validation failures during milestone 6 were governance gates (comment prefixes, startup byte budget, skill word bound, naming evidence paths) that nobody runs before pushing. Together these made the certification milestone take ten to twenty validation runs per small fix.

## What Changes

- Add `npm run preflight`: one command that runs the fast governance gates pull-request validation runs (type check, architecture, changed-file code documentation, changed-file naming, strict OpenSpec validation, delivery guidance, changed tests) with the same scripts and rule identifiers, so governance failures surface before a push.
- Make the resident chaos run reproducible: every run prints its seed and records its executed action schedule in its report, every violation names its seed and report, and `--replay <report>` re-executes that recorded schedule.
- Publish the Zig-built `libghostty-vt` static library as a per-platform CI artifact and let `native/terminal-host/build.rs` link it in local development builds through `TERMINAL_HOST_PREBUILT_VT`, so one native test runs locally without Zig. Because it is unproven that endpoint protection accepts the linked test binary, this outcome starts with a gated spike: if the local link or test binary is still quarantined, the outcome is removed from this change through scope refinement instead of being built out.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: the full-regression exclusion rule names both scopes `config/validation-suites.json` already excludes (`terminal-host` and `resident-chaos`), correcting the requirement this change's chaos work depends on.
- `project-structure-governance`: one local preflight command runs the fast governance gates with CI's rule identifiers.
- `resident-tab-reliability`: resident chaos runs are seeded and replayable from their report, and native host verification runs locally from a published prebuilt terminal library.

## Impact

- `package.json` gains `preflight`; `docs/validation.md`, `openspec/config.yaml`, and the delivery skill name it as the pre-push rule.
- `scripts/development/run-resident-chaos.mjs` and `test/repository-governance/resident-chaos.test.ts` gain the seeded generator, the action schedule, and `--replay`.
- `native/terminal-host/build.rs`, the terminal-host validation job in `.github/workflows/ci.yml`, a `terminal-vt-<platform>-<architecture>` artifact, and a fetch script, subject to the spike.
- No product behavior changes; the shipped host, its verification, release packaging, and pull-request and nightly validation selection are untouched.

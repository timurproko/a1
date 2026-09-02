## Why

Development validation has stopped being proportionate to the change under review. PR #201's successful `Fast validation` job took 7m36s and the required workflow took 7m57s, compared with about 2m30s for a representative August 28 code PR: 3m32s came from a complete rendering-evidence suite selected unconditionally for every code change, while documentation governance scanned the complete tracked repository both as a command and again inside Vitest. This delays feedback without adding corresponding confidence for unrelated changes and conflicts with the existing requirement that validation effort match the change.

## What Changes

- Replace the hard-coded development scope list with one deterministic, machine-readable impact classifier based on the complete merge-base-to-head diff, transitive rendering dependencies, explicit non-code invalidators, and fail-closed fallback.
- Keep the ordinary fast tier mandatory for code pull requests while selecting rendering evidence as `none`, `smoke`, or `full`:
  - `none` for changes outside the rendering dependency surface;
  - `smoke` for rendered-shell/component changes, using representative terminal-paint evidence;
  - `full` for viewport, scheduler, terminal adapter, rendering harness, package-identity, or classifier changes.
- Run rendering validation as a modular required job in parallel with ordinary fast validation, and make the aggregate required check enforce success exactly when the classifier selects it.
- Consolidate rendering evidence so each required workload is produced once per gate and its captured result supplies semantic, paint, parity, determinism, and budget assertions instead of rerunning equivalent matrices across test files.
- Change pull-request and local development documentation governance to inspect modified, newly added, and renamed-to policy-relevant files only, with bounded metadata resolution needed to classify those files; deletions alone do not require documentation content.
- Remove the duplicate complete-repository documentation baseline scan from the ordinary Vitest remainder while retaining focused fixture-based tests of every policy rule and the authoritative documentation command.
- Add one full tracked-repository documentation review to the existing nightly workflow against the authoritative `origin/develop` source, rather than repeating it in every platform matrix job. Manual complete regression and release validation retain an explicit way to request the full review.
- Emit selection tier, changed inputs, dependency reasons, fallback reasons, and per-scope timing in workflow summaries and machine-readable outcomes.
- Preserve or strengthen quality gates: uncertain classification selects the conservative tier, rendering-sensitive changes still receive terminal-paint evidence, changed documentation-policy inputs are enforced before merge, and nightly/release validation retains complete coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Make development validation modular, impact-aware, parallel, auditable, and fail-closed while retaining one required aggregate gate and complete nightly/release coverage.
- `project-structure-governance`: Enforce documentation policy incrementally for modified/new pull-request inputs, eliminate duplicate repository scans, and re-establish the full repository invariant in one nightly review.

## Impact

- Affected operational surfaces: `.github/workflows/ci.yml`, `.github/workflows/release.yml`, and potentially `.github/workflows/full-regression.yml`.
- Affected validation architecture: `config/validation-suites.json`, `scripts/release/*`, documentation-governance scripts, rendering evidence orchestration, and their repository-governance tests.
- Affected evidence: workflow summaries and machine-readable timing/selection outcomes.
- No A1 runtime, terminal behavior, public API, installed Pi package, package dependency, or user-visible product behavior changes.

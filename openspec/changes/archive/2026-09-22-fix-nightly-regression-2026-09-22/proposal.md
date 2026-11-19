## Why

Full regression #33 and Release #148 failed on `6ae0615` with the same Pi API-consumer baseline drift and Linux/macOS thinking-selector color mismatch. Develop publication run 35754423252 later failed on `7b80f6a3` when the Windows build preflight reported `rustc` absent, although its probe also collapses timeouts and execution failures into absence. The maintainer requested publishing repair and consolidation of PRs #536 and #538 on 2026-09-22.

## What Changes

- Keep implementation and both nightly failure records in PR #536; close planning-only #538 as superseded without deleting its branch.
- Provision and exercise the Rust toolchain explicitly before release and Full regression builds, and distinguish missing executables from failed or timed-out version probes without relaxing the existing probe deadline or build gate.
- Use the owned theme consistently for the bare thinking selector, with deterministic coverage of dark/light and truecolor/256-color modes. Preserve the pinned comparison profile.
- Recheck the public-API baseline on current develop and repair derived governance records only where the actual source changed.
- Investigate the Windows Node 22 update-CLI setup timeout and remove unnecessary fixture preparation if confirmed, preserving isolation, assertions, and deadlines.
- Dispatch Full regression on the completed fix head and record its exact-head evidence before handoff.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This repairs existing prerequisite diagnostics, selector color consistency, and regression fixture contracts; it does not change product requirements.

## Impact

Build prerequisite tooling, release/Full regression setup, the owned thinking selector and its derived baselines, targeted regression fixtures, and this consolidated delivery record. Publication remains blocked until every required lane passes; no registry publication or automatic merge is authorized by this change.

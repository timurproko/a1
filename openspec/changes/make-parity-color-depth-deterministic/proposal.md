## Why

Develop packages build and pack successfully, but publication has failed repeatedly since PR #186 (`8c0f4859`) made parity evidence preserve semantic ANSI while leaving color capability implicit: Windows validates truecolor, whereas non-interactive macOS and Linux select 256-color for pinned Pi while the A1 side and stored diagnostics explicitly select truecolor. The parity harness must declare and control color depth as test input without weakening ANSI coverage or changing runtime terminal behavior.

## What Changes

- Retain the regression timeline from last passing develop package `0.1.8-dev.182` through failing packages `.192`, `.203`, `.205`, `.209`, and `.210`, identifying PR #186 as the change that exposed a previously normalized-away harness inconsistency.
- Add a test-owned terminal-capability scope using the canonical public `#pi-tui` identity; snapshot and restore the complete capability object around synchronous and asynchronous evidence construction.
- Make parity workloads declare `truecolor` or `256color` before either pinned Pi or A1 theme initialization, so both sides use one intentional ANSI grammar independent of OS, Node version, TTY attachment, and runner environment.
- Retain static and event-frame fixtures as strict truecolor diagnostics, label their color mode explicitly in fixture metadata, and keep rendered rows, SGR parameters, reset boundaries, controls, geometry, and provenance strict.
- Exercise direct pinned-versus-owned theme and settings parity in both truecolor and 256-color modes on every platform instead of using operating-system defaults as accidental coverage.
- Prove fixture generation is idempotent under opposing ambient capabilities and does not produce platform-specific golden files.
- Re-run focused parity checks, required CI, and a newly numbered exact-package develop publication across Windows Node 22/24, macOS Node 24, and Linux Node 24.
- Keep the one-off Windows timeout from package `.209` as separate diagnostic evidence: packages `.203`, `.205`, and `.210` passed Windows validation, so this correction does not weaken assertions or broaden timeouts without recurring proof.
- Do not force truecolor in CI or production, strip or canonicalize SGR, patch pinned Pi, mutate installed packages, or alter runtime color detection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change repairs deterministic test and fixture tooling without changing product requirements, so `.openspec.yaml` continues to declare `skip_specs: true`.

## Impact

- Test support and parity producers under `test/features/owned-ui/` and `test/integrations/pi/components/`.
- Diagnostic fixture metadata and the existing fixture-generation paths under `scripts/pi/`.
- Exact-package release validation on all configured Node/platform lanes.
- No production source, runtime API, dependency, workflow color override, installed Pi package, or user-visible terminal behavior change is intended.

## Why

The develop publication built and packed `0.1.8-dev.209`, but exact-package validation failed on every Node 24 platform because parity diagnostics inherited platform/Node-dependent terminal color capability: pinned components emitted 256-color SGR while A1 and the stored fixtures emitted truecolor SGR. Parity evidence must control its declared color depth explicitly rather than changing meaning with the non-interactive runner environment.

## What Changes

- Add a test-owned terminal-capability scope that selects the parity workload's declared truecolor mode before either pinned or A1 themes are initialized and restores the prior capability state afterward.
- Use that scope for static component, scripted event-frame, and owned-settings parity producers so all compared sides and retained fixtures use one deterministic ANSI grammar.
- Keep semantic ANSI, reset boundaries, geometry, and fixture content strict; do not normalize truecolor and 256-color sequences away or regenerate fixtures to whichever mode one runner happens to detect.
- Add regression coverage for Node/platform-independent output, nested or sequential evidence capture, capability restoration on success and failure, and no cross-test contamination.
- Re-run focused parity tests, required CI, and the exact-package Node 22/24 platform matrix before retrying develop publication.
- Do not change runtime terminal detection, production theme selection, installed Pi packages, pinned component source, or user-visible colors.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This change makes existing parity tooling deterministic without changing product requirements, so `.openspec.yaml` declares `skip_specs: true`.

## Impact

- Affected test support and parity producers under `test/features/owned-ui/`.
- May add one bounded test helper for public Pi-TUI capability save/set/restore behavior.
- Release validation for exact packages on Windows, macOS, and Linux with Node 22/24.
- No production source, runtime API, dependency, fixture authority, or visible terminal behavior change is intended.

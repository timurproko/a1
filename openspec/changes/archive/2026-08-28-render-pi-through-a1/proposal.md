## Why

A1 draws Pi's interface through its own runtime, layout, text measurement, and input handling. Bare `a1` deliberately adds product surfaces, so it is not an honest comparison target for pinned Pi. Before this change, `a1 pi` launched vanilla Pi through transparent attachment and therefore proved only the launcher rather than A1's rendering fidelity.

## What Changes

- Prerelease `a1 pi` presents pinned Pi's interface through A1's owned rendering and input pipeline.
- The comparison uses Pi's ordinary user profile and withholds every A1-specific surface.
- Bare `a1` and prerelease `a1 pi` share one rendering pipeline and differ only in profile root and product-surface availability.
- A reader can open `a1 pi` beside pinned `pi` to assess rendering fidelity without a hidden test-only mode.

**BREAKING**: `a1 pi` no longer uses transparent direct attachment.

## Capabilities

### Modified Capabilities

- `launch-profiles`: the prerelease `pi` subcommand presents pinned Pi through A1's shared owned rendering pipeline.

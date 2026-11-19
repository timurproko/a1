## Why

Stable publication has never succeeded. Both attempts ever made — [35461216591](https://github.com/timurproko/a1/actions/runs/35461216591) on `7d26554` and [35657941674](https://github.com/timurproko/a1/actions/runs/35657941674) on `2226c9d0` — failed on every Windows lane with `exact pi launch exited before first render:` and an empty diagnostic, while the same commit published successfully to the develop channel 17 minutes earlier.

The cause is a contradiction inside the repository's own contract. `a1 pi` is a prerelease-only development instrument: `cliCapabilities` derives `developmentComparison` from `isPrereleaseVersion`, `dispatchCli` answers `{ kind: "noop" }` for `pi` on a build that does not advertise it, and `a1-shell/spec.md` specifies "prerelease `a1 pi`" throughout. The first-attempt startup gate nevertheless launches both profiles unconditionally and requires six measurements, so on a stable candidate it launches a command the build is required to refuse and reads that deliberate quiet exit as a startup failure.

## What Changes

- Derive the measured profile set in the first-attempt startup gate from the candidate's own version-derived capabilities, exactly as `bin/cli.js` derives the commands it dispatches.
- Assert the capability boundary instead of losing it: on a stable candidate the gate proves `a1 pi` exits quietly without launching, rather than skipping the profile silently.
- Resolve the spec contradiction so the budget requirement follows the advertised profiles rather than a fixed pair.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `a1-shell`: the first-attempt startup budget applies to every profile the candidate advertises, and a stable candidate's absent comparison profile is proven absent rather than treated as a failed launch.

## Impact

- `test/foundation/release/package-startup.integration.test.ts` selects profiles by capability and asserts the stable-candidate no-op.
- `test/repository-governance/package-suite-ownership.test.ts` pins the new gate shape in place of the fixed pair and the hardcoded measurement count.
- No product source changes: `cliCapabilities`, `dispatchCli`, and `bin/cli.js` already implement the contract the gate contradicted.

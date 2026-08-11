## Why

Users currently have to remember and enter the scoped npm installation command to obtain a newer AddOne release. A first-class command under both public CLI aliases makes updates discoverable and consistent while preserving npm as the package authority.

## What Changes

- Add `addone update` and `a1 update` command handling before the interactive UI starts.
- Resolve and invoke the npm CLI using Pi's proven cross-platform process strategy—`cross-spawn` on Windows and Node process spawning on Unix—to install the latest public `@timurproko/addone` release globally.
- Stream npm output, report the installed and target versions, propagate failures, and never start the supervisor or UI during an update.
- Document update usage, permissions, network requirements, and failure behavior.
- Add hermetic tests that fake npm execution and do not mutate the developer's global installation or contact the registry.

## Capabilities

### New Capabilities
- `cli-self-update`: User-facing AddOne CLI update behavior shared by the `addone` and `a1` executable aliases.

### Modified Capabilities

None.

## Impact

- Affects CLI argument dispatch in `bin/addone.js`, update orchestration under `src/`, package scripts/assets if needed, unit or integration tests, and installation documentation.
- Adds exact `cross-spawn` and `semver` runtime dependencies (plus their type packages for development); every added package remains subject to the zero-deprecation release gate.
- Executes a global npm install, so filesystem permissions, registry access, and npm configuration remain external operational requirements.

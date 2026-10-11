# Proposal

## Why

The merged resident-tabs foundation publishes a Windows x64 terminal-host debug artifact for manual proof, but its vendored Zig dependency is built with `-Dtarget=native`. The resulting binary can contain instructions selected for the hosted runner CPU and terminated with `Illegal instruction` when downloaded to another supported x64 machine. A platform-labelled artifact must not silently depend on the producer's CPU model.

The fullscreen proof launches Pi intentionally: milestone 1 validates the native PTY, rendering, input, isolation, and cleanup boundary without adding product wiring. Loading A1 through the resident host remains deferred to the later product milestones, so changing the default child here would misrepresent the implemented scope.

## What Changes

- Compile the vendored terminal dependency for the exact declared Windows x64, Linux x64, or macOS arm64 target with a baseline CPU model instead of the hosted runner's native CPU.
- Fail closed when Cargo requests a terminal-host target outside the supported mapping, and add a regression contract for the exact target-to-Zig mapping and baseline policy.
- Clarify the manual-proof documentation: the downloadable artifact must be portable within its declared target, while the default Pi child is a native-host proof rather than A1 product integration.

## Capabilities

### Modified Capabilities

- `continuous-integration`: terminal-host artifacts are compiled for their declared platform/architecture baseline rather than runner-native CPU features.

## Impact

The change is limited to terminal-host build targeting, focused regression coverage, and manual-proof documentation. It does not add resident product wiring, change the normal `a1` or `a1 pi` launch path, package the terminal host, or alter terminal-host protocol and runtime behavior.

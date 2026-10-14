# Design

## Context

`native/terminal-host/build.rs` currently invokes the vendored Zig build with `-Dtarget=native` and SIMD enabled. On the selected Windows x64 runner this permits Zig to choose the runner CPU model. The uploaded artifact is named for Windows x64, but a manual download on another Windows x64 machine terminated before startup with an illegal-instruction fault. CI execution on the producing runner cannot expose that portability failure.

The terminal-host proof defaults to `pi` because the accepted milestone deliberately excludes product loading and launch-route changes. Pi supplies a real interactive terminal workload while keeping the evidence scoped to the native host. A1-in-resident-tab behavior belongs to later milestones.

## Goals

- Make each uploaded terminal-host executable portable across the baseline CPU feature set of its declared target.
- Keep the supported matrix exact: Windows x64, Linux x64, and macOS arm64.
- Prevent a future return to host-native CPU selection with an executable regression contract.
- Explain the Pi-versus-A1 boundary in the manual handoff documentation.

## Non-goals

- No A1 product wiring, resident tabs, settings, launch-route changes, or release packaging.
- No change to protocol bytes, controller transfer, session locking, or resident launch behavior.
- No expansion beyond the three accepted platform/architecture targets.
- No attempt to bypass the guarded local Windows build policy.

## Decisions

### Map Cargo targets explicitly

The build script will map only the three supported Cargo target triples to explicit Zig target identities. It will request the baseline CPU model and reject any unknown target before invoking Zig. The target architecture therefore comes from Cargo's selected lane, while CPU features no longer come from the hosted runner.

### Test the policy as data

The target mapping and CPU policy will live in a small dependency-free build-support module shared by the build script and Rust test compilation. Unit tests will cover all supported mappings, baseline selection, and rejection of an unsupported target. This avoids a source-text assertion that could pass while the build script uses different values.

### Keep Pi as the proof workload

The manual fullscreen command remains a Pi proof. Documentation will state that Pi exercises a complete interactive terminal child while product integration remains intentionally absent. A1 becomes the resident-host child only when the owning later milestone wires and validates that route.

## Risks and mitigations

- **Zig target spelling differs from Cargo triples.** The mapping is explicit and exercised by every selected native lane.
- **A baseline build could disable required SIMD paths.** SIMD remains enabled; Zig chooses implementations legal for the declared baseline and runtime dispatch remains the dependency's responsibility.
- **CI still runs artifacts on producer-class hardware.** The build-policy tests prevent host-native targeting, and manual acceptance uses the downloaded Windows artifact on the machine that exposed the fault.

## Validation strategy

- Unit-test exact mappings and unsupported-target refusal.
- Run the selected Windows x64, Linux x64, and macOS arm64 terminal-host lanes.
- Download the Windows artifact from the exact successful run and launch its fullscreen Pi proof on the previously failing machine.

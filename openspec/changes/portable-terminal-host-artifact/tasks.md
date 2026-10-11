# Tasks

## 1. Portable native targeting

- [ ] 1.1 Add an exact Cargo-to-Zig target mapping for Windows x64, Linux x64, and macOS arm64 with baseline CPU selection and fail-closed unsupported-target handling.
- [ ] 1.2 Make the terminal-host build consume that mapping without weakening SIMD, pinned toolchains, or the local Windows build guard.

## 2. Regression evidence and documentation

- [ ] 2.1 Add focused tests for every supported mapping, baseline CPU policy, and unsupported-target rejection.
- [ ] 2.2 Clarify artifact portability and why the milestone-1 fullscreen proof launches Pi rather than claiming A1 product integration.

## 3. Validation and handoff

- [ ] 3.1 Pass strict OpenSpec, focused local build-policy tests, and the selected Windows x64, Linux x64, and macOS arm64 terminal-host lanes.
- [ ] 3.2 Download the exact Windows artifact and confirm the fullscreen Pi proof starts on the machine that rejected the runner-native binary.

# Tasks

## 1. Portable native targeting

- [x] 1.1 Add an exact Cargo-to-Zig target mapping for Windows x64, Linux x64, and macOS arm64 with baseline CPU selection and fail-closed unsupported-target handling.
- [x] 1.2 Make the terminal-host build consume that mapping without weakening SIMD, pinned toolchains, or the local Windows build guard.

## 2. Regression evidence and documentation

- [x] 2.1 Add focused tests for every supported mapping, baseline CPU policy, and unsupported-target rejection.
- [x] 2.2 Clarify artifact portability and why the milestone-1 fullscreen proof launches Pi rather than claiming A1 product integration.

## 3. Validation and handoff

- [x] 3.1 Pass strict OpenSpec validation, focused Rust tests, all three supported-target contract checks, typechecking, architecture checks, and repository governance locally.
- [x] 3.2 Prepare the exact-run artifact download and fullscreen startup handoff so the previously failing machine can perform physical acceptance before merge.

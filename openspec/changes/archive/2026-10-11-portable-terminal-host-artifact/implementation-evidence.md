# Implementation evidence

## Implemented result

- The terminal-host build maps only Windows x64, Linux x64, and macOS arm64 Cargo triples to explicit Zig targets and requests the baseline CPU model while retaining SIMD.
- Unknown targets fail in the build script before Zig invocation, and the source-copy stamp includes the exact target and CPU policy so runner-native output cannot survive in the reused build directory.
- The binary's version record exposes `libghosttyTarget` and `libghosttyCpu`, making the native dependency build contract inspectable in the downloaded artifact.
- Focused Rust tests cover every supported mapping, the shared baseline policy, and unsupported-target rejection.
- Manual-proof documentation now identifies the actual executable name and explains that Pi is the milestone-1 native-host workload while A1 product wiring remains deferred.

## Focused pre-finalization evidence

- `TERMINAL_HOST_LOCAL_BUILD=1 TERMINAL_HOST_CONTRACTS_ONLY=1 cargo test --manifest-path native/terminal-host/Cargo.toml --lib` — 20 tests passed, including the two new build-target tests.
- Contract-only all-target checks with Node-addon and resident-fixture features passed for `x86_64-pc-windows-msvc`, `x86_64-unknown-linux-gnu`, and `aarch64-apple-darwin`.
- `npm ci` completed the repository build; `npm run typecheck` and `npm run check:architecture` passed.
- Strict validation passed for all OpenSpec items; documentation governance, code-documentation governance, naming policy, Cargo formatting, and `git diff --check` passed.

The selected ready-PR run owns the real pinned-Zig binary builds and probes on all three targets. After that exact run succeeds, physical acceptance downloads its Windows x64 artifact and launches the fullscreen proof on the machine that rejected the runner-native binary.

## Known-gap disposition

- This correction makes the milestone-1 proof artifact CPU-portable; terminal-host release packaging remains milestone 6.
- The proof continues to launch Pi intentionally. Loading A1 through resident infrastructure remains deferred to the later product-wiring milestones and is not implied by this repair.

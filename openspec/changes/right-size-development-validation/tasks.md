## 1. Reuse the release terminal host in candidate lanes

- [x] 1.1 Add an `actions/cache` restore for `dist/native/<platform>-<arch>/` before the release terminal-host toolchain steps in the Development matrix, keyed by runner OS and architecture, the macOS SDK pin, the pinned Rust and Zig versions, and a hash of `native/terminal-host/**`, `rust-toolchain.toml`, the build script, and its imported modules; on a hit, skip toolchain provisioning and `npm run build:terminal-host`, and on a miss build as today and save the output.
- [x] 1.2 Verify the restored output with `scripts/release/verify-native-artifacts.mjs --local` before the build receipt is recorded, so a corrupt or mismatched cache entry fails the lane instead of being packed.

## 2. Remove repeated native work on terminal-host pull requests

- [x] 2.1 Make `run-terminal-host-probe.mjs --partition i/n` run only the partition's `role_integration` slice and the fixture-process check, keeping `cargo test --lib --bins` and `release_isolation` in the `--skip-role-tests` lane; update the partition's completion message and the probe script's unit coverage.
- [x] 2.2 Cache the `cargo-fuzz 0.13.2` binary installed by the pinned nightly toolchain in the Linux build-and-probe lane with a key naming the version and toolchain date, installing only on a miss.

## 3. Document and guard the reused steps

- [x] 3.1 Update `docs/validation.md` and `docs/ci-release-runbook.md` to describe the terminal-host output cache, the partition command set, and the fuzz prerequisite cache, with the measured savings and the retained coverage.
- [x] 3.2 Extend `test/repository-governance/native-ci-workflows.test.ts` to require the cache restore with a complete input key before the release build, the conditional build step, the fuzz-binary cache, and partitions that run no unit-test invocation.

## 4. Validate

- [x] 4.1 Run typechecking, the native workflow governance tests, the probe script unit tests, and strict OpenSpec validation; record the outcomes and known-gap disposition in the design artifact.

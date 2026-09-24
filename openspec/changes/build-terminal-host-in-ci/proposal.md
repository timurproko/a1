## Why

The `native/terminal-host` crate is built only on developer machines: no workflow builds or tests it, and `native/terminal-host/**` has no validation owner, so pull requests that change it pass without compiling it. Building it locally is also hazardous on managed Windows machines. Its Zig build of the vendored `libghostty-vt` fetches upstream packages whose test data includes a deliberately malformed JPEG. On 2026-09-24 endpoint antivirus classified that file as `Exploit.MS04-028`. It then removed the build processes and the running installed `process-guardian.exe` above them, which terminated every open A1 session and left `a1` unable to start until the guardian was restored.

## What Changes

- Add a pull-request CI job that builds, unit-tests and probes `native/terminal-host` on Windows x64 with pinned Rust and Zig 0.15.2 toolchains, and uploads the resulting debug executable as a short-lived artifact for manual proof runs.
- Give `native/terminal-host/**` and its build inputs a deterministic validation owner, so changes to them select the job and unrelated changes skip it.
- Make the terminal-host build script refuse local Windows builds outside CI with a concise message naming the CI job and an explicit opt-in override, so agents and developers do not trigger the hazard by running `cargo test` or `npm run test:terminal-host`.
- Document the CI-first terminal-host workflow in the terminal-host README and the local validation guidance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Add a requirement that the native terminal host is validated by an impact-selected Windows CI job rather than by local builds.

## Impact

- `.github/workflows/ci.yml`, the validation-ownership configuration and matrix scripts, and their governance tests.
- `native/terminal-host/build.rs`, `native/terminal-host/README.md`, and the local validation documentation.
- No change to the published package, release workflow, installed runtime, `process-guardian`, or bare `a1` behavior. Linux and macOS terminal-host builds, release packaging and signing remain out of scope; they belong to task 8.1 of `add-persistent-multi-agent-tabs`, which must first make the crate's build target platform-selected.

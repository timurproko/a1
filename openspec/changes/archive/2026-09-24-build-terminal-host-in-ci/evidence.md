# Implementation evidence

## Result

- `.github/workflows/ci.yml` adds the **Native terminal host (Windows)** modular job on `windows-2025`. It prepares Rust with `prepare-ci-rust.sh` and Zig 0.15.2 with SHA-pinned `mlugg/setup-zig` v2.2.1, which also caches Zig's global package directory. It adds a `terminal-host` Rust cache, runs the `terminal-host` scope (`npm run test:terminal-host`), and uploads `native/terminal-host/target/debug/terminal-host.exe` for one day. The job timeout is 45 minutes for this entry and stays 20 for all others.
- `config/integration-owners.json` adds the pull-request-cadence `terminal-host` owner (win32 x64 Node 24). It selects through `support` paths `native/terminal-host/`, both terminal-host run scripts and the provenance check. `native/process-guardian/` changes do not select it.
- `scripts/release/validation-matrix.mjs` declares the `terminal-host` group and maps the owner to it. `config/validation-suites.json` declares the `terminal-host` commands scope with a `fullReleaseExclusion` reason, so Full regression and release gates do not build it.
- `native/terminal-host/build.rs` exits before copying sources or invoking Zig on a Windows host when `CI` is empty and `TERMINAL_HOST_LOCAL_BUILD` is not `1`. The message names the CI job and the override. The private setting is registered in `config/internal-naming-policy.json` and `docs/architecture/internal-naming.md`.
- `config/github-repository-governance.json` records the new one-day artifact retention for `ci.yml`.
- `native/terminal-host/README.md` and `docs/validation.md` document the CI-first workflow, the artifact download and the override.

## Local validation

- `env -u CI -u TERMINAL_HOST_LOCAL_BUILD cargo check --manifest-path native/terminal-host/Cargo.toml` failed in the build script with the guard message. `%LOCALAPPDATA%\zig` held 877 entries before and after, and the ESET detection log was not written.
- `npm run typecheck`, `npm run check:architecture` (including terminal-host provenance), `npm run check:names` (0 violations) and `node scripts/release/run-changed-documentation.mjs` passed.
- Run one file at a time: `integration-owner-registry` (13), `validation-ownership` (19), `validation-suite-policy` (3), `validation-tier` (23), `modular-validation-aggregate` (14), `validation-impact` (13, including the new selection case), `validation-job-selection` (4), `full-regression-policy` (6), `github-repository-governance` (5), `naming-inspection` (46) and `naming-selection` (10) passed.
- The full `test/repository-governance` and `test/product-identity` run passed apart from `naming-selection`, `release-command`, `validation-impact` and `local-cleanup`, which are known to fail under parallel load on this workstation and passed individually.
- `npx openspec validate build-terminal-host-in-ci --strict` and `git diff --check` passed.

## Manual handoff

After the terminal-host job succeeds, download its executable with `gh run download <run-id> -n terminal-host-win32-x64-attempt-1` and, if desired, run the manual fullscreen proof from `native/terminal-host/README.md`.

## Known gaps

- The terminal host was not built locally, by design. Its hosted-runner build, unit tests and probes are first exercised by this PR's required exact-head validation.
- Linux and macOS terminal-host builds, release packaging and signing remain with `add-persistent-multi-agent-tabs` task 8.1.

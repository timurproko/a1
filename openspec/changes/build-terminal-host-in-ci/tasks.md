## 1. CI job

- [ ] 1.1 Add a Windows x64 terminal-host job to `.github/workflows/ci.yml` that prepares pinned Rust and Zig 0.15.2, caches Rust and Zig package outputs, runs `npm run test:terminal-host`, and uploads the debug `terminal-host.exe` with one-day retention; verify with the job's first run on this PR.
- [ ] 1.2 Declare a pull-request-cadence validation owner for `native/terminal-host/**`, the terminal-host run scripts and the provenance check, and wire it through the validation matrix and job resolution; verify with the ownership and impact-classification governance tests, including one case that selects the job and one that skips it.

## 2. Local build guard

- [ ] 2.1 Make `native/terminal-host/build.rs` fail before invoking Zig on a Windows host when `CI` is unset and `A1_LOCAL_TERMINAL_HOST_BUILD` is not `1`, with a message naming the CI job and the override; verify that a local `cargo check` fails with that message without creating Zig package-cache entries, and that the CI job still builds.

## 3. Documentation and handoff

- [ ] 3.1 Update `native/terminal-host/README.md` and the local validation guidance with the CI-first workflow, the artifact download for the manual proof, and the override; verify links and commands.
- [ ] 3.2 Run the affected governance checks and the full selected PR validation; record any probe that cannot run on hosted runners as a known gap before finalization.

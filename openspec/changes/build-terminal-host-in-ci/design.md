## Context

`native/terminal-host` is a Rust crate that links a static `libghostty-vt` built by Zig from `vendor/libghostty-vt`. Its `build.rs` copies the vendored source to the system temporary directory, runs `zig build -Demit-lib-vt ... -Dtarget=x86_64-windows-msvc`, and links the result. `npm run test:terminal-host` runs `cargo test`, `cargo build`, and four non-interactive probes of the debug executable.

Zig resolves the vendored package's dependencies into its global package cache (`%LOCALAPPDATA%\zig` on Windows). On 2026-09-24 that fetch unpacked `wuffs` test data, including `hippopotamus-bad-comment-length.jpeg`, on a maintainer workstation. The workstation's managed ESET antivirus classified the file as `Trojan.Win32/Exploit.MS04-028`. It removed `build-script-build.exe` and the installed release's `process-guardian.exe` above it in the process tree, and restoring from quarantine needs an administrator password the maintainer does not hold.

No workflow builds the crate today, and the impact classifier does not know `native/terminal-host/**`.

## Goals / Non-Goals

**Goals:**

- Every pull request that changes terminal-host inputs compiles, unit-tests and probes the crate on a clean Windows runner.
- The built executable is downloadable for the manual fullscreen proof without a local build.
- A local Windows build is a deliberate, explicit act, not a side effect of `cargo test`.

**Non-Goals:**

- Linux or macOS builds. `build.rs` hard-codes the Windows MSVC target, so the crate is Windows-only today; cross-platform builds belong to `add-persistent-multi-agent-tabs` task 8.1.
- Release packaging, integrity manifests, provenance or code signing of `terminal-host`.
- Changing Ghostty's dependency set or stripping upstream test data.

## Decisions

### A dedicated Windows job, selected by impact

The job runs on `windows-2025` with `prepare-ci-rust.sh`, a SHA-pinned Zig setup action at 0.15.2, `Swatinem/rust-cache` for `native/terminal-host`, and a cache of Zig's global package directory keyed on `build.zig.zon`. It runs `npm run test:terminal-host` with `CI` set and uploads `native/terminal-host/target/debug/terminal-host.exe` with one-day retention.

It is wired as its own validation owner rather than folded into the existing `containment` group, whose Node, packaging and Defender setup it does not need. The owner claims `native/terminal-host/**`, `scripts/development/run-terminal-host*.mjs` and `scripts/governance/check-terminal-host-provenance.mjs`. It declares pull-request cadence so it participates in the protected aggregate check.

Alternative considered: a path-filtered standalone workflow. Rejected because the repository requires every PR scope to come from the deterministic impact classifier and to feed the one protected check.

The owner selects through its `support` paths rather than a coarse owner. `native/` already belongs to the `native-containment` coarse owner, and process-guardian changes must not build the terminal host.

### Keep the scope out of complete regression for now

Full regression and release gates expand `full-release` on Windows Node 22 and 24, Linux and macOS lanes, with no per-platform filtering. The crate builds only for Windows MSVC, and none of those lanes installs Zig. Including it would fail the Linux and macOS lanes and add a Zig build to every publication. The scope therefore declares `fullReleaseExclusion`, and the suite-policy test permits exactly that one exclusion. The `continuous-integration` "complete suite" requirement is modified to say so.

The cost is that toolchain drift, such as a new Rust stable or an unavailable Zig download, surfaces on the next terminal-host PR instead of nightly. The exclusion ends when `add-persistent-multi-agent-tabs` task 8.1 makes the crate build on every lane.

Alternative considered: include it with a non-Windows skip. Rejected because a lane that silently skips a declared scope weakens the complete-regression evidence and still puts Zig on the publication path.

### Guard local builds in `build.rs`

`build.rs` fails before invoking Zig when the build host is Windows, `CI` is unset, and `TERMINAL_HOST_LOCAL_BUILD` is not `1`. The message names the CI job and the override. The guard lives in `build.rs`, not only in the npm script, because agents commonly run `cargo test` directly. Cargo's existing `rerun-if-env-changed` declarations cover both variables.

Alternative considered: documentation only. Rejected because the incident was caused by an agent following ordinary validation habits.

### Feedback loop for terminal-host work

Agents changing the crate push the branch and read the job's result with `gh run watch` or `gh run view --log-failed`. The terminal-host README and local validation guidance state this.

## Risks / Trade-offs

- [Slower iteration: each change needs a push and a CI run] → Cache Rust and Zig outputs; keep the explicit local override for machines without restrictive antivirus.
- [The hosted runner's Defender could also react to the Ghostty test data] → The job does not enable real-time protection. A detection would surface as a job failure on the first run of this PR, not on a workstation.
- [The probes may need console or PTY capabilities unavailable on hosted runners] → The first CI run of this PR demonstrates them. Any probe that cannot run headless is recorded as a known gap and kept for manual proof rather than silently removed.
- [The override can be misused] → It is opt-in per shell, named explicitly, and documented with the reason it exists.

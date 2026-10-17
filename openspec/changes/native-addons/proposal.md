# Proposal: Host every native component inside the Node runtime

## Why

On 17 October 2026 a managed ESET installation deleted `process-guardian.exe` from both materialized releases under the user's a1 data directory and `terminal-host.exe` from the rollback release, while it left `a1_session_lock.node` in the same directories untouched. Reinstalling the same version did not repair the install, because bootstrap launches an approved release from its restart certification without checking that the certified files still exist. Every `a1 solo` then failed with `process guardian artifact is unavailable`.

The two deleted files are the only processes a1 starts whose image is an a1-built executable. Both are unsigned, stripped, carry no version resource, have zero reputation because every build is a new hash, and run the behaviour behavioural engines are trained on: a suspended create followed by job assignment and resume, a process spawning a detached copy of itself that waits for another process to die, breakaway-from-job detachment, Toolhelp process enumeration, and cross-process termination. Signing, false-positive submissions, and per-machine exclusions all leave the next build or the next user's antivirus product in the same position. Users have different products and policies, so a repair that depends on each machine's antivirus configuration cannot be the product's answer.

Code that runs inside `node.exe` is attributed to a signed, globally prevalent image. The surviving addon in the same directory is direct evidence from the incident. This change moves every native component into Node-API addons loaded by the Node runtime, so no a1-built executable is shipped, materialized, or started on any supported platform, and makes bootstrap repair a release whose certified files went missing.

## What Changes

- The `native/process-guardian` crate becomes a Node-API 9 addon (`process-guardian.node`) that exposes job-object and process-group containment, process-start inspection, terminal-mode capture and restore, and exit-notice delivery. The standalone executable, its protocol, and its command-line contract are removed.
- The launch guardian, already a Node process, contains the root runtime in-process through that addon: on Windows the runtime is created directly inside a kill-on-close Job Object through the job-list thread attribute, with no suspended start; on Linux and macOS it is created in its own process group through `posix_spawn` with foreground transfer. Owner death still closes the tree because the kernel closes the job handle, or the watcher below signals the group.
- A detached exit watcher is the Node runtime running an a1 entry script. It is started outside the launch guardian's containment, waits for the guardian process, performs bounded Unix process-group cleanup, and delivers the armed exit notice when the guardian died with its runtime. A kill aimed at every Node process also ends the watcher; that gap is accepted and documented.
- The `native/terminal-host` crate exports its server, holder, attach, probe, maintenance, and internal roles from its existing Node-API addon, which already carries the session-writer lock, and the release ships one `terminal-host.node` with a fixed Node role entry. The resident launch primitive and its Windows WMI path start the hosting Node runtime with that entry instead of resolving a running executable. `terminal-host.exe` and the separate `a1_session_lock.node` are removed.
- Build scripts, artifact manifests, the runtime payload inventory, native artifact verification, and exact-package surface validation describe loadable addon artifacts; the executable-mode requirement and its repair script are retired.
- Development validation, publication, and the containment and resident integration fixtures build and exercise the addons on win32-x64, linux-x64, darwin-arm64, and darwin-x64.
- Release bootstrap verifies that a certified release's recorded files exist before the fast-path launch and rewrites missing or altered files from the installed package when their digests match the release manifest, so a reinstall or the next launch repairs a release an antivirus product damaged.

## Deferred

- **Signing the addons and version resources.** Both reduce static heuristics further and are worth doing, but they do not change the process boundary and need a certificate decision first.
- **Replacing the Windows WMI launch path.** The resident server is still created through `powershell.exe` and `Win32_Process.Create` when the caller is terminal-contained. With Node hosting the created image is `node.exe`; the PowerShell-over-WMI pattern itself is reviewed separately.
- **Merging holders into the server process.** Each holder becomes a Node process with Node's baseline memory. The per-tab process boundary is a certified crash-isolation decision and is kept; the measured cost is recorded by this change and a merge is a separate design.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `launch-instance-lifecycle`: native lifecycle code runs inside the Node runtime; no a1-built executable is shipped or started; the surviving terminal-restoration owner is a Node-hosted watcher with a documented node-wide kill gap.
- `agent-supervision`: Darwin and Windows containment run in-process through the addon with the same identities and cleanup; native process identity inspection loads the addon; an approved release whose certified files are missing is repaired before launch.
- `resident-terminal-host`: resident roles launch as the hosting Node runtime with a fixed role entry; the session-writer lock and the roles ship in one artifact.
- `multi-agent-tabs`: the attach client is the terminal-host addon's attach role hosted by the Node runtime.
- `continuous-integration`: exact packages carry loadable native addons instead of spawn-capable executables; validation candidates and cross-compiled macOS x64 artifacts are addons whose identity is observed by loading them.

## Impact

Rust: `native/process-guardian` (crate type, `Cargo.toml`, `src/*`), `native/terminal-host` (`src/node_addon.rs`, `src/main.rs` role dispatch moved into the library, `src/launch.rs`, `Cargo.toml`). TypeScript: `src/foundation/process-containment/*`, `src/foundation/launch-guardian/*`, a new exit-watcher entry under `src/foundation/launch-guardian/`, `src/foundation/resident-tabs/{ensure-terminal-host,terminal-host-artifact,maintenance,bounded-host-command}.ts`, `src/foundation/session-writer-lock/index.ts`, a new terminal-host role entry, `src/foundation/release/{bootstrap,release-store}.ts`, `src/product-identity.json`. Scripts: `scripts/development/{build-process-guardian,build-terminal-host,native-target}.mjs`, `scripts/release/{verify-native-artifacts,validation-matrix,generate-runtime-payload-inventory,prepare-validation-package}.mjs`, `scripts/governance/candidate-evidence.mjs`, removal of `scripts/release/repair-native-executable-modes.mjs`. Workflows: `.github/workflows/ci.yml`, `publish.yml`, `full-regression-shared.yml`. Tests under `test/foundation/process-containment`, `test/foundation/launch-guardian`, `test/foundation/release`, `test/foundation/resident-tabs`, `test/repository-governance`, and `native/terminal-host/tests`. Docs: `docs/architecture/{process-guardian-provenance,terminal-host-provenance,resident-tabs,toolchain,boundaries}.md`.

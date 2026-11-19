# Design

## Context

Failures on `develop` since resident tabs milestone 1 (#586, 2026-10-11), with their owners:

| Run | Head | Failure | Cause | Resident tabs? |
| --- | --- | --- | --- | --- |
| Full regression 38104464578 (2026-10-11) | `2a8be166` | `paste-executor.test.ts` warm-spare timing, 1633 ms against 500 ms | timing on a shared runner; repaired in #755 | No, predates milestone 1 |
| Full regression 38343910153 (2026-10-13) | `986b04e4` | pinned Pi public API `keyText` consumer drift | #762 added a `keyText` importer without regenerating the baseline; repaired in #765 | No |
| Full regression 38667962522 (2026-10-15) | `ff11eab6` | resident hotkeys test expected `Alt+]`, macOS renders Option | milestone 5 (#749) test asserted one platform's label; repaired in #768 | Yes, test only |
| Development publication 38740306508, 38742695792 (2026-10-15) | `491c2151` | session-resume suite on Linux and Windows | this change | Yes, product and validation |

Only the last is a product defect, and it is the one validation could not see. The three nightly failures are real but separate. Two came from scope selection: a pull request's bounded validation did not run the owner on the platform or scope where it failed (`pinned-pi-public-api` for #762, the macOS hotkey label for #749). Full regression found each within a day.

## The publication failure

`selectResidentHost` routed on profile, `solo`, and the launch contract only. Before #750 no package carried a terminal host, so `ensureTerminalHost` always returned `terminal host not installed` and every packaged launch ran the direct UI. #750 packed a host for all four release platforms, and the resident route became the default for the first time in a package.

The session-resume suite spawns the packaged CLI with `stdio: "pipe"`:

- Linux: the attach client calls `crossterm::terminal::size()` (`native/terminal-host/src/roles/attach.rs`), which fails with `EAGAIN (os error 11)` with no terminal. The launch exits before input is ready, and the invalid-target case reports exit 2 instead of 1.
- Windows: the attach client starts and the tab gets its own ConPTY. The tab's UI sees a terminal, so the project trust dialog (`project-trust-prompt.ts` refuses only when stdin or stdout is not a TTY) opens inside the tab and readiness never arrives.
- macOS passed. The cause is unconfirmed; the hosted runner may give crossterm a controlling terminal to fall back to. Either way it is luck, not a contract.

## Why validation did not catch it

#750's pull-request run 38705725246 ran "Pi release and resume integration" on Windows and the suite passed in 46 s. Its candidate held only `dist/native/win32-x64/process-guardian.exe`: pull-request lanes and Full regression run `npm ci` (which builds the guardian) and pack, but never build the terminal host. `ensureTerminalHost` returned `terminal host not installed`, and the launch silently took the direct route. Native lanes built a debug host and resident chaos drove the release host with fake agents, but nothing packed the host into a candidate and launched it through the public entry. `verify-native-artifacts.mjs --local` documents a "validation lane builds only its own platform" mode, but no validation lane called it.

## Decisions

### 1. Resident routing requires an interactive terminal

`selectResidentHost` takes `interactive`. When it is false, the result is `{ status: "fallback", reason: "no interactive terminal" }` and `ensureHost` is never called, so a piped launch neither probes nor starts the server. Bootstrap passes `process.stdin.isTTY && process.stdout.isTTY` from the `bin/cli.js` process, whose streams are the user's, with an `interactiveTerminal` test seam. A fallback reason (rather than `null`) keeps the launch context truthful: `hidesTabSettings` hides tab settings for a launch that has no tabs. Both streams are required because the attach client owns raw input and renders to the terminal; `a1 | tee log` and `a1 < script` are both non-interactive.

Rejected: making the attach client tolerate a missing terminal. It would still own stdin it cannot put in raw mode, and the tab would still show interactive dialogs nobody can answer.

### 2. Every packed validation candidate carries its platform's release host

The modular job resolver reports `packs_candidate` when the job is active and any of its expanded scopes has `consumesPackage` (today `package-smoke`, `package-contracts`, `package-startup`, `update-predecessor`). Those lanes run `prepare-ci-rust.sh`, set up Zig 0.15.2, restore a `terminal-host-release` Rust cache, and run `npm run build:terminal-host` after `npm ci` and before `Record verified install-time build`. The receipt inventories `dist`, so the host is bound into the build the pack step verifies. The Full regression Windows `package` shard and the Linux and macOS `full-regression` jobs do the same.

Scope expansion moves from `createTierPlan` into `scripts/release/validation-scopes.mjs` without dependencies: the resolver runs before `npm ci` and cannot import `validation-tier.mjs`, which needs `cross-spawn`. `createTierPlan` uses the same function, so the two cannot disagree.

The release host cache uses `shared-key: terminal-host-release` in these jobs and in publication's `terminal_hosts` job. With `key`, rust-cache adds the job id, so no two of these jobs share a cache. A pull request can also read only its own branch's and `develop`'s caches. Sharing lets every pull request restore the release build that publication and nightly Full regression save on `develop`. The first diagnostic run, without a warm cache, added 4 to 9 minutes per packing lane; Exact-package contracts took 15.3 minutes against 5.9 for #750.

Native and chaos lanes never pack a candidate, so their existing Zig steps never overlap the new ones. The modular timeout for non-native lanes rises from 20 to 35 minutes, because `timeout-minutes` is fixed before the selection decides whether a lane builds the host. Publication's measured release host builds were 3 to 5 minutes warm on Linux, macOS arm64, and Windows.

Rejected: reusing the native lanes' host. Those build debug binaries with fixture features, in a different matrix cell; a release candidate must carry the release-built, `--version`-verified artifact.

### 3. Packing fails closed on CI

`prepare-validation-package.mjs` checks, when `GITHUB_ACTIONS` is `true`, this platform's guardian and terminal-host manifests and files with `nativeArtifactProblems`, and fails before `npm pack` with the problems and the command that fixes them. Publication packs after assembling every platform, so it passes this check unchanged. Local packing is unaffected, because developer machines cannot build the host.

## Risks

- Packing lanes take a few minutes longer when the release cache is warm, and longer when cold. This is the cost the maintainer chose over a cheaper skip-and-warn guard.
- Piped launches lose resident tabs. This is intended: no interactive tab can be shown without a terminal.

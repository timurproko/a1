# Toolchain and release contract

Exact package versions are recorded in `package-lock.json`.

## Runtime and build

| Component | Contract |
|---|---|
| Node.js | `>=22.19.0 <25` |
| Package manager | npm 11, lockfile v3 |
| Language | TypeScript, strict native ESM, `NodeNext`, ES2023 |
| Control storage | Built-in `node:sqlite` `DatabaseSync`, WAL mode |
| Process/version helpers | `cross-spawn`, `semver` |
| Tests | Vitest |

The repository has one root package manifest, lockfile, dependency tree, TypeScript configuration, and test configuration. Feature folders must not introduce nested package installations or generated runtime state.

## Platform policy

The owned rendering pipeline uses the containing terminal on Windows, Linux, and macOS. The architecture is platform-neutral, but stable presentation/support claims are platform-specific and require deferred physical certification against exact package bytes. An uncertified development preview is not evidence of stable cross-platform support.

Physical desktop automation is absent from the active repository baseline. Any future implementation must run only on dedicated disposable workers or VMs with exclusive interactive desktops and exact process ownership.

## Package contents

The published package contains:

- the sole public `a1` command;
- the internal supervisor, launch-guardian, exit-watcher, and fixed terminal-host role entries;
- immutable release/bootstrap, lifecycle, protocol, storage, update, owned-UI, and Pi-adapter modules, plus `process-guardian.node` and `terminal-host.node` for every supported target with manifests and terminal-host notices;
- current user and architecture documentation.

It contains no executable built from A1 sources, separate session-lock addon, browser/desktop GUI, physical automation driver, or generated runtime data. PTY ownership, terminal emulation, composition, and input translation exist only inside the terminal-host addon; the JavaScript product path does not relay terminal bytes.

## Native addon layer

`npm run doctor` reports this contract against the current machine—Node range, npm major, git, the GitHub CLI, Rust/Cargo, Windows Microsoft C++ readiness where applicable, and whether `node_modules` matches the lockfile—and names the explicit setup action for anything missing. `npm run build` resolves the same native environment and runs the check before cleaning or compiling, so an unmet prerequisite fails by name rather than inside a module resolver, Cargo, or the linker. Unmet tool prerequisites block; a Node or npm version outside the declared contract is reported as an advisory without failing the build.

Source builds require Rust/Cargo 1.85 or newer; `rust-toolchain.toml` pins the exact version CI and publication install through `scripts/development/prepare-ci-rust.sh`, and rustup selects that version for Cargo commands inside the repository, installing it on first use. On Windows, the resolver honors explicit `CARGO` and `RUSTC` executables, then the launching `PATH`, then `%USERPROFILE%\.cargo\bin`; the fallback changes only build-child state. Windows native linking also requires Visual Studio or Visual Studio Build Tools with the Desktop development with C++ workload, MSVC x64/x86 tools, and a Windows SDK. Visual Studio Code is not a compiler prerequisite. An already valid developer environment is retained; otherwise the resolver uses the installed stable Visual Studio locator and `vcvars64.bat`, verifies that `cl.exe` and Microsoft's `link.exe` come from the selected VC tools, and passes the captured environment only to child processes. This prevents Git Bash's GNU `link.exe` from shadowing MSVC without changing persistent `PATH`. A1 never installs these tools, elevates privileges, or accepts licenses automatically. The Zig cache (`mlugg/setup-zig`, one entry per workflow and platform per run, bounded to 512 MiB) stays enabled: measured on 2026-10-16, a cold Zig build of `libghostty-vt` added about 40 to 60 seconds to a terminal-host test build (Linux 2m21s cold against 1m20s warm, Windows 2m05s against 1m26s), which the cache saves on every warm run.

`npm run build` compiles `native/process-guardian` as the host platform's Node-API 9 addon, places `process-guardian.node` under `dist/native/<platform>-<architecture>/`, loads it to observe its version identity, and writes the v2 integrity manifest. It also builds the current platform's release-profile `terminal-host.node`, whose v2 manifest binds the addon, `dist/foundation/resident-tabs/host-entry.js`, and notices, so the ordinary `npm run build && ./scripts/dev` handoff exercises resident tabs without deployment. On Windows the normal build reuses a compatible ignored terminal-library cache or downloads the newest compatible library from the current branch or a successful CI run belonging to a pull request already merged into `develop`, then links it under the crate's manifest verification; it never silently invokes the quarantined Zig package fetch. An unavailable or mismatched prerequisite fails the build instead of leaving a nominally successful single-agent-only tree. The npm `prepare` lifecycle and validation preflight use the explicit core build because selected native lanes assemble and certify terminal hosts separately.

Preview and stable candidate workflows build the addons on isolated Windows, Linux, and macOS arm64 runners, cross-compile the macOS x64 addons on the arm64 runner with `--target x86_64-apple-darwin`, and assemble all targets before packing. Those release runners retain their explicit `npm run build:terminal-host` step and pinned Zig input rather than consuming a workstation cache. Cross-compiled artifacts record a Mach-O architecture check when they cannot be loaded on the producing runner. Supported native code is always loaded by Node; an absent, incompatible, or unsupported addon fails before runtime startup rather than falling back to PID-only cleanup. The process-guardian addon inherits terminal handles but transports no terminal bytes. Its separate Node-hosted exit watcher restores terminal state after guardian failure, subject to the documented node-wide-kill gap. See [`process-guardian-provenance.md`](process-guardian-provenance.md), [`terminal-host-provenance.md`](terminal-host-provenance.md), and [`resident-tabs.md`](resident-tabs.md).

## Gates

```sh
npm run build
npm run typecheck
npm run check:architecture
npm run check:deprecated
npm test
npm run test:release
```

`check:deprecated` verifies the complete lockfile graph against registry metadata. The release gate exercises durable stable/development update transitions and writes an ignored machine-readable verdict under `.artifacts/release-verdicts/`.

## Pi maintenance workflows

Engine compatibility and presentation synchronization are intentionally separate:

```sh
npm run test:pi-engine-conformance
```

This mandatory candidate workflow checks documented package-root exports and the owned engine integration. It does not read private interactive source, compare source maps, regenerate UI fixtures, or require presentation provenance to match a candidate package.

```sh
npm run sync:pi-ui
```

This optional, mutating presentation-maintenance workflow regenerates component and event-frame parity evidence when maintainers deliberately adopt upstream UI changes. Review generated diffs, attribution, and source-ledger records before committing them. It is never an engine candidate acceptance gate and is not run by `check`, `prepack`, or release publication.

`node scripts/pi/sync-pi-inventories.mjs` re-resolves `modal-surface-inventory.json`, `presenter-ownership-inventory.json`, and `pinned-pi-interactive-baseline.json` against the installed Pi packages: anchors that still match stay, anchors that match only ignoring whitespace are rewritten, anchors that match nowhere mark their entry `orphaned`, behavior line ranges that lost their anchors move to their symbols' span, hashes and manifests are regenerated, and interactive components the modal graph has never recorded are reported as unmapped. `--check` reports without writing; `--commit <sha>` records a new version's upstream commit; `--report <path>` writes the resolution report.

`node scripts/pi/propose-pi-upgrade.mjs [--version <v>] [--commit <sha>] [--skip <v>...] [--refresh] [--output <dir>]` proposes a Pi upgrade in the working tree: it captures the old upstream sources, pins both packages at the target (by default the newest published version newer than the pin that is not skipped; `--version` ignores skips), evaluates the candidate through `pi-candidate-evaluator.mjs` and keeps the complete compile output in the artifact (summarized per file in the sync report), installs and builds, three-way merges each vendored copy under `src/integrations/pi/components/upstream/` whose ledger record says `upgradeStrategy: three-way` (`git merge-file --diff3` of the A1 copy, the old upstream, and the new upstream; conflict markers stay in the file as review items) and, for a `keep-owned` copy, leaves the file alone and writes the upstream delta to `kept/<record>.diff` in the artifact, regenerates the ledger and headers, re-resolves the inventories, refreshes the public API baseline (listing removed or changed exports with their A1 consumers as adoption items) and the feature adoption matrix (listing new upstream rows as pending), re-pins the startup graph, refreshes parity evidence, runs the type, architecture, engine-conformance, and parity gates, scaffolds `openspec/changes/pi-upgrade-<version>/` with the pin moved in the requirement that names it (only when the change directory is absent), and writes `report.json`, the pull-request `body.md` in the ordinary delivery layout with its generated implementation and acceptance outcomes, and the sync report `comment.md` carrying the version delta, changelog excerpt, verdicts, and review items. A failed step is recorded and the run continues; while conflict markers remain in any copy, the gates that compile the tree (`startup-graph`, `parity`, `typecheck`, `architecture`, `parity-suites`) are recorded as `blocked` by those copies instead of running to fail, and the isolated evaluation and engine conformance still report the candidate's verdicts. `--refresh` re-runs the derived steps and gates on the checked-out proposal branch without bumping, evaluating, installing, or merging, comparing against the pin of `--base` (`origin/develop`). `.github/workflows/pi-upstream-sync.yml` runs it nightly and opens the draft pull request `chore/pi-<version>` with the App identity and posts the sync report comment; every later run posts another comment and never edits the body, whose outcomes the reviewer checks, and a branch that carries commits the bot did not author is never pushed to. Closing a proposal with the `pi-upgrade-skipped` label skips its version; `PI_UPGRADE_FREEZE_UNTIL` silences the schedule until a date. A human resolves the review items and merges. The pinned identity every check compares itself to comes from `scripts/governance/pinned-pi-identity.mjs`: versions from the dependency authority, the commit from `pinned-pi-interactive-baseline.json`.

`node scripts/pi/update-pinned-pi-public-api.mjs [--check] [--packages-root <node_modules>] [--output <path>]` records `config/baselines/pinned-pi-public-api.json`, the package-root export surface of both pinned packages read from their declaration entries with the TypeScript compiler API: each export's kind, the hash of its normalized declaration, and the A1 modules under `src/` whose imports name it, directly or through a barrel such as `startup-public.ts`. The baseline is tooling evidence read by path, never a production import. `node scripts/pi/update-pi-feature-adoption-matrix.mjs [--check] [--packages-root <node_modules>] [--report <path>]` records `config/baselines/pi-feature-adoption-matrix.json`: one row per advertised and hidden command, TUI and app keybinding, session event, settings callback, presented setting, and stateful component from the interactive baseline's manifests and the engine's settings source, plus one row per changelog "New Features" entry newer than the matrix's `changelogSince`, each carrying A1's disposition: `pinned` (reused as is), `owned` (the behavior id and the test that proves it), `diverged` (the approved deviation id), `declined` (a reason), or `pending` (what the refresher writes for a new row). The refresher rewrites the upstream side only and marks a row upstream dropped `retired`; `test/repository-governance/pi-feature-adoption-matrix.test.ts` fails on a pending row, on missing evidence, and on a row whose feature upstream no longer presents unless it is retired. `node scripts/pi/update-startup-graph-baseline.mjs [--check]` re-pins the file and byte totals in `config/startup-graph-baseline.json` from the measured startup reachability and the manifest the last build wrote; optional modules and pinned dynamic imports stay reviewed.

Presentation acceptance is the reader comparing `a1 pi` with pinned Pi. `node scripts/governance/check-pinned-pi-source-ledger.mjs` validates accepted provenance; its `--engine-only` mode validates the ownership partition without comparing private upstream source.

`node scripts/pi/update-pinned-pi-source-ledger.mjs` regenerates `config/baselines/pinned-pi-source-port-ledger.json` from the installed packages' source maps. Upstream identity (hashes, line counts, source-map paths) comes from the packages; the reviewed fields of an existing record (classification, destination, status, modifications, deviations, tests, tasks, and `upgradeStrategy`: `three-way` for a copy that follows upstream, `keep-owned` for one A1 keeps on purpose and the upgrade never merges) are kept from the ledger, so reclassifying or deleting a port is a ledger edit, never a script edit. It also rewrites the provenance header at the top of every owned copy under `src/integrations/pi/components/upstream/` from the record (upstream package, version, commit, path, modifications, and deviation ids) before recording the copy's hash; the ledger check requires that header verbatim. `--check` reports header or ledger drift without writing.

## Publication

One reusable workflow publishes both npm channels: `.github/workflows/publish.yml`. Pushes do not publish. Nightly development verification runs at `03:17 UTC`; `npm run develop` dispatches the development wrapper for a numbered preview. `npm run release -- patch` generates a source-bound draft GitHub Release with a Pi-style version/date heading and categorized change sections, starts `.github/workflows/release-candidate.yml` to run the complete stable suite on that source, prints the run link, waits for it, and prints the draft editing link once only after it passes. Choosing native **Publish release** on the draft is the only stable npm trigger: GitHub creates the tag at the bound source, and the `release.published` workflow calls the default-branch publisher, which derives the authorized human actor, source, Release identity, normalized body, and digest, and requires the successful candidate run for that source and version. A preview is stamped as `-dev.<first-parent commit count of the develop source>`, so later merges always sort above earlier ones, records the merged pull request and source commit as `publication` manifest metadata, and uses npm `next` only as an internal dist-tag. New candidates pack the application and dependency-free installer once each—including committed release history plus the approved current note snapshot—and validate their exact bytes on Windows, Linux, and macOS; after the click the published note is repacked and the exact-package gates run on the final bytes. A repeated nightly verifies both immutable registry tarballs. After npm verification, publication uploads the asset and fast-forwards `master`, then App-authenticated automation proposes one exact reopening PR, which documentation auto-merge re-verifies and merges after required CI, storing both next `-dev` versions and the note. A failure before either package reaches npm returns the Release to draft and deletes its unconsumed tag, the only tag deletion the release-automation App may perform; after npm, the same run's failed jobs are rerun. Tags are never moved or reused. All npm publication uses provenance from the `npm-publish` environment, a preview never changes `latest`, and one global non-cancelling concurrency group serializes the final registry check.

`docs/ci-release-runbook.md` is the operational reference.

## A1 state paths

These paths are A1 control and release state, not Pi profile roots. All are overrideable for hermetic tests.

| Purpose | Override | Windows default | Unix default |
|---|---|---|---|
| Config | `A1_CONFIG_DIR` | `%APPDATA%\\a1` | `$XDG_CONFIG_HOME/a1` or `~/.config/a1` |
| Control/release data | `A1_DATA_DIR` | `%LOCALAPPDATA%\\a1` | `$XDG_DATA_HOME/a1` or `~/.local/share/a1` |
| Runtime | `A1_RUNTIME_DIR` | `%LOCALAPPDATA%\\a1\\runtime` | `$XDG_RUNTIME_DIR/a1` or `<data>/runtime` |
| Database | `A1_DATABASE_PATH` | `<data>/control.sqlite3` | `<data>/control.sqlite3` |
| Endpoint | `A1_ENDPOINT` | runtime-scoped `a1-*` named pipe | `<runtime>/supervisor.sock` |

### Identity hard cut and cleanup

A1 does not read or migrate legacy `ADDONE_*` variables, `AddOne`/`addone` control-state directories, release manifests, database schemas, endpoint records, or protocol frames. Remove obsolete control state only after stopping old processes: `%APPDATA%\\AddOne` and `%LOCALAPPDATA%\\AddOne` on Windows, or the former `addone` directories under XDG config, data, and runtime roots on Unix. This cleanup is manual and never imports data into A1.

Do **not** remove `~/.a1/agent`; it is A1's current Pi profile root. `~/.pi/agent` remains the vanilla Pi profile.

The obsolete npm package `@timurproko/addone` is deprecated with the registry message `This package is obsolete. Use @timurproko/a1 instead.` It is not a current identity, compatibility channel, or rollback source. Whole-package unpublication was rejected by npm policy; any later removal is owner-controlled registry administration and does not change the A1 runtime contract.

The launch-profile feature separately owns A1's `~/.a1/agent` root and preserves ordinary Pi resolution through `~/.pi/agent`.

## Internal naming validation

The required PR naming job inspects complete new and changed source files. `npm run check:names` performs the full tracked audit, also required by nightly full-release validation. See [internal naming and clean cutover](internal-naming.md) for public/private environment ownership, required checks, and protected user data.

### Prompt history

Prompt history has a separate default: `<effective-home>/.a1/data/history/<profile-id>.sqlite3`
on Windows, Linux, and macOS. The effective home follows launch-profile resolution
(`A1_PROFILE_HOME` or the OS home), not `XDG_DATA_HOME`. An explicit `A1_DATA_DIR`
continues to select `<A1_DATA_DIR>/history` as well as the control/release data root.
The home-based history default does not relocate the paths above or the compile
cache at `<data>/cache/compile`. See [prompt history](../features/prompt-history.md)
for the deliberate fresh start without migration, privacy, and manual removal.

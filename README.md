# A1

A1 is a terminal-native agent launcher for Windows, Linux, and macOS. Bare `a1` runs the A1-owned Pi-compatible UI, while explicit fallback profiles can launch untouched Pi directly. A1 also manages release selection, process ownership, and updates.

## Install

Requirements:

- Node.js 22.19 through 24.x
- npm 11

Published packages include the integrity-verified process guardian for supported platforms. Building A1 from source additionally requires Rust/Cargo 1.85 or newer.

```sh
npm install --global @timurproko/a1@latest
```

The package installs only the `a1` command.

## Commands

```sh
a1              # A1-owned UI and profile: ~/.a1/agent
a1 pi           # untouched vanilla Pi oracle: ~/.pi/agent
a1 sandbox      # unchanged isolated vanilla Pi profile: ~/.a1/sandbox
a1 version      # show Installed, Release (latest), and Next versions
a1 update       # update to npm latest
a1 update:next  # update to npm next
```

Bare `a1` owns its Pi-compatible TUI composition and uses the public Pi engine, components, and terminal APIs. It does not insert a PTY or terminal-byte relay. Default visuals and workflows track the pinned vanilla Pi baseline; A1-specific visual customization and structured tabs remain disabled.

`a1 pi` is the untouched upstream fallback and comparison oracle. Use it to distinguish A1-owned UI problems from upstream Pi, profile, provider, or terminal problems. The `a1 ui` subcommand was removed and is not a compatibility alias; run bare `a1` for the owned UI.

`a1 sandbox` is unchanged: it launches vanilla Pi with isolated Pi configuration and resources. “Sandbox” does not mean operating-system, filesystem, process, network, or credential security isolation. See [`docs/features/launch-profiles.md`](docs/features/launch-profiles.md) for first-run directories, independent `/login`, trust behavior, extension placement, and recovery.

Every interactive command creates an independent, non-detachable launch instance. Any number of `a1`, `a1 pi`, and `a1 sandbox` commands may run in separate terminals at the same time. Closing one command closes only its owned UI/Pi process and all agents, extensions, tools, daemons, and descendants created by that invocation; it never requires finding PIDs, deleting control state, or restarting the supervisor. The idle supervisor may remain available for release coordination after all interactive instances close, but it owns no surviving instance runtime.

## Develop

```sh
npm ci
npm run build
npm start
```

`npm start` gives each invocation isolated A1 development state and an isolated development Pi profile. Use `npm start -- --print-environment` to inspect the selected paths without launching the UI.

A1 control state uses `%APPDATA%\\A1` and `%LOCALAPPDATA%\\A1` on Windows, and the `a1` directory under XDG config/data/runtime roots on Unix. Override it only with declared `A1_*` variables such as `A1_CONFIG_DIR`, `A1_DATA_DIR`, `A1_RUNTIME_DIR`, `A1_DATABASE_PATH`, and `A1_ENDPOINT`. Pi profile roots remain `~/.a1/agent`, `~/.pi/agent`, and `~/.a1/sandbox`. This is a no-migration identity hard cut; see [`docs/architecture/toolchain.md`](docs/architecture/toolchain.md#identity-hard-cut-and-cleanup) before removing obsolete control state.

### Worktree lifecycle

The primary worktree stays on `develop` and is integration-only. Each task uses a detached worktree under the repository's ignored `.worktrees/` directory, based on current `origin/develop` unless another base is selected.

```sh
git fetch origin --prune
git worktree add --detach .worktrees/<task-id> origin/develop
cd .worktrees/<task-id>
```

Commit and validate coherent work there. Because `develop` is protected, push the detached commit to one temporary remote branch and merge one pull request for the requested change. After merge, update the primary worktree and remove the task worktree only when its commits are reachable from `develop`:

```sh
git push origin HEAD:refs/heads/<task-id>
gh pr create --base develop --head <task-id>
# After the pull request is merged:
cd <repository-root>
git fetch origin --prune
git merge --ff-only origin/develop
git worktree remove .worktrees/<task-id>
git worktree prune
```

Manual acceptance does not leave a permanent validation checkout. Once acceptance is recorded, archive the completed OpenSpec change, integrate the archive commit into `develop`, then remove and prune every task or acceptance worktree retained for that change. Never remove a worktree before all of its implementation, acceptance, and archive commits are reachable from `develop`.

Local package archives and ad hoc test builds belong under `.builds/`, never in the repository root. For manual package tests, use:

```sh
mkdir -p .builds
npm pack --ignore-scripts --pack-destination .builds
```

Run the non-desktop gates with:

```sh
npm run typecheck
npm run check:architecture
npm run check:deprecated
npm test
npm run test:release
```

Automated physical-terminal interaction must never run on an active workstation. Future physical certification may run only on dedicated disposable workers or VMs with exclusive test desktops.

## Releases

An exact manually accepted `-dev.N` candidate may publish under npm tag `next` after applicable non-desktop gates pass. Such a preview is explicitly uncertified, cannot move `latest`, and cannot claim stable terminal parity or platform support. Stable claims require deferred physical and cross-platform certification against the exact package.

Trusted preview publication uses `.github/workflows/publish-next.yml` and npm provenance. Local release mechanics are documented in [`docs/architecture/toolchain.md`](docs/architecture/toolchain.md).

## Architecture

- [`docs/architecture/boundaries.md`](docs/architecture/boundaries.md)
- [`docs/architecture/toolchain.md`](docs/architecture/toolchain.md)
- [`docs/manual-transparent-checkpoint.md`](docs/manual-transparent-checkpoint.md)
- [`docs/features/launch-profiles.md`](docs/features/launch-profiles.md)

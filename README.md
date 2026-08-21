# A1

A1 is a terminal-native agent launcher for Windows, Linux, and macOS. Bare `a1` runs the A1-owned Pi-compatible UI, while explicit fallback profiles can launch untouched Pi directly. A1 also manages release selection, process ownership, and updates.

## Install

Requirements:

- Node.js 22.19 through 24.x
- npm 11

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

## Develop

```sh
npm ci
npm run build
npm start
```

`npm start` gives each invocation isolated A1 development state and an isolated development Pi profile. Use `npm start -- --print-environment` to inspect the selected paths without launching the UI.

A1 control state uses `%APPDATA%\\A1` and `%LOCALAPPDATA%\\A1` on Windows, and the `a1` directory under XDG config/data/runtime roots on Unix. Override it only with declared `A1_*` variables such as `A1_CONFIG_DIR`, `A1_DATA_DIR`, `A1_RUNTIME_DIR`, `A1_DATABASE_PATH`, and `A1_ENDPOINT`. Pi profile roots remain `~/.a1/agent`, `~/.pi/agent`, and `~/.a1/sandbox`. This is a no-migration identity hard cut; see [`docs/architecture/toolchain.md`](docs/architecture/toolchain.md#identity-hard-cut-and-cleanup) before removing obsolete control state.

### Branch lifecycle

Create every topic or milestone branch from `develop`; never implement directly on `develop` or `master`. A source branch is closed only after this sequence completes:

1. Validate the source branch with its required gates.
2. Merge it into `develop` and push the merged `develop` commit.
3. Switch to `develop`.
4. Preview the exact cleanup set with `npm run branches:prune -- --branch <source>`.
5. Safely delete the reviewed local source with `npm run branches:prune -- --apply --branch <source>`.
6. When the non-protected remote source exists, delete it in the same cleanup with `npm run branches:prune -- --apply --branch <source> --remote origin`.

The command defaults to a dry run against `develop`. It always retains `develop`, `master`, the checked-out branch, explicitly protected branches, and branches whose tips are not ancestors of the integration target. Apply mode uses only Git safe deletion (`git branch -d`), never force deletion. Use `--base <branch>` for another explicit integration target, `--protect <branch>` for additional protection, and `--json` for machine-readable review.

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

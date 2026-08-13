# AddOne

AddOne is a terminal-native agent launcher for Windows, Linux, and macOS. The current product surface runs one foreground Pi process through the physical terminal while AddOne manages release selection, process ownership, and updates.

## Install

Requirements:

- Node.js 22.19 through 24.x
- npm 11

```sh
npm install --global @timurproko/addone@latest
```

The package installs equivalent `addone` and `a1` commands.

## Commands

```sh
a1              # launch the AddOne agent experience
a1 version      # show Installed, Release (latest), and Next versions
a1 update       # update to npm latest
a1 update:next  # update to npm next
```

Bare `a1` currently launches one Pi process across the full terminal viewport. Pi and the physical terminal own rendering, keyboard/mouse input, selection, clipboard, scrollback, and terminal modes. AddOne does not insert a PTY, parser, renderer, input translator, or terminal-byte relay.

This transparent capability intentionally provides no AddOne-managed internal tabs, inactive resident terminal surfaces, or visual reconnection. Supporting arbitrary interactive CLI tabs requires a separately designed composed-terminal capability. Bare `a1` remains the product entry point when multi-agent UX is introduced; there is no `a1 agent` command.

The planned `sandbox` launch profile means isolated Pi configuration and resources. It does not mean operating-system, filesystem, process, network, or credential security isolation.

## Develop

```sh
npm ci
npm run build
npm start
```

`npm start` uses isolated AddOne development state for each invocation. It does not isolate the Pi user profile yet.

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

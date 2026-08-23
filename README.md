# A1

A1 is a terminal-native agent launcher for Windows, Linux, and macOS. Bare `a1` runs the A1-owned Pi-compatible UI, while explicit fallback profiles can launch untouched Pi directly. A1 also manages release selection, process ownership, and updates.

## Install

Requires Node.js 22.19 through 24.x and npm 11.

```sh
npm install --global @timurproko/a1@latest
```

## Commands

```sh
a1              # A1-owned UI and profile: ~/.a1/agent
a1 pi           # untouched vanilla Pi oracle: ~/.pi/agent
a1 sandbox      # unchanged isolated vanilla Pi profile: ~/.a1/sandbox
a1 version      # show Installed, Release (latest), and Next versions
a1 update       # update to npm latest
a1 update:next  # update to npm next
```

The `a1 ui` subcommand was removed; run bare `a1` for the owned UI.

Any number of `a1`, `a1 pi`, and `a1 sandbox` commands may run in separate terminals at the same time. Closing one command closes only its own UI/Pi process and everything it spawned.

## Develop

```sh
npm ci
npm run build
npm start           # isolated development launch
npm run test:fast   # typecheck + fast suite, no build needed
npm test            # same as test:fast
npm run test:full   # complete non-physical suite
```

# AddOne

AddOne is being rebuilt as a cross-platform terminal workspace for Windows, macOS, and Linux.

## Terminal redesign status

The previous PTY/emulation/rendering pipeline was not production-ready and has been removed. The milestone branch now contains a manual-checkpoint transparent foreground broker. Interactive `addone`/`a1` launches the configured command with inherited native terminal handles and no AddOne terminal byte relay, renderer, parser, PTY, or input translator.

The replacement remains terminal-based:

- transparent mode attaches arbitrary terminal applications through each platform's native terminal/process facilities without AddOne input or rendering translation;
- any later composed mode must use one independently certified authoritative terminal core;
- neither mode may add executable-, argument-, environment-, or content-specific terminal hacks.

## Requirements

- Node.js 22.19+ or 24.x
- npm 11
- Windows 11 x64, current Ubuntu LTS x64, or current/previous macOS arm64 for the planned certified terminal capability

See [`docs/architecture/toolchain.md`](docs/architecture/toolchain.md) and [`docs/architecture/boundaries.md`](docs/architecture/boundaries.md).

## Install or develop

```sh
npm install --global @timurproko/addone@latest
```

Development checkout:

```sh
npm ci
npm run build
npm link
```

`npm start` builds and launches a unique isolated AddOne development instance. For the manual-first transparent validation workflow, follow [`docs/manual-transparent-checkpoint.md`](docs/manual-transparent-checkpoint.md) and enter all launch/interaction commands yourself. Do not run physical automation on your workstation.

## Version and update

Architecture-independent maintenance commands remain available:

```sh
addone version
# Installed: <local version>
# Release:   <npm latest>
# Next:      <npm next>

addone update       # stable latest
addone update:next  # preview next
```

`a1` is an equivalent alias. Updates use the durable verified stop-install-activate transaction and require a canonical npm-managed global installation.

## Development checks

```sh
npm run build
npm run typecheck
npm run check:architecture
npm run check:deprecated
npm test
npm run test:release
```

The current release gate covers architecture-independent lifecycle and N−1 update transitions only. Terminal input/rendering certification will be rebuilt from independent physical-host evidence after cleanup.

## Preview publication freeze

`npm run publish:next` intentionally fails during redesign. Preview publication resumes only after transparent capability certification and explicit user validation.

Historical details of the retired `0.1.5-dev.7` pipeline remain available in Git and OpenSpec history rather than active documentation or tests.

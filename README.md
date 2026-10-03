<p align="center">
  <a href="https://agentnumberone.dev"><img src="docs/assets/readme/mark.svg" alt="a1" width="112"></a>
</p>

<p align="center">
  An open-source AI coding agent for the terminal, built on the pi engine.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@timurproko/a1"><img alt="npm" src="https://img.shields.io/npm/v/@timurproko/a1?style=flat-square&color=2638d2"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-2638d2?style=flat-square"></a>
  <a href="https://agentnumberone.dev"><img alt="Website" src="https://img.shields.io/badge/web-agentnumberone.dev-2638d2?style=flat-square"></a>
</p>

## Install

Release:

```sh
npm x -y -- @timurproko/a1-install
```

Develop:

```sh
npm x -y -- @timurproko/a1-install --develop
```

Preview number:

```sh
npm x -y -- @timurproko/a1-install --develop 107
```

Exact preview:

```sh
npm x -y -- @timurproko/a1-install --develop 0.1.8-dev.107
```

<p align="center"><picture><img src="docs/assets/readme/terminal.svg" alt="" width="240"></picture></p>

## Use

Launch A1 (profile: `~/.a1/agent`):

```sh
a1
```

Show all commands:

```sh
a1 help
```

Show the current and latest versions:

```sh
a1 version
```

Vanilla Pi oracle (`~/.pi/agent`):

```sh
a1 pi
```

### Update

Install the release:

```sh
a1 update
```

Install develop:

```sh
a1 update --develop
```

Install preview 107:

```sh
a1 update --develop 107
```

Install that exact preview:

```sh
a1 update --develop 0.1.8-dev.107
```

Refresh A1's model catalogs:

```sh
a1 update --models
```

Stuck on `0.2.2` and `a1 update` fails? Run the installer once, then use `a1 update` as usual:

```sh
npm x -y -- @timurproko/a1-install
```

A1 shows an `Update Available` notice at most once a day and never installs anything by itself. Turn it off in Settings (`Update check`) or with `A1_SKIP_VERSION_CHECK=1`.

<p align="center"><picture><img src="docs/assets/readme/plugins.svg" alt="" width="240"></picture></p>

## Extensions

Install a package:

```sh
a1 install npm:pi-mcp-adapter
```

Remove it (alias: `a1 uninstall`):

```sh
a1 remove npm:pi-mcp-adapter
```

List installed packages:

```sh
a1 list
```

Update every installed package:

```sh
a1 update --extensions
```

Update one:

```sh
a1 update npm:pi-mcp-adapter
```

<p align="center"><picture><img src="docs/assets/readme/gears.svg" alt="" width="240"></picture></p>

## Develop

Install exact locked dependencies:

```sh
npm ci
```

Compile TypeScript and the process guardian into `dist`:

```sh
npm run build
```

Build and launch a source `a1`:

```sh
npm start
```

Build and launch a source `a1 pi`:

```sh
npm run start:pi
```

Typecheck + fast suite (alias: `npm test`):

```sh
npm run test:fast
```

Complete non-physical suite:

```sh
npm run test:full
```

Report Node, npm, git, Rust, and dependency readiness:

```sh
npm run doctor
```

Preview the README as GitHub renders it, in your browser (needs `gh`):

```sh
npm run preview:readme
```

<p align="center"><picture><img src="docs/assets/readme/rocket.svg" alt="" width="240"></picture></p>

## Publish

### Develop

Request the preview publish:

```sh
npm run develop
```

### Release

```sh
npm run release -- patch               # 0.1.8-dev -> 0.1.8
```

```sh
npm run release -- minor               # 0.1.8-dev -> 0.2.0
```

```sh
npm run release -- major               # 0.1.8-dev -> 1.0.0
```

```sh
npm run release -- 0.4.0               # prepare an exact stable version
```

Once validation passes, open the printed draft link, edit the `## [version] - YYYY-MM-DD` changelog, and press **Publish release** to publish to npm. Details: [release runbook](docs/ci-release-runbook.md).

<br>

<p align="center">
  <picture><img src="docs/assets/readme/waves.svg" alt="" width="100%"></picture>
</p>

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

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#launch">Launch</a> ·
  <a href="#update">Update</a> ·
  <a href="#extensions">Extensions</a> ·
  <a href="#develop">Develop</a> ·
  <a href="#publish">Publish</a>
</p>

## Install

Release:

```text
npm x -y -- @timurproko/a1-install
```

Develop:

```text
npm x -y -- @timurproko/a1-install --develop
```

Preview number:

```text
npm x -y -- @timurproko/a1-install --develop 107
```

Exact preview:

```text
npm x -y -- @timurproko/a1-install --develop 0.1.8-dev.107
```

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/separator-dark.svg"><img src="docs/assets/readme/separator.svg" alt="" width="280"></picture></p>

## Launch

Launch A1 (profile: `~/.a1/agent`):

```text
a1
```

Show all commands:

```text
a1 help
```

Show the current and latest versions:

```text
a1 version
```

Vanilla Pi oracle (`~/.pi/agent`):

```text
a1 pi
```

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/separator-dark.svg"><img src="docs/assets/readme/separator.svg" alt="" width="280"></picture></p>

## Update

Install the release:

```text
a1 update
```

Install develop:

```text
a1 update --develop
```

Install preview 107:

```text
a1 update --develop 107
```

Install that exact preview:

```text
a1 update --develop 0.1.8-dev.107
```

Refresh A1's model catalogs:

```text
a1 update --models
```

Stuck on `0.2.2` and `a1 update` fails? Run the installer once, then use `a1 update` as usual:

```text
npm x -y -- @timurproko/a1-install
```

A1 shows an `Update Available` notice at most once a day and never installs anything by itself. Turn it off in Settings (`Update check`) or with `A1_SKIP_VERSION_CHECK=1`.

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/separator-dark.svg"><img src="docs/assets/readme/separator.svg" alt="" width="280"></picture></p>

## Extensions

Install a package:

```text
a1 install npm:pi-mcp-adapter
```

Remove it (alias: `a1 uninstall`):

```text
a1 remove npm:pi-mcp-adapter
```

List installed packages:

```text
a1 list
```

Update every installed package:

```text
a1 update --extensions
```

Update one:

```text
a1 update npm:pi-mcp-adapter
```

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/separator-dark.svg"><img src="docs/assets/readme/separator.svg" alt="" width="280"></picture></p>

## Develop

Install exact locked dependencies:

```text
npm ci
```

Compile TypeScript and the process guardian into `dist`:

```text
npm run build
```

Build and launch a source `a1`:

```text
npm start
```

Build and launch a source `a1 pi`:

```text
npm run start:pi
```

Typecheck + fast suite (alias: `npm test`):

```text
npm run test:fast
```

Complete non-physical suite:

```text
npm run test:full
```

Report Node, npm, git, Rust, and dependency readiness:

```text
npm run doctor
```

Preview the README as GitHub renders it, in your browser (needs `gh`):

```text
npm run preview:readme
```

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/separator-dark.svg"><img src="docs/assets/readme/separator.svg" alt="" width="280"></picture></p>

## Publish

### Develop

Request the preview publish:

```text
npm run develop
```

### Release

```text
npm run release -- patch               # 0.1.8-dev -> 0.1.8
```

```text
npm run release -- minor               # 0.1.8-dev -> 0.2.0
```

```text
npm run release -- major               # 0.1.8-dev -> 1.0.0
```

```text
npm run release -- 0.4.0               # prepare an exact stable version
```

Once validation passes, open the printed draft link, edit the `## [version] - YYYY-MM-DD` changelog, and press **Publish release** to publish to npm. Details: [release runbook](docs/ci-release-runbook.md).

<br>

<p align="center">
  <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/waves-dark.svg"><img src="docs/assets/readme/waves.svg" alt="" width="100%"></picture>
</p>

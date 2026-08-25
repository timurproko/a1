# A1

## Install

```sh
npm install --global @timurproko/a1@latest
```

## Use

```sh
a1                      # launch A1 (profile: ~/.a1/agent)
a1 version              # show Installed, Release, and Develop versions
a1 update               # install the newest stable release
a1 update:develop       # install the current development preview
a1 update:107           # install numbered preview 107
a1 update --models      # refresh A1's model catalogs
```

Development previews add two extra profiles; release builds do not carry them.

```sh
a1 pi           # vanilla Pi oracle: ~/.pi/agent
a1 sandbox      # isolated vanilla Pi profile: ~/.a1/sandbox
```

## Extensions

Pi extension packages install into A1's own profile (`~/.a1/agent`), so bare `a1`
loads them and `a1 pi` / `a1 sandbox` do not. Sources are Pi's: `npm:`, git, or a
local path.

```sh
a1 pi install npm:pi-mcp-adapter   # install a package
a1 pi remove npm:pi-mcp-adapter    # remove it (alias: a1 pi uninstall)
a1 pi list                         # list installed packages
a1 pi update --extensions          # update every installed package
a1 pi update npm:pi-mcp-adapter    # update one
```

A running session picks up a newly installed package after a restart.
Configuration is isolated the same way: bare `a1` reads `~/.a1/agent` (or the
project), never `~/.pi/agent`. Configure MCP with `/mcp setup` inside bare `a1`.

## Develop

```sh
npm ci                  # install exact locked dependencies
npm run build           # compile TypeScript and the process guardian into dist
npm start               # build and launch a development `a1`
npm run start:pi        # build and launch a development `a1 pi`
npm run start:sandbox   # build and launch a development `a1 sandbox`
npm run test:fast       # typecheck + fast suite (alias: npm test)
npm run test:full       # complete non-physical suite
```

## Release

Two channels, both published by CI from the exact bytes it validated — never from
a workstation.

### Development previews

A preview is `<major.minor.patch>-dev.<pull-request number>`, e.g. `0.1.8-dev.107`.
The nightly run (`03:17 UTC`) verifies current `origin/develop` and publishes only
when that source's preview is absent. `npm run develop` requests the same GitHub
Actions run and waits for it. The published version list is authoritative: an
unpublished number is refused.

```sh
a1 update:107               # install preview 107
a1 update:0.1.8-dev.107     # install that exact full preview version
```

### Stable

```sh
npm run release -- patch     # 0.1.1 -> 0.1.2
npm run release -- minor     # 0.1.1 -> 0.2.0
npm run release -- major     # 0.1.1 -> 1.0.0
npm run release -- 0.4.0     # an exact version
```

The command lands the version on `develop` through a self-merging pull request,
dispatches publication for that exact commit, and waits for success. CI validates
the packed release on Windows, Linux, and macOS, publishes to npm `latest` with
provenance, then writes the `v<version>` tag and the GitHub Release. `master`
fast-forwards to the released commit, so it always points at what npm `latest`
serves. A failed release leaves nothing behind: no tag, no GitHub Release, no
moved branch.

`docs/ci-release-runbook.md` has the full picture.

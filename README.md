# A1

## Install

```sh
npm install --global @timurproko/a1@latest
```

## Commands

```sh
a1                      # A1-owned UI and profile: ~/.a1/agent
a1 version              # show Installed, Release, and Develop versions
a1 update               # update to the current release
a1 update:develop       # update to the current development preview
a1 update:107           # install numbered development preview 107
a1 update --models      # refresh A1's model catalogs
```

Prerelease builds — what `a1 update:develop` installs — add two development profiles
for comparing against pinned Pi and for experimenting against an isolated profile.
A release build does not carry them.

```sh
a1 pi           # untouched vanilla Pi oracle: ~/.pi/agent
a1 sandbox      # unchanged isolated vanilla Pi profile: ~/.a1/sandbox
```

## Extensions

Pi extension packages install into A1's own profile, so bare `a1` loads them and
`a1 pi` and `a1 sandbox` do not. Sources are Pi's: `npm:`, git, or a local path.

```sh
a1 pi install npm:pi-mcp-adapter   # install a package into ~/.a1/agent
a1 pi remove npm:pi-mcp-adapter    # remove it again (alias: a1 pi uninstall)
a1 pi list                         # list packages installed for a1
a1 pi update --extensions          # update every installed package
a1 pi update npm:pi-mcp-adapter    # update one of them
```

A running session loads a newly installed package after a restart. Pi's own
profile at `~/.pi/agent` is managed by Pi itself. Extension configuration is
isolated too: for example, MCP configuration for bare `a1` belongs under
`~/.a1/agent` (or the project), so `~/.pi/agent/mcp.json` is not read. Run
`/mcp setup` inside bare `a1` to configure it; the MCP footer status appears
when that A1 configuration contains a server.

## Develop

```sh
npm ci                  # install exact locked dependencies
npm run build           # compile TypeScript and the process guardian into dist
npm start               # build and launch an isolated development `a1`
npm run start:pi        # build and launch an isolated development `a1 pi`
npm run start:sandbox   # build and launch an isolated development `a1 sandbox`
npm run test:fast       # typecheck + fast suite, no build needed
npm test                # same as test:fast
npm run test:full       # complete non-physical suite
```

## Release

Two channels, both published by CI from the exact bytes it validated. Nothing is
ever published from a workstation.

### Development previews

Ordinary pushes to `develop` do not publish. The nightly run at `03:17 UTC` always
performs complete verification of current `origin/develop`; it publishes only when
that source's preview is absent. A maintainer can request the same authoritative
GitHub Actions path and wait for its result:

```sh
npm run develop
```

A preview is `<major.minor.patch>-dev.<pull-request number>`, stamped only into the
package. For example, the source GitHub presents as `develop (#107)` produces
`0.1.8-dev.107`. Repeating a request for immutable version 107 succeeds without
building or publishing again.

```sh
a1 update:develop       # install the current development preview
a1 update:107           # install preview 107
a1 update:0.1.8-dev.107 # install that exact full preview version
```

The published version list is authoritative: an unpublished number is refused
rather than guessed. npm's `next` dist-tag remains an internal registry detail.

### Stable — npm `latest`

One command, from a clean `develop` that matches its remote:

```sh
npm run release -- patch     # 0.1.1        -> 0.1.2
npm run release -- minor     # 0.1.1        -> 0.2.0
npm run release -- major     # 0.1.1        -> 1.0.0
npm run release -- 0.4.0     # an exact version
npm run develop              # develop
```

It lands the version on `develop` through a pull request that merges itself, then
explicitly dispatches publication for that exact commit. GitHub Actions builds,
validates the packed release on Windows, Linux, and macOS, publishes to npm
`latest` with provenance, and only then writes the `v<version>` tag and records the
GitHub Release. The command waits for success before opening the next `-dev` line.

```sh
a1 update        # install the newest stable release
```

After a stable publish, `master` fast-forwards to the released commit, so `master`
always points at what npm `latest` serves while `develop` carries the work.

A release that fails leaves nothing behind: no tag, no GitHub Release, no moved
branch. Every version you can see somewhere is a version the registry actually
serves. Release tags are protected from deletion and movement; a wrong tag is
superseded by the next version, never repointed.

`docs/ci-release-runbook.md` has the full picture, including what happens when a
publish fails partway.

# A1

## Install

```sh
npm install --global @timurproko/a1@latest
```

## Commands

```sh
a1              # A1-owned UI and profile: ~/.a1/agent
a1 version      # show Installed, Release (latest), and Next versions
a1 update       # update to npm latest
a1 update:next  # update to npm next
```

Prerelease builds — what `a1 update:next` installs — add two development profiles
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
a1 install npm:pi-mcp-adapter   # install a package into ~/.a1/agent
a1 remove npm:pi-mcp-adapter    # remove it again (alias: a1 uninstall)
a1 list                         # list packages installed for a1
a1 update --extensions          # update every installed package
a1 update npm:pi-mcp-adapter    # update one of them
a1 update --models              # refresh model catalogs
```

A running session loads a newly installed package after a restart. Pi's own
profile at `~/.pi/agent` is managed by Pi itself.

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

### Previews — npm `next`

Automatic. Every push to `develop` publishes one, versioned
`<major.minor.patch>-dev.<run number>` from whatever `package.json` declares. The
preview version is stamped at publish time and never committed, so previews cost no
commits and need no command.

```sh
a1 update:next   # install the newest preview
```

### Stable — npm `latest`

One command, from a clean `develop` that matches its remote:

```sh
npm run release -- patch     # 0.1.1        -> 0.1.2
npm run release -- minor     # 0.1.1        -> 0.2.0
npm run release -- major     # 0.1.1        -> 1.0.0
npm run release -- 0.4.0     # an exact version
```

It lands the version on `develop` through a pull request that merges itself, tags
that commit `v<version>`, and pushes the tag. **Pushing the tag is what publishes** —
the workflow builds, validates the packed release on Windows, Linux, and macOS,
publishes to npm `latest` with provenance, and records the GitHub Release. The
command then lands the next `-dev.0` version so previews resume immediately.

```sh
a1 update        # install the newest stable release
```

Between a version landing and its tag being pushed, `develop` declares a stable
version and no preview is published — a `-dev.N` published then would rank below the
release. Release tags are protected from deletion and movement; a wrong tag is
superseded by the next version, never repointed.

`docs/ci-release-runbook.md` has the full picture, including what happens when a
publish fails partway.

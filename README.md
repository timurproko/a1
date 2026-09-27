# A1

## Install

```sh
# stable release
npx -y @timurproko/a1-install

# development channel
npx -y @timurproko/a1-install --develop

# exact development version
npx -y @timurproko/a1-install --version 0.1.8-dev.107
```

The installer keeps npm's dependency transcript out of the normal terminal output,
shows one progress row, activates the installed release, and verifies the command
before reporting success. The shorter `npx @timurproko/a1-install` form also works,
but npm may ask for first-use confirmation; `-y` avoids that prompt.

Direct npm installation remains available as a fallback or manual recovery path:

```sh
npm install -g @timurproko/a1@latest
npm install -g @timurproko/a1@next
npm install -g @timurproko/a1@0.1.8-dev.107
```

## Use

```sh
a1                                      # launch A1 (profile: ~/.a1/agent)
a1 help                                 # show all commands
a1 version                              # show the version
a1 update                               # install the newest stable release
a1 update --develop                     # install the current development preview
a1 update --develop 107                 # install numbered preview 107
a1 update --develop 0.1.8-dev.107       # install that exact preview
a1 update --models                      # refresh A1's model catalogs
a1 update --extensions                  # update every installed package
a1 update npm:pi-mcp-adapter            # update one package
```

Stable builds print only their installed version. Development builds also show the
current development and stable channel versions.

Development previews add the Pi comparison profile; release builds do not carry it.

```sh
a1 pi                                   # vanilla Pi oracle: ~/.pi/agent
```

Unsupported commands exit quietly without launching anything. The removed
`update:<preview>` forms are not aliases; use `update --develop`.

## Extensions

Pi-compatible extension packages install into A1's own profile (`~/.a1/agent`), so
bare `a1` loads them and the `a1 pi` comparison profile does not. Sources use Pi's
`npm:`, git, or local-path grammar.

```sh
a1 install npm:pi-mcp-adapter      # install a package
a1 remove npm:pi-mcp-adapter       # remove it (alias: a1 uninstall)
a1 list                            # list installed packages
a1 update --extensions             # update every installed package
a1 update npm:pi-mcp-adapter       # update one
a1 update --models                 # refresh A1's model catalogs
```

A1 pins the Pi runtime carried by each release, so Pi self-update forms are refused.
Update A1 itself with `a1 update` or `a1 update --develop`.

A running session picks up a newly installed package after a restart.
Configuration is isolated the same way: bare `a1` reads `~/.a1/agent` (or the
project), never `~/.pi/agent`. Configure MCP with `/mcp setup` inside bare `a1`.

## Develop

A source build needs Node.js `>=22.19.0 <25`, npm 11, git, and Rust/Cargo 1.85 or
newer—the build compiles the `native/process-guardian` crate. Publishing a release
or a pull request additionally needs an authenticated [GitHub CLI](https://cli.github.com).
`npm run doctor` reports every prerequisite with the exact command that installs
whatever is missing, and `npm run build` runs the same check first so a fresh clone
fails by name instead of inside a resolver or Cargo.

```sh
npm run doctor          # report Node, npm, git, Rust, and dependency readiness
npm ci                  # install exact locked dependencies
npm run build           # compile TypeScript and the process guardian into dist
npm start               # build and launch a development `a1`
npm run start:pi        # build and launch a development `a1 pi`
npm run test:fast       # typecheck + fast suite (alias: npm test)
npm run test:full       # complete non-physical suite
```

Create every task worktree at `{working-dir}/.worktrees/<task-id>`, where
`{working-dir}` is the session's initial working directory. For working directory
`D:/Git/a1`, use `D:/Git/a1/.worktrees/<task-id>`—never a sibling such as
`D:/Git/a1-<task-id>`. The primary worktree remains on `develop` for integration only.

## Release

Two channels, both published by CI from the exact bytes it validated — never from
a workstation.

### Development previews

A preview is `<major.minor.patch>-dev.<pull-request number>`, e.g. `0.1.8-dev.107`.
The nightly run (`03:17 UTC`) verifies current `origin/develop` and publishes only
when that source's preview is absent. `npm run develop` requests the same GitHub
Actions run and waits for it. The published version list is authoritative: an
unpublished number is refused.

Publish:

```sh
npm run develop             # request the preview publish run and wait for it
```

Install:

```sh
a1 update --develop 107                 # install preview 107
a1 update --develop 0.1.8-dev.107       # install that exact full preview version
```

### Stable

```sh
npm run release -- patch     # 0.1.8-dev -> 0.1.8
npm run release -- minor     # 0.1.8-dev -> 0.2.0
npm run release -- major     # 0.1.8-dev -> 1.0.0
npm run release -- 0.4.0     # an exact stable version
```

Run from the repository root on a clean `develop` matching `origin/develop` that
declares the open `-dev` version. A target is required; bare `npm run release`
displays usage and releases nothing. `patch` promotes the current prerelease rather
than skipping its stable version.

The stable version is never committed. The command dispatches publication for the
exact authoritative `develop` commit with the stable version named in the request,
and waits for success. CI stamps that version on the checked-out source before
packing, validates the packed release on Windows, Linux, and macOS, publishes to
npm `latest` with provenance, then writes the `v<version>` tag on that same
`develop` commit, records the GitHub Release, and fast-forwards `master`.

Only after confirmed publication of `0.1.8` does the command prepare the one
version-only PR, `0.1.9-dev`, in an isolated detached worktree, print its URL, and
wait for you to **merge it manually**. It is not auto-merged, and green CI alone does
not advance the release. Work added to your checkout during the wait is preserved,
not reset. If publication fails or is uncertain, no reopening PR is prepared. If
publication succeeded but reopening failed, merge or repair the reported PR by
hand; do not republish the immutable stable version.

`docs/ci-release-runbook.md` has the full picture.

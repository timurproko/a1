# A1

## Install

```sh
npm install --global @timurproko/a1@latest
```

Any channel can also be installed or updated directly with npm, without the
`a1 update` commands:

```sh
# dev channel (next tag)
npm install -g @timurproko/a1@next

# stable release
npm install -g @timurproko/a1@latest

# exact version
npm install -g @timurproko/a1@0.1.8-dev.107
```

## Use

```sh
a1                                      # launch A1 (profile: ~/.a1/agent)
a1 --help                               # show all commands (short form: a1 -h)
a1 --version                            # show the version (short form: a1 -v)
a1 update                               # install the newest stable release
a1 update --develop                     # install the current development preview
a1 update --develop 107                 # install numbered preview 107
a1 update --develop 0.1.8-dev.107       # install that exact preview
a1 update --models                      # refresh A1's model catalogs
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

Pi extension packages install into A1's own profile (`~/.a1/agent`), so bare `a1`
loads them and `a1 pi` does not. Sources are Pi's: `npm:`, git, or a
local path.

```sh
a1 pi install npm:pi-mcp-adapter   # install a package
a1 pi remove npm:pi-mcp-adapter    # remove it (alias: a1 pi uninstall)
a1 pi list                         # list installed packages
a1 pi update --extensions          # update every installed package
a1 pi update npm:pi-mcp-adapter    # update one
a1 pi update --models              # refresh A1's model catalogs
```

A1 pins the Pi runtime carried by each release, so Pi self-update forms are refused.
Update A1 itself with `a1 update` or `a1 update --develop`.

A running session picks up a newly installed package after a restart.
Configuration is isolated the same way: bare `a1` reads `~/.a1/agent` (or the
project), never `~/.pi/agent`. Configure MCP with `/mcp setup` inside bare `a1`.

## Develop

```sh
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

## Pull request integration

Pull requests whose complete diff is only under `openspec/**`, under `docs/**`,
exactly the root `README.md`, or a combination of those paths are automatically
squash-merged after `Development validation required` succeeds. The automation
reads the complete GitHub changed-file list, including both sides of renames, and
runs only for trusted branches in this repository.

Any other path makes the pull request code/operational. That includes source, tests,
scripts, workflows, configuration, generated baselines, arbitrary root Markdown,
and a mixed documentation-plus-code change. Those pull requests remain open after
CI for local maintainer validation and explicit manual merge; automation disables
auto-merge if it was armed. Documentation remains exempt from product builds and
tests, but docs-sensitive generated governance and strict OpenSpec consistency are
checked before integration.

After any same-repository pull request into `develop` merges, trusted automation
reconciles its remote topic branch. Human merges use the close-event workflow;
documentation merges authored by `GITHUB_TOKEN` use a synchronous fallback because
GitHub suppresses recursive workflow events. Both delete only an unprotected live
ref that still equals the pull request's exact merged head SHA. Fork, advanced,
reserved, protected, malformed, and unmerged refs are preserved and reported.

Specification approval and implementation remain separate pull requests. An
implementation starts from updated `origin/develop` only after its specification
has merged and implementation was explicitly requested.

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

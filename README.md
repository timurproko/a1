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

The installer needs Node.js 22.19 or later. When npm's global folder is not writable, as with the nodejs.org installer on macOS, it installs under `~/.local` and adds `~/.local/bin` to your shell's PATH; open a new terminal to use `a1`.

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/separator-dark.svg"><img src="docs/assets/readme/separator.svg" alt="" width="280"></picture></p>

## Launch

Launch A1, one agent in this terminal (profile: `~/.a1/agent`):

```text
a1
```

In A1, **Ctrl+P** opens the searchable **Launcher**: Agent, Settings, Changelog, and Hotkeys. You can switch from any of those screens; returning to Agent keeps the current session and draft. Settings, Changelog, and Hotkeys are applications rather than Agent slash commands.

**Ctrl+M** cycles to the next model: all available models when no scope is set, or only available scoped models when a scope exists. **`/models`** opens the in-place Models selector to select a model or manage that scope. **Ctrl+L** cycles thinking levels, and **Alt+Up** restores queued messages. In legacy terminals that encode Ctrl+M as Enter, ordinary Enter still sends the prompt; use `/models` to select a model instead. Explicit keybinding overrides remain supported. Successful model changes update the status bar without an extra success message; errors and warnings remain visible.

Session exports without an explicit destination are saved in **`~/.a1/exports/`**, outside disposable worktrees. Use `/export` for HTML or `/export --jsonl` for JSONL; explicit destinations retain their existing meaning. See [session exports](docs/features/session-exports.md).

Resume a saved session:

```text
a1 --session <id>
```

When a session exits, A1 prints the `a1 --session <id>` command that resumes it; a custom session store is included in the printed command. Closing the terminal ends the agent, as it does for Pi.

If a saved session's folder was moved or deleted, recovery offers **Continue**, **Fork**, or **Cancel**. Continue uses the current folder for this run and asks again on the next resume. Fork keeps the original and creates a new session ID in the current folder, so later resumes no longer ask. This also applies to session import and extension-triggered switching.

Bare A1 automatically names unnamed sessions from the current task and relevant discussion, using up to three descriptive words and 32 characters, and regenerates on the next prompt after a worktree-context change. Manual `/name` renames are preserved. Names appear after footer stats, with a secondary-accent reveal for automatic changes; narrow footers reduce stats before shortening the name. Agent settings offers **Session name format** with Sentence case (default, first choice), Kebab case, and Title Case for future generated names, or **Automatic session name** to disable naming. Valid saved formats are preserved; see [session names](docs/features/session-naming.md) for details.

Inside an A1 agent session, `a1 worktree enter <branch>` creates or resumes a task checkout and attaches it. `a1 worktree attach <path>` attaches an existing checkout; `a1 worktree detach` releases it without deleting work. A1 handles coordination and ordinary recovery internally; successful attachment needs no second inventory check. See [worktree commands](docs/features/worktrees.md).

Show all commands:

```text
a1 help
```

Show the current version and the latest Develop and Release versions, from either installed channel:

```text
a1 version
```

Vanilla Pi oracle (`~/.pi/agent`):

```text
a1 pi
```

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/separator-dark.svg"><img src="docs/assets/readme/separator.svg" alt="" width="280"></picture></p>

## Session colors

Settings → Appearance separates a saved **Default color** (initially blue) from **Current color**, which affects only this session. Both offer blue, green, orange, pink, purple, cyan, and grey. `a1 --session-color green` overrides initialization before the first startup/trust/editor frame without saving a setting. Successful session replacements retain that invocation policy; live Current edits do not change it.

External hosts discover support with `a1 session color capabilities` and control one targeted runtime through the [always-JSON local color API](docs/features/session-colors.md). Inside Herdr Core, bare A1 automatically reports complete native session/runtime identity with bounded heartbeat and ownership-safe cleanup. Local and SSH machines need only Core, A1, and normal Node—not App or companion setup. Supported launches from a known Herdr space can receive its color before first paint; manual and new-space launches retain subsequent live matching rather than a promised startup handshake.

## Update

Update on the channel you already use (release stays on release, develop stays on develop):

```text
a1 update
```

Switch to the release:

```text
a1 update --release
```

Switch to develop:

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

The **Update** setting controls release discovery:

- **Auto** (default) checks the running release's stable or development channel at startup and every 15 minutes while open. It silently installs a verified update, then shows `Update installed, restart to update` above the editor; existing sessions keep running on their release, and the next `a1` starts the new one.
- **No** performs no update check; updates remain available through the commands above.

`A1_SKIP_VERSION_CHECK=1` disables Auto discovery. Manual stable, development, and exact-version update commands remain available in every mode.

<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/separator-dark.svg"><img src="docs/assets/readme/separator.svg" alt="" width="280"></picture></p>

## Uninstall

Remove A1 from this machine. It asks before deleting your sessions and settings in `~/.a1`:

```text
a1 uninstall
```

Remove everything without questions:

```text
a1 uninstall --yes --purge
```

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

A source build needs Node.js, npm, and git. The product is pure TypeScript; there is no native toolchain to install.

Install exact locked dependencies:

```text
npm ci
```

Compile TypeScript into `dist`:

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

Report Node, npm, git, GitHub CLI, and dependency readiness; after fixing anything it lists, rerun the same build command:

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

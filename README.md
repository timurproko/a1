# AddOne

AddOne is a standalone terminal workspace. Milestone 1 launches one supervisor-owned vanilla Native Pi instance immediately and gives it the complete terminal viewport with native terminal behavior.

## Requirements

- Node.js 22.19+ or 24.x
- A supported UTF-8 terminal (Windows Terminal/ConPTY, xterm-compatible Linux terminal, or macOS terminal)
- A `pi` executable on `PATH` for normal Native Pi use
- Native build prerequisites only if npm cannot obtain a prebuilt `node-pty` binary

The exact platform and dependency contract is in [`docs/architecture/toolchain.md`](docs/architecture/toolchain.md).

## Install or link

Install the public package globally with npm:

```sh
npm install --global @timurproko/addone@latest
```

For a development checkout instead:

```sh
npm ci
npm run build
npm link
```

Then launch from the workspace in which Native Pi should run. Both commands invoke the same application:

```sh
addone
# or
a1
```

For fast repository-local development without publishing, linking, globally installing, or stopping an installed AddOne supervisor:

```sh
npm start
```

`npm start` builds the checkout and creates an independent development instance for that invocation. Each simultaneous launch receives its own UI, supervisor, Native Pi process, database, runtime endpoint, and immutable release state, isolated from globally installed, older-development, and other concurrent instances. Set the same explicit `ADDONE_DEV_INSTANCE_ID` in multiple invocations only when intentional reconnection to one development instance is desired. Explicit `ADDONE_CONFIG_DIR`, `ADDONE_DATA_DIR`, `ADDONE_RUNTIME_DIR`, `ADDONE_DATABASE_PATH`, or `ADDONE_DEV_ROOT` values still override the generated instance paths.

## Update

Both public aliases provide the same non-interactive self-update:

```sh
addone update
# or
a1 update
```

The command asks the configured npm registry for `@timurproko/addone@latest`, compares it with the running AddOne version, and installs that exact newer version globally. It does not opt a stable installation into development previews. To install or update to the Windows-tested preview channel explicitly, run:

```sh
npm install --global @timurproko/addone@next
```

The updater needs network access to the configured registry and permission to write npm's global package root. npm's proxy, authentication, certificate, registry, and global-prefix settings remain authoritative, and npm diagnostics are streamed to the terminal.

Automatic replacement is limited to an AddOne package canonically contained in the active npm installation's global package root. A repository checkout, `npm link`, or another package manager's installation is refused without modification; use the manual npm command printed by AddOne if replacement is intentional. An already-current or newer running version is left unchanged.

Updating does not overwrite code used by a resident cohort. The next launch materializes the candidate under AddOne's immutable release store. If an older supervisor owns a live non-resumable PTY, AddOne launches that supervisor's retained matching UI and keeps activation pending; activation completes after the blocker exits. An idle cohort is replaced only after certification and verified ownership release. To request a package-level rollback manually, globally install an explicit published version, for example:

```sh
npm install --global @timurproko/addone@0.1.1
```

## Milestone 1 interaction

AddOne launches plain `pi` immediately in its default interactive mode and projects its first ready frame over the complete viewport; it displays no AddOne intro and does not force Pi's alternate fullscreen interaction mode. This iteration has no tabs, `[ + ]` control, status line, focus switch, or AddOne keyboard shortcuts.

Native Pi receives all terminal input exactly as it would when launched directly, including:

- Pi keyboard shortcuts, Up/Down editor-history navigation, and repeated Ctrl+C clear/exit
- UTF-8 input and escape sequences
- bracketed paste and focus reports requested by Pi
- vanilla host-native text selection, including Ctrl+C dismissing the selection without clearing Pi editor text and no false `Copied!` augmentation
- native normal-screen scrollbar and scrollback in vanilla mode, including three-row-per-notch scrolling and selections that move with generated content
- atomic generated-text, footer/status, scroll, and cursor frames without timer-driven flicker
- mouse buttons, movement, and Pi-owned transcript scrolling when Pi explicitly requests mouse tracking
- the complete outer terminal dimensions on resize

Native Pi controls its virtual colors, text attributes, cursor, alternate screen, and effective input modes. AddOne terminates those protocols in its resident virtual terminal and remains the exclusive owner of the physical screen and input modes. When Pi exits or crashes, AddOne discards child modes and restores the exact input and cursor state. Vanilla default-mode Pi leaves its normal-screen content, scrollback, final cursor position, and child-produced line spacing visible like direct Pi; AddOne does not append a restoration newline. Explicitly fullscreen profiles restore the normal-screen content that preceded launch. AddOne exits with Pi's outcome without printing control messages. If an AddOne UI process is terminated externally while the supervisor and Pi remain alive, running `addone` again reattaches using the resident styled terminal state.

## Deterministic walking-skeleton gate

The gate launches the real `addone` CLI in an outer PTY and starts a deterministic executable named `pi` through the real supervisor-owned child PTY. It uses no model, credentials, or network access.

```sh
npm run test:scenario
```

The scenario compares the same deterministic fixture launched directly and through AddOne. It covers immediate launch with no AddOne intro, direct first-frame handoff, absence of shell chrome, truecolor/indexed color and attribute parity, Unicode cells, physical-equivalent wheel scrolling versus explicit Up/Down history input, repeated Ctrl+C and crash restoration over known pre-launch content, UTF-8, bracketed paste, focus and mouse input, terminal queries, synchronized output, full-viewport resize, virtual alternate-screen restoration, resident-state reconnect, and functional parent-shell editing after exit.

This deterministic simulation is mandatory and runs before packaged-real-Pi validation. A failing simulation blocks release testing and manual user acceptance.

Every failed run prints its isolated artifact directory. The bundle contains:

- `scenario.json`, `environment.json`, and `input-timeline.json`
- named `frames.json` and `final-surface.txt`
- `supervisor-events.json`
- `outer.log`, `supervisor.log`, and `child.log`
- `assertions.json` and `failure-summary.txt`

Each run uses a temporary home, config directory, database, runtime/socket namespace, workspace, fixture-first `PATH`, and artifact directory. The temporary root is intentionally retained after a failure for inspection.

## Packaged release and update-transition gates

The release workflow first runs the deterministic simulation above, then packs AddOne, installs the tarball into a temporary prefix, injects one exactly identified Pi executable, and compares that same vanilla Pi default TUI directly and through immutable packaged AddOne content. It verifies recognizable editor readiness, host-native selection and selection-aware Ctrl+C, absence of false copy UI, bounded per-key latency, typed and pasted content, focus handling, the native settings dialog, three-row physical wheel scrolling versus explicit Up-key history, normal and repeated-Ctrl+C quit flows, restoration of the default parent cursor and input state, absence of visible control reports, cells/styles/cursor/effective modes, and process/release identity without model access. A hermetic public-API Pi extension gate additionally compares a custom component, editor input, theme, overlay/dialog, mouse interaction, and extension-requested shutdown. A separate N−1 matrix covers idle and busy owners, stale metadata, bounded cleanup, failed candidates, pending activation, rollback, and duplicate-owner prevention.

Set `ADDONE_REAL_PI_EXECUTABLE` to the exact Pi executable when `pi` is not discoverable on `PATH`, then run the complete agent validation command:

```sh
npm run validate:agent
```

PowerShell example:

```powershell
$env:ADDONE_REAL_PI_EXECUTABLE = (Get-Command pi).Source
npm run validate:agent
```

Failures retain machine-readable `verdict.json`, package/runtime identities, endpoint and process inventory, frames, terminal output, logs, and assertion details in the printed temporary artifact directory. Synthetic fixture parity remains a separate transport oracle and is not treated as proof of real Pi readiness.

## Optional installed-Pi smoke

This is non-gating. It removes the fixture directory from `PATH`, uses isolated Pi/AddOne configuration, automatically starts installed Native Pi in its default interaction mode over AddOne's complete viewport, checks that prototype chrome is absent, and sends no prompt or model request. Use it manually to inspect your installed Pi theme, shortcuts, mouse-wheel scrolling, resize behavior, and exit cleanup through AddOne.

```sh
ADDONE_NATIVE_PI_SMOKE=1 npm run test:smoke:native-pi
```

On PowerShell:

```powershell
$env:ADDONE_NATIVE_PI_SMOKE = "1"
npm run test:smoke:native-pi
```

## Development checks

```sh
npm run check:architecture
npm run check:deprecated
npm test
npm run validate:agent
```

`npm run validate:agent` (and `npm run check`) includes the zero-deprecated-dependency policy, deterministic PTY parity, packaged real-Pi parity, representative Native Pi extension parity, and N−1 update-transition gates. `npm pack` and publishing run the same checks; only the release harness's explicitly marked inner package operation bypasses recursive prepack execution. Every run writes a machine-readable platform verdict under `artifacts/release-verdicts/`. The mandatory CI matrix is Windows 11 x64 with Windows Terminal/system ConPTY, current Ubuntu LTS x64, and current/previous macOS arm64; a failure on any required runner blocks parity claims. The architecture check prevents Pi, PTY, TUI, private-distribution, raw-child-output, process-global, and UI-spawn boundary regressions.

# AddOne

AddOne is a standalone terminal workspace. Milestone 1 owns an outer shell and supervises vanilla Native Pi in child PTYs; the UI can restart without stopping a resident child.

## Requirements

- Node.js 22.19+ or 24.x
- A supported UTF-8 terminal (Windows Terminal/ConPTY, xterm-compatible Linux terminal, or macOS terminal)
- A `pi` executable on `PATH` for normal Native Pi use
- Native build prerequisites only if npm cannot obtain a prebuilt `node-pty` or `better-sqlite3` binary

The exact platform and dependency contract is in [`docs/architecture/toolchain.md`](docs/architecture/toolchain.md).

## Install or link

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

For repository-local development without linking:

```sh
npm start
```

## Milestone 1 controls

| Input | Action |
|---|---|
| `Enter` or `Space` while AddOne chrome is focused | Activate the always-visible `+` and create/select Native Pi |
| Mouse click on `[ + ]` | Create/select Native Pi; the click is consumed by AddOne |
| `Ctrl+N` | Global create-Native-Pi shortcut |
| `Tab` | Switch focus between AddOne chrome and the selected Native Pi terminal |
| Other keyboard input or bracketed paste while terminal is focused | Forward original bytes to Native Pi |
| `Ctrl+C` | Close only this AddOne UI client; the supervisor and resident agents remain alive |

The status line says whether chrome or terminal input is active. Restart `addone` with the same runtime directory to reattach to the supervisor and its resident surface. Child exit does not close AddOne; its final surface and exit status remain visible.

## Deterministic walking-skeleton gate

The gate launches the real `addone` CLI in an outer PTY and starts a deterministic executable named `pi` through the real supervisor-owned child PTY. It uses no model, credentials, or network access.

```sh
npm run test:scenario
```

The scenario covers the completed intro, reachable `+`, keyboard and mouse creation, child input, resize, exit/final-surface retention, continued shell operation, and UI-only restart with resident-surface restoration.

Every failed run prints its isolated artifact directory. The bundle contains:

- `scenario.json`, `environment.json`, and `input-timeline.json`
- named `frames.json` and `final-surface.txt`
- `supervisor-events.json`
- `outer.log`, `supervisor.log`, and `child.log`
- `assertions.json` and `failure-summary.txt`

Each run uses a temporary home, config directory, database, runtime/socket namespace, workspace, fixture-first `PATH`, and artifact directory. The temporary root is intentionally retained after a failure for inspection.

## Optional installed-Pi smoke

This is non-gating. It removes the fixture directory from `PATH`, uses isolated Pi/AddOne configuration, starts installed Native Pi, and sends no prompt or model request.

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
npm test
npm run check
```

`npm run check` includes the release-gating PTY scenario. The architecture check prevents Pi, PTY, TUI, private-distribution, process-global, and UI-spawn boundary regressions.

# AddOne terminal-redesign toolchain contract

Recorded: 2026-08-13. Versions are exact in `package-lock.json`.

## Supported matrix

| Component | Supported |
|---|---|
| Node.js | 22.19+ LTS and 24.x, below 25 |
| Windows | Windows 11 x64 with native Windows Terminal/process facilities |
| Linux | Current Ubuntu LTS x64 with a native UTF-8 terminal |
| macOS | Current and previous macOS arm64 with a native UTF-8 terminal |

AddOne remains a terminal application. Browser and desktop-GUI substitutes are outside the product contract.

## Cleanup baseline

- TypeScript 5.9.2, strict native ESM, `NodeNext`, ES2023 output.
- npm 11 with lockfile v3.
- `node:sqlite` `DatabaseSync` in WAL mode for control state.
- `cross-spawn` 7.0.6 and `semver` 7.8.5 for package/update workflows.
- No production PTY, terminal emulator, semantic input relay, or TUI dependency exists in transparent mode.
- `addone` launches the manually accepted transparent foreground capability; `version`, `update`, release selection, storage, and update-transition validation remain functional.
- An exact manually accepted `-dev.N` candidate may publish under npm tag `next` with physical-host and cross-platform certification explicitly deferred. It is not stable-release eligible and cannot move `latest`.

The retired `node-pty`, `@xterm/headless`, custom Win32/VT input, mode/query parsing, cell reconstruction, and PTY simulation stack is removed rather than retained as a fallback.

## Replacement rule

Transparent capability uses native attached terminal/process facilities on Windows, Linux, and macOS with no ordinary AddOne input/output byte path. Any future composed capability must use one independently certified authoritative terminal core and may not reintroduce per-application hacks.

## Packaging

The package contains `addone`, `a1`, and the internal supervisor executable. Packaging runs architecture-independent type, architecture, dependency, unit, release/update, structural transparent, and exact-artifact checks. Uncertified `next` evidence records physical-host and cross-platform terminal verdicts as deferred; stable terminal publication requires those independent verdicts to pass.

## Directories

Paths remain overrideable for hermetic execution.

| Purpose | Override | Windows default | Unix default |
|---|---|---|---|
| Config | `ADDONE_CONFIG_DIR` | `%APPDATA%\\AddOne` | `$XDG_CONFIG_HOME/addone` or `~/.config/addone` |
| Durable data/database | `ADDONE_DATA_DIR` | `%LOCALAPPDATA%\\AddOne` | `$XDG_DATA_HOME/addone` or `~/.local/share/addone` |
| Runtime/socket/PID/logs | `ADDONE_RUNTIME_DIR` | `%LOCALAPPDATA%\\AddOne\\runtime` | `$XDG_RUNTIME_DIR/addone` or `<data>/runtime` |
| Database file | `ADDONE_DATABASE_PATH` | `<data>/control.sqlite3` | `<data>/control.sqlite3` |
| Supervisor endpoint | `ADDONE_ENDPOINT` | per-runtime-dir named pipe | `<runtime>/supervisor.sock` |

Herdr remains AGPL architectural prior art only; no implementation is copied.

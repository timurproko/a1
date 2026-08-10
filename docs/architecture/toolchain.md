# AddOne Milestone 1 toolchain and platform contract

Recorded: 2026-08-10. Versions are exact in `package-lock.json`.

## Supported matrix

| Component | Supported |
|---|---|
| Node.js | 22.19+ LTS and 24.x, below 25 |
| Windows | Windows 11 x64, Windows Terminal/ConPTY |
| Linux | Current Ubuntu LTS x64 with a UTF-8, xterm-compatible terminal |
| macOS | Current and previous macOS arm64 with a UTF-8, xterm-compatible terminal |

Node 22.19 is the floor required by the pinned TUI. Other architectures and Windows 10 may work but are not release-gated in Milestone 1.

## Language and packages

- TypeScript 5.9.2, strict mode, native ESM, `NodeNext` resolution, ES2023 output.
- npm 11 and npm lockfile v3. The repository is one publishable package with explicit source boundaries under `src/`; boundaries are checked as architecture, not coupled through npm package build output.
- AddOne presentation toolkit: `@earendil-works/pi-tui` **0.84.1**. It is an AddOne-owned presentation dependency and is unrelated to a child Pi version.
- Child PTY: `node-pty` **1.1.0** (ConPTY on Windows; native PTY on Unix).
- Terminal emulation: `@xterm/headless` **6.0.0**. Only normalized bounded cells/cursor leave the terminal adapter.
- Control store: `better-sqlite3` **12.4.1**, SQLite WAL mode. It supports the selected Node lines and distributes common-platform native binaries; CI must test installation for each release target.

## Packaging

Milestone 1 ships as an npm CLI package with `addone` and the internal `addone-supervisor` executable. `npm pack` is the packaging acceptance path. Native dependencies remain ordinary npm dependencies; packaged-install CI is responsible for proving prebuild availability. A future single-binary bundle must preserve the driver/storage boundaries and is not part of this milestone.

## Directories

Paths can always be overridden for hermetic execution.

| Purpose | Override | Windows default | Unix default |
|---|---|---|---|
| Config | `ADDONE_CONFIG_DIR` | `%APPDATA%\\AddOne` | `$XDG_CONFIG_HOME/addone` or `~/.config/addone` |
| Durable data/database | `ADDONE_DATA_DIR` | `%LOCALAPPDATA%\\AddOne` | `$XDG_DATA_HOME/addone` or `~/.local/share/addone` |
| Runtime/socket/PID/logs | `ADDONE_RUNTIME_DIR` | `%LOCALAPPDATA%\\AddOne\\runtime` | `$XDG_RUNTIME_DIR/addone` or `<data>/runtime` |
| Database file | `ADDONE_DATABASE_PATH` | `<data>/control.sqlite3` | `<data>/control.sqlite3` |
| Supervisor endpoint | `ADDONE_ENDPOINT` | per-runtime-dir named pipe | `<runtime>/supervisor.sock` |

Directories are created with user-only permissions where the platform supports POSIX modes. Runtime endpoint names are scoped by the canonical runtime directory so independent tests cannot discover each other.

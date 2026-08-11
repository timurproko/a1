# AddOne Milestone 1 toolchain and platform contract

Recorded: 2026-08-10. Versions are exact in `package-lock.json`.

## Supported matrix

| Component | Supported |
|---|---|
| Node.js | 22.19+ LTS and 24.x, below 25 |
| Windows | Windows 11 x64, Windows Terminal/ConPTY |
| Linux | Current Ubuntu LTS x64 with a UTF-8, xterm-compatible terminal |
| macOS | Current and previous macOS arm64 with a UTF-8, xterm-compatible terminal |

Node 22.19 is the floor required by the pinned TUI and guarantees the selected built-in SQLite API is available. Other architectures and Windows 10 may work but are not release-gated in Milestone 1.

## Language and packages

- TypeScript 5.9.2, strict mode, native ESM, `NodeNext` resolution, ES2023 output.
- npm 11 and npm lockfile v3. The repository is one publishable package with explicit source boundaries under `src/`; boundaries are checked as architecture, not coupled through npm package build output.
- AddOne presentation toolkit: `@earendil-works/pi-tui` **0.84.1**. It is an AddOne-owned presentation dependency and is unrelated to a child Pi version.
- Child PTY: `node-pty` **1.1.0** (ConPTY on Windows; native PTY on Unix).
- Terminal emulation: `@xterm/headless` **6.0.0**. Every child output byte terminates here; only correlated normalized snapshots/damage, cursor, and effective modes leave the terminal adapter.
- Host terminal: AddOne-owned semantic input and damage rendering adapters. Windows captures/restores exact console modes and supports native `ReadConsoleInputW` records with VTI fallback; Linux/macOS use framed raw input. Child alternate-screen, mouse, keyboard, paste, focus, cursor, synchronized-output, title, clipboard, and Win32 mode requests never pass through to the physical terminal.
- Self-update process compatibility and version comparison: `cross-spawn` **7.0.6** and `semver` **7.8.5**. The updater uses `cross-spawn` for Windows npm shims and native Node spawning on Unix.
- Control store: Node's built-in `node:sqlite` `DatabaseSync`, SQLite WAL mode. No third-party SQLite package or native database addon is installed.

## Packaging

Milestone 1 ships as an npm CLI package with `addone`, its `a1` alias, and the internal `addone-supervisor` executable. `addone update` and `a1 update` use the configured npm registry and global prefix, require registry/network access plus global-prefix write permission, and only replace a canonical npm-managed global installation. They do not restart resident supervisors or agents; rollback is an explicit `npm install --global @timurproko/addone@VERSION`. `npm pack` is the packaging acceptance path. Normal packaging and publishing run the complete deterministic, packaged real-Pi, representative extension, N−1 transition, architecture, unit, and dependency gates. The packaged-candidate harness marks only its inner recursive pack so that prepack does not recursively invoke itself. `npm run check:deprecated` inspects the exact lockfile and live registry metadata for every production, development, build, test, and optional package; `prepack` and `prepublishOnly` block packaging or publishing on any failed mandatory gate or deprecated direct or transitive dependency. `node-pty` remains the only native runtime dependency, and packaged-install CI is responsible for proving its supported-platform installation. A future single-binary bundle must preserve the driver/storage boundaries and is not part of this milestone.

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

## Terminal-host prior art

AddOne's terminal ownership pattern was informed by Herdr: resident virtual terminals, semantic host input, mode-aware child encoding, and separate Windows/Unix adapters. Herdr is AGPL-3.0 architectural prior art only. AddOne contains no copied Herdr implementation and remains governed by this repository's own contracts, tests, and MIT license.

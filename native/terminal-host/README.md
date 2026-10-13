# A1 terminal host

This Cargo package provides the native resident-tab host and the feature-gated Node-API session-writer lock. The terminal byte path stays native: Node starts or attaches to the host and exchanges only tab metadata through the bridge.

## Roles

One binary exposes three product roles:

- `server --detach --profile <root> --data-dir <dir> --runtime-dir <dir>` starts or joins the owner-scoped resident server and reports its verified endpoint.
- `holder --tab <id> --incarnation <n>` is a fixed role reserved for the server. It is never a general child-process launcher.
- `attach --endpoint <endpoint> --cwd <cwd> --clear-exit-ms <ms>` is the launch-instance root and owns the outer terminal.
- `probe --profile <root> --data-dir <dir> --runtime-dir <dir>` performs resident discovery without starting a host.

The former interactive `--run`, `--probe-2x2`, and `--topology-2x2` proof entries are not product paths. The retained non-interactive `--probe`, `--probe-scroll`, `--probe-selection`, and `--probe-input` modes certify the terminal model and encoders without opening an alternate screen.

## Stack

- `libghostty-vt` pinned to `c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3`;
- `portable-pty` 0.9.0 for PTY/ConPTY sessions;
- Crossterm 0.29.0 for outer-terminal modes and events;
- generation-1 bounded named-map MessagePack with frozen fixtures;
- milestone-1 native process identity, owner endpoint, detached fixed-role launch, durable replacement, writer lease, and controller-transfer contracts;
- HMAC-SHA256 role credentials and an owner-only profile secret.

## Build and validation

The package is built by the three **Native terminal host** CI targets: Windows x64, Linux x64, and macOS arm64. Each installs Rust and Zig 0.15.2 and runs:

```powershell
npm run test:terminal-host
```

The jobs upload the debug host binary, native lock library, and generation-1 fixture manifest. Vendored code is built for a baseline CPU. Linux also runs the bounded decoder fuzz target.

On a Windows workstation, `build.rs` refuses the full Zig build unless `TERMINAL_HOST_LOCAL_BUILD=1` is set because managed antivirus can quarantine libghostty's deliberately malformed test fixture and parent processes. `TERMINAL_HOST_CONTRACTS_ONLY=1` permits contract-library diagnostics only and is not product evidence.

The non-interactive gate covers identity, owner endpoints, writer-lock/addon behavior, durable replacement, protocol fixtures, controller simulation, fixed-role detachment, credential separation, registry commit fencing, retained terminal state, and native input/selection encoders. Physical terminal-close and SSH-loss checks must run manually or on an attested isolated worker, never automatically on an active workstation.

## Development command

`npm run proof:terminal-host -- <role and arguments>` builds and invokes the exact binary. With no arguments it runs the bounded non-interactive model probe. Use the repository `./scripts/dev` launcher for interactive A1 validation rather than invoking Node entry points directly.

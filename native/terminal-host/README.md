# A1 terminal host

This Cargo package contains the existing composed-terminal proof binary plus the resident-tabs contract library and feature-gated Node-API session-lock artifact. Milestone 1 adds only tested primitives, protocol/core contracts, and fixture roles: no product launch path loads resident infrastructure or the addon. The host remains a console process inside the user's existing terminal and creates no desktop window or GUI/GPU runtime.

## Stack

- `libghostty-vt` pinned to `c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3` for terminal state and input semantics;
- `portable-pty` 0.9.0 for PTY/ConPTY sessions;
- Crossterm 0.29.0 for outer-terminal raw input and terminal mode control;
- named-map MessagePack generation 1 with bounded framing and frozen fixtures;
- Node-API 9 for the writer-held session-lock test artifact;
- an A1-owned buffered frame composer and I/O-free controller-transfer core.

## Build and non-interactive probe

The crate builds in GitHub CI, not on workstations. Zig's package fetch for `libghostty-vt` unpacks upstream test data, including a deliberately malformed JPEG. Managed Windows antivirus quarantines it together with the processes above it, and on a machine running A1 that includes the installed `process-guardian.exe`. So `build.rs` refuses to build on a Windows host outside CI.

A pull request that changes this package, its fixtures, or its run scripts selects three **Native terminal host** targets: Windows x64, Linux x64, and macOS arm64. Each installs Rust and Zig 0.15.2 and runs:

```powershell
npm run test:terminal-host
```

Each job uploads the debug terminal-host binary, native lock library, and generation-1 fixture manifest as `terminal-host-<platform>-<architecture>-attempt-<n>` for one day. Linux additionally runs the decoder fuzz target for the bounded CI duration.

On a Windows machine without restrictive antivirus, set `TERMINAL_HOST_LOCAL_BUILD=1` to build locally anyway. Maintainers inspecting only the Rust contract library may additionally set `TERMINAL_HOST_CONTRACTS_ONLY=1`; that diagnostic skips the libghostty build and cannot substitute for any selected binary/probe lane.

The non-interactive gate runs identity, endpoint, writer-lock/addon, durable-replacement, protocol, controller-simulation, fixed-role launch, Rust layout/topology, retained-model/one-PTY, selection, native key/text/mouse/clipboard, and four-PTY integration probes. The 2×2 probe verifies durable pane/session mappings, exact argv, per-pane environment and cwd, distinct process identities, focused-input isolation, all-pane resize, and cleanup. It also emits bounded `a1-terminal-host-hot-path-v1` metadata proving four distinct native stream, input, terminal-model, render-damage, key-encoder, mouse-encoder, and selection identities. Raw PTY bytes, child input, and rendered cells remain in Rust and are not exported in the metadata. The gate does not enter alternate-screen mode.

## Manual fullscreen proof

Run only when you choose to test the current terminal manually:

```powershell
.\native\terminal-host\target\debug\a1-terminal-host.exe --run
```

The proof opens one tab with four independent Pi sessions in a fixed revisioned 2×2 split. `Alt+1` through `Alt+4` focus a pane; clicking inside a pane also focuses it. Keyboard and paste input route only to the focused pane. `Ctrl+Shift+Q` cleanly shuts down the host and all four owned process trees.

When a child enables terminal mouse reporting, mouse press, release, motion, drag, and wheel events are encoded by `libghostty-vt` from pane-relative coordinates and route only to that pane. Otherwise mouse wheel scrolling and left-button selection remain host-owned and pane-scoped. Plain left-drag selects terminal text with one uniform white inverted style and copies it through the outer terminal's OSC 52 clipboard support. Double-click selects a word, and triple-click selects a line. Ctrl+C clears an active selection in the focused pane before it reaches that child; without selection, interrupt keys remain child-owned. Other keyboard scroll/navigation is not rebound by the host. Each pane owns independent retained state, dimensions, selection, render damage, PTY, and cleanup. The host preserves the outer terminal's default background and foreground unless a child explicitly sets colors.

The host exits when all four children exit or when `Ctrl+Shift+Q` requests host cleanup. Ctrl+C remains child-owned except when clearing an active selection.

To launch an executable other than the default `pi`, pass the same exact executable and argument vector to all four independent panes:

```powershell
.\native\terminal-host\target\debug\a1-terminal-host.exe --run -- <executable> [args...]
```

To inspect the fixed durable topology without opening an interactive surface:

```powershell
.\native\terminal-host\target\debug\a1-terminal-host.exe --topology-2x2
```

For a vanilla-Pi proof without changing `npm start`:

```powershell
npm run proof:terminal-host -- --run -- pi
```

Do not automate this command on an active workstation. Physical acceptance must be manual or run on an attested isolated worker.

# AddOne terminal host

This crate is the proof host for composed terminal panes. It is a console process that runs inside the user's existing terminal; it does not create a Win32 window or use a GUI/GPU application runtime.

## Stack

- `libghostty-vt` pinned to `c5a21edfcbc2d5b46540ad91b7980aca31f5f1f3` for terminal state and input semantics;
- `portable-pty` 0.9.0 for PTY/ConPTY sessions;
- Crossterm 0.29.0 for outer-terminal raw input and terminal mode control;
- an AddOne-owned buffered frame composer.

## Build and non-interactive probe

From the repository root, with Rust and Zig 0.15.2 available:

```powershell
npm run test:terminal-host
```

The probe builds the host, creates a retained terminal model, starts and cleans up a PTY process, and exits. It does not enter alternate-screen mode.

## Manual fullscreen proof

Run only when you choose to test the current terminal manually:

```powershell
.\native\terminal-host\target\debug\addone-terminal-host.exe --run
```

The initial proof starts the calling shell in one fullscreen pane when possible: Git Bash from Git Bash, PowerShell from PowerShell, and `cmd.exe` from CMD. Leave by exiting the child normally, usually `exit` or `Ctrl+C` until the process closes. There is no host-owned quit shortcut.

Mouse wheel scrolling is captured by the host and scrolls the retained terminal viewport. Plain left-drag selects terminal text with one uniform white inverted style and copies it through the outer terminal's OSC 52 clipboard support. Double-click selects a word, and triple-click selects a line. Ctrl+C clears an active host selection before it reaches the child; without selection, interrupt keys remain child-owned. Other keyboard scroll/navigation is not rebound by the host. The host preserves the outer terminal's default background and foreground unless the child explicitly sets colors.

The host exits when the child exits or the PTY closes. Ctrl+C is always child-owned; the host does not count interrupts or force a quit from keyboard input.

To choose an exact executable:

```powershell
.\native\terminal-host\target\debug\addone-terminal-host.exe --run -- <executable> [args...]
```

For a vanilla-Pi proof without changing `npm start`:

```powershell
npm run proof:terminal-host -- --run -- pi
```

Do not automate this command on an active workstation. Physical acceptance must be manual or run on an attested isolated worker.

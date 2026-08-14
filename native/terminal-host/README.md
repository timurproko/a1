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

The initial proof runs `cmd.exe` in one fullscreen pane. Use `Ctrl+Shift+Q` to leave. To choose an exact executable:

```powershell
.\native\terminal-host\target\debug\addone-terminal-host.exe --run -- <executable> [args...]
```

Do not automate this command on an active workstation. Physical acceptance must be manual or run on an attested isolated worker.

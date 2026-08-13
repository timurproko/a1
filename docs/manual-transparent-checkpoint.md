# Manual transparent terminal checkpoint

This checkpoint is intentionally manual. No AddOne test or agent should launch a terminal, focus a window, inject input, resize a window, close an application, or clean up processes on your desktop.

## Build

From the checkout, run these commands yourself in the terminal where you want Native Pi to appear:

```sh
npm ci
npm run build
npm link
```

By default, `addone` launches `pi` from your `PATH` with no added arguments. To select another exact command for generic testing, set:

- `ADDONE_TERMINAL_EXECUTABLE` to the executable;
- `ADDONE_TERMINAL_ARGUMENTS_JSON` to a JSON array of exact arguments.

Example in PowerShell, entered manually:

```powershell
$env:ADDONE_TERMINAL_EXECUTABLE = "pi"
$env:ADDONE_TERMINAL_ARGUMENTS_JSON = '[]'
addone
```

Do not run `npm run test:physical:windows*` on your workstation. Those commands are blocked unless a disposable isolated worker attestation is present.

## Checklist

Compare `pi` launched directly with `addone`, using the same terminal, directory, environment, and Pi configuration:

- [ ] Native Pi is the first visible application content; no AddOne frame, clear, logo, or spacing appears.
- [ ] Text, Unicode, emoji, colors, attributes, cursor shape, and layout match direct Pi.
- [ ] Rapid typing has no visible AddOne delay or dropped/duplicated characters.
- [ ] Ctrl+C and Ctrl+P remain distinct; repeated Ctrl+C behaves like direct Pi.
- [ ] Arrow keys, paste, focus changes, and dialogs behave like direct Pi.
- [ ] Native selection, copy, clipboard, scrollback, mouse, and wheel behavior match direct Pi.
- [ ] Resize produces the same Pi dimensions and reflow as direct Pi.
- [ ] Normal Pi exit preserves Pi's final output and returns a usable parent prompt.
- [ ] After exit, typing, cursor movement, Backspace, Delete, and command submission work normally.
- [ ] A missing configured executable reports a concise spawn failure without affecting other applications.

## Report

Report each failed checklist item with:

- direct versus AddOne behavior;
- terminal application and version;
- Windows/macOS/Linux version;
- command and arguments;
- whether the failure occurs every time;
- screenshot or video only if you choose to capture it manually.

Manual acceptance authorizes work on isolated automated physical-host gates. It does not replace those later release gates.

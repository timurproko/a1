# Manual transparent terminal checkpoint

This checkpoint is intentionally manual. No AddOne test or agent should launch a terminal, focus a window, inject input, resize a window, close an application, or clean up processes on your desktop.

## Build and install in isolated paths

From the checkout, run these commands yourself. They install the exact tarball under `artifacts/manual-transparent/install` rather than replacing your global AddOne package:

```powershell
npm ci
npm run build
npm install --prefix artifacts/manual-transparent/install --ignore-scripts artifacts/manual-transparent/timurproko-addone-0.1.5-dev.7.tgz
```

Before launch, give the candidate isolated config, data, runtime, and database paths so it cannot reuse or mutate your normal AddOne state:

```powershell
$manualRoot = (Resolve-Path "artifacts/manual-transparent").Path
$env:ADDONE_CONFIG_DIR = "$manualRoot\state\config"
$env:ADDONE_DATA_DIR = "$manualRoot\state\data"
$env:ADDONE_RUNTIME_DIR = "$manualRoot\state\runtime"
$env:ADDONE_DATABASE_PATH = "$manualRoot\state\data\control.sqlite3"
```

By default, the candidate launches `pi` from your `PATH` with no added arguments. To select another exact command for generic testing, set:

- `ADDONE_TERMINAL_EXECUTABLE` to the executable;
- `ADDONE_TERMINAL_ARGUMENTS_JSON` to a JSON array of exact arguments.

Example in PowerShell, entered manually:

```powershell
$env:ADDONE_TERMINAL_EXECUTABLE = "pi"
$env:ADDONE_TERMINAL_ARGUMENTS_JSON = '[]'
& "artifacts/manual-transparent/install/node_modules/.bin/addone.cmd"
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

## Manual findings

- First Windows `npm start` attempt: `spawn pi ENOENT`. Cause: the global npm command is a standard `.cmd` shim while transparent launch disables shell execution. Corrected generically by resolving PATH and unwrapping only the audited standard npm Windows shim format to its Node executable and CLI entry point; arbitrary command scripts remain rejected.
- Manual retest of the corrected Windows development candidate was explicitly accepted by the user: rendering and input behaved as expected, with no observed rendering or input issues.

## Report

Report each failed checklist item with:

- direct versus AddOne behavior;
- terminal application and version;
- Windows/macOS/Linux version;
- command and arguments;
- whether the failure occurs every time;
- screenshot or video only if you choose to capture it manually.

Manual acceptance authorizes work on isolated automated physical-host gates. It does not replace those later release gates.

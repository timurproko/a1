# Manual owned-UI and transparent fallback checkpoint

This checkpoint is user-controlled. Tests and coding agents must not launch or focus a terminal, inject desktop input, resize windows, close applications, or clean up workstation processes.

## Prepare an exact candidate

From the candidate checkout, pack once and install that tarball into a disposable prefix:

```powershell
npm ci
npm run build
npm pack --ignore-scripts --pack-destination artifacts/manual-transparent
npm install --prefix artifacts/manual-transparent/install --ignore-scripts artifacts/manual-transparent/<exact-tarball>.tgz
```

Use isolated A1 control state:

```powershell
$manualRoot = (Resolve-Path "artifacts/manual-transparent").Path
$env:A1_CONFIG_DIR = "$manualRoot\state\config"
$env:A1_DATA_DIR = "$manualRoot\state\data"
$env:A1_RUNTIME_DIR = "$manualRoot\state\runtime"
$env:A1_DATABASE_PATH = "$manualRoot\state\data\control.sqlite3"
```

Run the installed candidate yourself:

```powershell
& "artifacts/manual-transparent/install/node_modules/.bin/a1.cmd"
```

Test each installed launch form separately: bare `a1` (the owned UI), `a1 pi` (the untouched comparison oracle), and `a1 sandbox` (the unchanged isolated vanilla profile). Confirm that files created through `/settings`, `/login`, sessions, and resource directories remain under the selected profile root. Generic transparent-fallback testing may set `A1_TERMINAL_EXECUTABLE` and a JSON array in `A1_TERMINAL_ARGUMENTS_JSON`.

Physical automation is not part of this repository baseline. Future certification tooling may run only on dedicated disposable workers or VMs with exclusive test desktops, never on this workstation.

## Compare bare A1 with `a1 pi`

Use the same terminal, working directory, dimensions, environment, and equivalent profile resources. Bare A1 and the untouched oracle intentionally use separate profile roots.

- [ ] Startup resources, logo, notices, spacing, editor, and footer match.
- [ ] Text, Unicode, emoji, styles, cursor, and layout match.
- [ ] Rapid typing has no visible A1 delay or dropped/duplicated characters.
- [ ] Ctrl+C, Ctrl+P, arrows, paste, focus, dialogs, mouse, and wheel match.
- [ ] Selection, copy, clipboard, scrollback, and resize match.
- [ ] Normal and error exits preserve child output and return a usable parent prompt.
- [ ] Parent typing, cursor movement, Backspace, Delete, and submission work after exit.
- [ ] A missing executable reports a concise spawn failure without affecting other applications.

Report failures with direct-versus-A1 behavior, platform/terminal versions, exact command, reproducibility, and optional manually captured evidence.

For recovery, use `a1 pi`; do not use the removed `a1 ui` command. `a1 sandbox` remains profile isolation rather than a security boundary.

Manual acceptance can authorize an exact uncertified development preview after non-desktop gates pass. It does not certify stable terminal parity or platform support.

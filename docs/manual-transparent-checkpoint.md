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

Use isolated AddOne control state:

```powershell
$manualRoot = (Resolve-Path "artifacts/manual-transparent").Path
$env:ADDONE_CONFIG_DIR = "$manualRoot\state\config"
$env:ADDONE_DATA_DIR = "$manualRoot\state\data"
$env:ADDONE_RUNTIME_DIR = "$manualRoot\state\runtime"
$env:ADDONE_DATABASE_PATH = "$manualRoot\state\data\control.sqlite3"
```

Run the installed candidate yourself:

```powershell
& "artifacts/manual-transparent/install/node_modules/.bin/addone.cmd"
```

Test each installed launch form separately: bare `a1` (the owned UI), `a1 pi` (the untouched comparison oracle), and `a1 sandbox` (the unchanged isolated vanilla profile). Confirm that files created through `/settings`, `/login`, sessions, and resource directories remain under the selected profile root. Generic transparent-fallback testing may set `ADDONE_TERMINAL_EXECUTABLE` and a JSON array in `ADDONE_TERMINAL_ARGUMENTS_JSON`.

Physical automation is not part of this repository baseline. Future certification tooling may run only on dedicated disposable workers or VMs with exclusive test desktops, never on this workstation.

## Compare bare AddOne with `a1 pi`

Use the same terminal, working directory, dimensions, environment, and equivalent profile resources. Bare AddOne and the untouched oracle intentionally use separate profile roots.

- [ ] Startup resources, logo, notices, spacing, editor, and footer match.
- [ ] Text, Unicode, emoji, styles, cursor, and layout match.
- [ ] Rapid typing has no visible AddOne delay or dropped/duplicated characters.
- [ ] Ctrl+C, Ctrl+P, arrows, paste, focus, dialogs, mouse, and wheel match.
- [ ] Selection, copy, clipboard, scrollback, and resize match.
- [ ] Normal and error exits preserve child output and return a usable parent prompt.
- [ ] Parent typing, cursor movement, Backspace, Delete, and submission work after exit.
- [ ] A missing executable reports a concise spawn failure without affecting other applications.

Report failures with direct-versus-AddOne behavior, platform/terminal versions, exact command, reproducibility, and optional manually captured evidence.

For recovery, use `a1 pi`; do not use the removed `a1 ui` command. `a1 sandbox` remains profile isolation rather than a security boundary.

Manual acceptance can authorize an exact uncertified npm `next` preview after non-desktop gates pass. It does not certify stable terminal parity or platform support.

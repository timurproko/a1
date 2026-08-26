# Manual owned-UI checkpoint

This checkpoint is user-controlled. Tests and coding agents must not launch or focus a terminal, inject desktop input, resize windows, close applications, or clean up workstation processes.

## Prepare an exact candidate

From the candidate checkout, pack once and install that tarball into a disposable prefix:

```powershell
npm ci
npm run build
npm pack --ignore-scripts --pack-destination .artifacts/manual-owned-ui
npm install --prefix .artifacts/manual-owned-ui/install --ignore-scripts .artifacts/manual-owned-ui/<exact-tarball>.tgz
```

Use isolated A1 control state:

```powershell
$manualRoot = (Resolve-Path ".artifacts/manual-owned-ui").Path
$env:A1_CONFIG_DIR = "$manualRoot\state\config"
$env:A1_DATA_DIR = "$manualRoot\state\data"
$env:A1_RUNTIME_DIR = "$manualRoot\state\runtime"
$env:A1_DATABASE_PATH = "$manualRoot\state\data\control.sqlite3"
```

Run each installed launch form yourself:

```powershell
& ".artifacts/manual-owned-ui/install/node_modules/.bin/a1.cmd"
& ".artifacts/manual-owned-ui/install/node_modules/.bin/a1.cmd" pi
```

Both commands use the same A1-owned rendering and input pipeline. Bare `a1` enables A1-owned screens. `a1 pi` withholds those screens and reads the ordinary Pi profile. Confirm that files created through `/settings`, `/login`, sessions, and resource directories remain under the selected profile root.

Physical automation is not part of this repository baseline. Future certification tooling may run only on dedicated disposable workers or VMs with exclusive test desktops, never on this workstation.

## Compare bare A1 with `a1 pi`

Use the same terminal, working directory, dimensions, environment, and equivalent profile resources. Bare A1 and the comparison profile intentionally use separate profile roots.

- [ ] Startup resources, logo, notices, spacing, editor, and footer match.
- [ ] Text, Unicode, emoji, styles, cursor, and layout match.
- [ ] Rapid typing has no visible delay or dropped or duplicated characters.
- [ ] Ctrl+C, Ctrl+P, arrows, paste, focus, dialogs, mouse, and wheel behave correctly.
- [ ] Selection, copy, clipboard, scrollback, and resize behave correctly.
- [ ] Normal and error exits return a usable parent prompt.
- [ ] Parent typing, cursor movement, Backspace, Delete, and submission work after exit.

Report failures with bare-versus-comparison behavior, platform and terminal versions, exact command, reproducibility, and optional manually captured evidence.

For recovery, use `a1 pi`; do not use the removed `a1 ui` command. Manual acceptance can authorize an exact uncertified development preview after non-desktop gates pass. It does not certify stable presentation parity or platform support.

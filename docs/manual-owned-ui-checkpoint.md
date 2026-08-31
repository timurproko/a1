# Manual owned-UI checkpoint

This checkpoint is user-controlled. Tests and coding agents must not launch or focus a terminal, inject desktop input, resize windows, close applications, or clean up workstation processes.

## Prepare an exact candidate

For a checkout smoke test in Git Bash, build once and launch with `./scripts/dev` or `./scripts/dev pi`. Do not invoke `node scripts/development/dev-launch.mjs` or `node scripts/development/start-local.mjs` directly: that bypasses the color-preserving shell `exec` shape and can collapse the pinned 24-bit palette to Git Bash's 16 terminal colors. Run `node scripts/check-terminal-colour.mjs` first when color fidelity is in doubt; the first color block must differ from the terminal-palette cyan block.

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

### Setting-controlled visual matrix

Use equivalent values in bare A1 and the Pi comparison profile. Exercise both a wide frame and a narrow frame that forces wrapping/clipping.

- [ ] `/settings`: selected cursor, label and value accent; unselected values muted; descriptions and hints dim; search uses `> ` with inverse cursor; scalar menus, numeric controls, warning-parts dialog, deferred notice, failed write, section spacing, clipping, and hidden-entry absence match their pinned semantic roles.
- [ ] Transcript: toggle images and image width, thinking level/visibility, Mermaid mode, output padding, cache notices, warnings, auto-compaction, queue modes, command autocomplete, provider timeout/retry/error, and changelog collapse. Existing and streaming blocks must re-render without focus, selection, scroll, or queued-work loss.
- [ ] Trust startup: from an undecided project, compare selected Trust/Do not trust rows, arrow navigation, Enter, Escape/Ctrl+C, clearing, cursor state, and restoration. No project extension/theme/prompt/skill may run before selection, and a fail-closed diagnostic must appear once on the restored parent rather than above a blank fullscreen frame.
- [ ] Terminal lifecycle: toggle hardware cursor, clear-on-shrink, and terminal progress; resize smaller/larger; open/close selectors; select and copy transcript text; verify no duplicate rows, stale OSC progress, leaked mouse mode, misplaced cursor, or broken parent input.
- [ ] Images: in Kitty or iTerm2 verify inline width and clipping; in Windows Terminal verify the textual fallback and absence of image protocol bytes without hiding `showImages`.
- [ ] Fullscreen exit `transcript`: verify the parent is restored before styled user, assistant Markdown, thinking, tool, notice, warning, error, and spacing rows are printed. No overlay, draft, animation, scrollbar, or inline-image payload may appear.
- [ ] Fullscreen exit `resume-hint`: verify only dim `To resume this session:` plus `a1 --session <compact-id>` is printed for the default directory. A custom directory must place quoted `--session-dir <dir>` before `--session`; the raw default `.jsonl` path must never print.

Record acceptance with:

```text
A1 commit/tarball:
Pi package: @earendil-works/pi-coding-agent 0.84.2
OS/version:
Terminal/version:
Terminal dimensions (wide/narrow):
Image protocol result:
Settings values exercised:
Outcome and any declared substitutions:
```

Report failures with bare-versus-comparison behavior, platform and terminal versions, exact command, dimensions, settings values, reproducibility, and optional manually captured evidence.

For recovery, use `a1 pi`; do not use the removed `a1 ui` command. Manual acceptance can authorize an exact uncertified development preview after non-desktop gates pass. It does not certify stable presentation parity or platform support.

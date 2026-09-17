# Implementation evidence

All commands were run from the delivery worktree `D:/Git/a1/.worktrees/fix-settings-scrollbar-jump-shortcuts` on top of `develop` at `cfe8cf3b`, on Windows 11 with Git 2.53.0.windows.1 and Node 24.16.0. `test:fast`, `test:full`, and `test:release` were not run; the maintainer did not request them.

## Focused suites

| Command | Outcome |
| --- | --- |
| `npx vitest run test/features/owned-ui/settings-app.test.ts` | 41 passed. New cases: under `auto` a wheel scroll lights the thin rail, it stays lit at 800 ms with no repaint requested, one repaint is requested at 925 ms and the rail is blank again, a `Ctrl+End` jump lights it again, and closing the app cancels the pending repaint; the rail stays blank under `auto` until pointer motion reaches the rail column, then draws the track and a thick thumb, and blanks again when the pointer leaves; `always` draws the thin rail for `thin` and the thick rail for `thick` without pointer activity; `hidden` draws no rail, ignores rail-column motion and presses, and at 23 columns shows the value that the reserved rail clips; cycling `Scrollbar mode` on the screen with the store change pending draws the rail on `always` and removes it on `hidden`; pressing the thumb and moving scrolls to the end and keeps the selection, releasing ends the drag, grabbing the thumb where it is drawn returns to the top, and pressing the track below the thumb pages by the rows in view; `Ctrl+Home`/`Ctrl+End` in the xterm and rxvt encodings select the first and the very last setting; plain `Home`/`End` return `consumed: false` and leave the list unchanged; while searching, plain `Home`/`End` move the search cursor (`cr` becomes `scro`) and leave the selection on `Scrollbar style`. The two existing search tests now use `Ctrl+Home`/`Ctrl+End`. |
| `npx vitest run test/ui/components/scrollbar.test.ts` | 20 passed. New cases for `withScrollbarRail`: no presentation keeps the thin rail on overflow and a blank reserved cell when the content fits; an `auto` presentation reserves a blank rail; hovered and `always`+`thick` presentations draw their glyphs; a `hidden` presentation returns the rows untouched. |
| `npx vitest run test/repository-governance/owned-settings-interaction-boundary.test.ts test/repository-governance/shortcut-hint-governance.test.ts test/repository-governance/pi-session-shell-provenance.test.ts test/ui test/features/owned-ui` | 40 files, 476 passed. |

## Governance commands

| Command | Outcome |
| --- | --- |
| `npx openspec validate fix-settings-scrollbar-and-jump-shortcuts --strict` | `Change 'fix-settings-scrollbar-and-jump-shortcuts' is valid`. |
| `npm run typecheck` | 0 errors. |
| `npm run check:architecture` | Architecture, product identity, package identity, pinned Pi source ledger, and terminal host provenance OK. |
| `npm run check:docs-governance` | `Docs-sensitive governance OK: 75 inventoried legacy occurrences match`. |
| `npm run check:code-documentation` | `Code documentation governance OK: no violations`. |
| `npm run check:names` | `967 files; 0 violations`. |

## Behavior notes

- The settings rail asks `scrollbarPresentation` with the transcript's activity window: a frame whose scroll differs from the previous one lights the rail for 900 ms and arms one 925 ms repaint timer, so `auto` reveals on scroll, hover, or drag and fades on its own.
- `hidden` releases both rail columns to the rows, matching the transcript's `reservesSpace` rule; `auto` and `always` keep them while the list fits.
- The value menu frame receives the reserved right width, so under `hidden` a floating menu may use the full pane width.

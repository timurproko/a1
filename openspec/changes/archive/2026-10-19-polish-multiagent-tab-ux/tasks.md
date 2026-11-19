Markers report current implementation progress. Native Rust tests run in CI. Before each push, run the typecheck, the touched TypeScript tests and the contracts-only cargo check.

## 1. Input during Agent creation

- [x] 1.1 Forward body pointer motion only when the child's mouse mode requests motion tracking. Never queue motion while a view is pending, and coalesce queued focus reports to the latest. (Implemented by dropping focus reports while a view is pending; the deferred budget is now 1024 frames.)
- [x] 1.2 Remove the `Input was not sent; try again.` notice and its four producers. Overflow refuses before any prefix with no visible notice. A `read-only-viewer` rejection re-claims input silently. (Refined 2026-10-19: replaying the refused frame is deferred; see design, Refinements.)
- [x] 1.3 Rust test: 500 motion events plus typed keys during a pending create deliver every key exactly once to the new tab, and no notice is rendered. (The rejection-replay test was deferred with replay.)

## 2. Flash-free Agent creation

- [x] 2.1 Gate commit of a requested newly created tab on a drawn child frame (revision > 0, non-blank), with a 2 s fallback. Keep the cursor hidden until commit. (The holder's first revision is per-incarnation rather than 0, so the gate is "non-blank" for a tab this client created. The previous view and its cursor stay until commit.)
- [x] 2.2 Keep a provisional holder `idle` from flipping a starting chip. (Refined 2026-10-19: the forced clear on a geometry-generation change is kept, because #801's geometry test requires it; see design, Refinements.)
- [x] 2.3 Rust tests:
  - A blank revision-0 frame does not commit.
  - The first drawn frame commits together with chip, footer and editor.
  - The fallback timer commits.
  - No clear-only frame and no visible cursor before commit.

## 3. Settings tab content

- [x] 3.1 Retain one pending owned route while the session-shell runtime is inactive, present it after `start()`, and log failed route results. (Failures show as a workflow warning, the nearest existing reporting path.)
- [x] 3.2 TypeScript test: a `settings` route delivered before `start()` opens Settings once after start.

## 4. Stable popups

- [x] 4.1 Composite popup cells into the desired rows before diffing, and repaint only changed child columns outside an unchanged popup, on the structured surface path, which is the default. On the legacy raw-byte fallback the popup is repainted after the body inside the same synchronized frame. (Refined 2026-10-19: clipping legacy body writes to the popup rectangle is deferred; see design, Refinements.)
- [x] 4.2 Rust tests: with an open menu and a streaming child, no frame clears or rewrites popup cells, and popup dismissal restores the newest child cells.

## 5. Inline rename editing

- [x] 5.1 Add grapheme-safe `delete_word_left`/`delete_word_right`, bound to Ctrl+Backspace (and the Ctrl+H/Ctrl+W encodings) and Ctrl+Delete. Require no Ctrl/Alt for character insertion.
- [x] 5.2 Add bounded undo/redo with typed-run coalescing, bound to Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z.
- [x] 5.3 Rust tests: word deletion across Unicode, Ctrl+letter non-insertion, and undo/redo sequences including redo invalidation after a new edit.

## 6. Dialog keys in resident tabs

- [x] 6.1 Hold controller-boundary bytes only when at least `\x1bP` is buffered, and deliver a lone trailing Esc immediately.
- [x] 6.2 Decode keys by meaning (pi-tui `matchesKey`/`parseKey`) in the owned reference screens, Settings app, UI app host and shell interrupt check. (The architecture policy confines pi-tui imports, so the decoding happens once, at the owned-route input boundary in `shell-host.ts`. `legacyKeyInput` in the pi tui-runtime adapter maps kitty reports to the legacy bytes the screens compare, and the same mapping recognises the CSI-u Ctrl+C in the interrupt check.)
- [x] 6.3 TypeScript tests: a lone Esc passes through the bridge immediately, and the Changelog screen scrolls and closes with both legacy and kitty encodings.

## 7. Footer PR hyperlink

- [x] 7.1 Emit OSC 8 targets/IDs from the legacy `compose_frame` path using the cell hyperlink lookup.
- [x] 7.2 Ghostty-level test, run in CI: legacy frames keep OSC 8 hyperlink targets. (Refined 2026-10-19: the platform-PTY/ConPTY holder fixture is deferred; see design, Refinements.)

## 8. Tab status markers

- [x] 8.1 Report the last settlement as `done`, `aborted` or `failed` from owned UI through the deriver, the `ResidentTabStatus` union and the server allowlist. (An errored turn reports `error`; `failed` stays reserved for a failed tab lifecycle, which locks input behind retry.)
- [x] 8.2 Render green `✓` for `done` and red `✗` for `aborted`/`failed`/crash. Keep the marker after viewing until the next turn starts. (`error` also renders red `✗`.)
- [x] 8.3 TypeScript and Rust tests for abort, success, failure, view persistence and the transition to working on the next turn.

## 9. Strip row background

- [x] 9.1 Paint the full strip row with background RGB `20,20,20` and its 256-color fallback behind padding and clock, restoring it after each chip and ending the row with a background erase. (The row background is set before each run of padding cells and reset after the final cell.)
- [x] 9.2 Re-emit the strip in the same synchronized frame whenever legacy body bytes were written, so no child cell survives in row 1. (Refined 2026-10-19: clipping legacy body output to rows ≥ 2 is deferred; see design, Refinements.)
- [x] 9.3 Rust tests: every strip cell outside chips carries the row background, and no child cell survives in row 1 after legacy body writes.
- [x] 9.4 Found in manual test on 2026-10-19: new Agents painted a black body because the emulator's initial default background was published with OSC 11. Holders now report which default colors and palette entries still hold the emulator's initial values (`inheritedColors`), and attach resets those to the outer theme (OSC 110/111/104) instead. A Rust test covers inherited, explicit and later-set colors.

## 10. Local rebuild while testing (maintainer request, 2026-10-19)

- [x] 10.1 `npm run build` stops A1 processes running this checkout's own `dist/` or `bin/` code before cleaning `dist/`. On Windows a running resident host locks the native addon and `clean` failed with EPERM. CI and other checkouts are never touched. Selection is covered by `test/repository-governance/stop-checkout-processes.test.ts`.

## 11. Quit animation on double Ctrl+C (maintainer request, 2026-10-19)

- [x] 11.1 Port bare A1's `fall` quit-outro plan and bounded player to the attach client (`roles/quit_outro.rs`; its seeded generator matches the TypeScript output). On a double-Ctrl+C detach from any tab, drop any pending repaint, play the outro over the presented strip and child rows when `a1.quitAnimation` is on (the default), show the cursor, then restore. Rust tests cover the generator, plan coverage and order, synchronized blocks ending blank, bounded playback, write failure, row widths, and the setting.

## 12. Shared settings apply live (maintainer request, 2026-10-19)

- [x] 12.1 Each resident tab watches the shared profile `settings.json` and rereads it on change. `OwnedSettingsManager.refresh()` notifies only when a resolved value differs, so live settings such as the accent color reach every running tab; restart-bound values surface as pending. Covered by `test/ui/settings/manager.test.ts` and `test/composition/shared-settings-watch.test.ts`.

## 13. Pre-ready delivery bookkeeping

- [x] 13.1 Write `implementation-evidence.md` with delivered behavior, local checks run and gaps. Reconcile and push current `origin/develop`, add plain Acceptance, and pass `check-delivery-body.mjs --final` before checking the final Implementation item.

## Outcome completion map

| PR outcome | Task groups |
| --- | --- |
| 1. Adding an Agent always accepts input; no notice row | 1 |
| 2. New Agents appear without flashing | 2 |
| 3. Settings tab shows Settings | 3 |
| 4. Strip menus stay stable while open | 4 |
| 5. Rename word deletion and undo/redo | 5 |
| 6. Dialog shortcuts work in tabs | 6 |
| 7. Footer PR is a clickable link | 7 |
| 8. Red ✗ / green ✓ markers | 8 |
| 9. Solid dark strip row | 9 |

Whichever outcome finishes last also waits for group 13.

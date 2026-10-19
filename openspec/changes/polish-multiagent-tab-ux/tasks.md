Markers report current implementation progress. Native Rust tests run in CI. Before each push, run the typecheck, the touched TypeScript tests and the contracts-only cargo check.

## 1. Input during Agent creation

- [ ] 1.1 Forward body pointer motion only when the child's mouse mode requests motion tracking. Never queue motion while a view is pending, and coalesce queued focus reports to the latest.
- [ ] 1.2 Remove the `Input was not sent; try again.` notice and its four producers. Overflow refuses before any prefix with no visible notice. A `read-only-viewer` rejection re-claims and replays the refused frame once.
- [ ] 1.3 Rust tests:
  - 500 motion events plus typed keys during a pending create deliver every key exactly once to the new tab, and no notice is rendered.
  - Rejection replay.

## 2. Flash-free Agent creation

- [ ] 2.1 Gate commit of a requested newly created tab on a drawn child frame (revision > 0, non-blank), with a 2 s fallback. Keep the cursor hidden until commit.
- [ ] 2.2 Report bridge status from the holder instead of the literal `idle`. Skip the full clear when geometry generation changes at identical dimensions.
- [ ] 2.3 Rust tests:
  - A blank revision-0 frame does not commit.
  - The first drawn frame commits together with chip, footer and editor.
  - The fallback timer commits.
  - No clear-only frame and no visible cursor before commit.

## 3. Settings tab content

- [ ] 3.1 Retain one pending owned route while the session-shell runtime is inactive, present it after `start()`, and log failed route results.
- [ ] 3.2 TypeScript test: a `settings` route delivered before `start()` opens Settings once after start.

## 4. Stable popups

- [ ] 4.1 Composite popup cells into the desired rows before diffing. Repaint only changed child columns outside an unchanged popup, and clip legacy body writes to the popup rectangle.
- [ ] 4.2 Rust tests: with an open menu and a streaming child, no frame clears or rewrites popup cells, and popup dismissal restores the newest child cells.

## 5. Inline rename editing

- [ ] 5.1 Add grapheme-safe `delete_word_left`/`delete_word_right`, bound to Ctrl+Backspace (and the Ctrl+H/Ctrl+W encodings) and Ctrl+Delete. Require no Ctrl/Alt for character insertion.
- [ ] 5.2 Add bounded undo/redo with typed-run coalescing, bound to Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z.
- [ ] 5.3 Rust tests: word deletion across Unicode, Ctrl+letter non-insertion, and undo/redo sequences including redo invalidation after a new edit.

## 6. Dialog keys in resident tabs

- [ ] 6.1 Hold controller-boundary bytes only when at least `\x1bP` is buffered, and deliver a lone trailing Esc immediately.
- [ ] 6.2 Decode keys by meaning (pi-tui `matchesKey`/`parseKey`) in the owned reference screens, Settings app, UI app host and shell interrupt check.
- [ ] 6.3 TypeScript tests: a lone Esc passes through the bridge immediately, and the Changelog screen scrolls and closes with both legacy and kitty encodings.

## 7. Footer PR hyperlink

- [ ] 7.1 Emit OSC 8 targets/IDs from the legacy `compose_frame` path using the cell hyperlink lookup.
- [ ] 7.2 Holder fixture: an OSC 8 footer written through the platform PTY reaches the outer frame as a link. If ConPTY strips it, record the refinement in the design before adding a bridge side channel.

## 8. Tab status markers

- [ ] 8.1 Report the last settlement as `done`, `aborted` or `failed` from owned UI through the deriver, the `ResidentTabStatus` union and the server allowlist.
- [ ] 8.2 Render green `✓` for `done` and red `✗` for `aborted`/`failed`/crash. Keep the marker after viewing until the next turn starts.
- [ ] 8.3 TypeScript and Rust tests for abort, success, failure, view persistence and the transition to working on the next turn.

## 9. Strip row background

- [ ] 9.1 Paint the full strip row with background RGB `20,20,20` and its 256-color fallback behind padding and clock, restoring it after each chip and ending the row with a background erase.
- [ ] 9.2 Re-emit the strip whenever legacy body bytes were written, and clip legacy body output to rows ≥ 2.
- [ ] 9.3 Rust tests: every strip cell outside chips carries the row background, and no child cell survives in row 1 after legacy body writes.

## 10. Pre-ready delivery bookkeeping

- [ ] 10.1 Write `implementation-evidence.md` with delivered behavior, local checks run and gaps. Reconcile and push current `origin/develop`, add plain Acceptance, and pass `check-delivery-body.mjs --final` before checking the final Implementation item.

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

Whichever outcome finishes last also waits for group 10.

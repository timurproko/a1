## Delivered behavior

- Bare-A1 `/name` reads the current session name on each invocation; unnamed sessions start empty and the initial caret is at the end. Direct naming and comparison-profile behavior remain unchanged.
- The opt-in name field supports grapheme-aware mouse drag selection, Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V. Selection uses the same `paintTextSelection` helper as the ordinary prompt. Selected Ctrl+C copies without dismissal; unselected Ctrl+C and Escape cancel silently. Paste remains bounded single-line text, cut/replacement/paste are undoable, and stale clipboard reads cannot mutate a dismissed or edited field.
- Footer name hit testing uses explicit painted geometry, including clipping, outer gutters, extension-status rows, and resize. Only visible name cells acquire hover and right-click editing. Unnamed, comparison, and extension-replaced footers expose no target.
- The Edit menu reproduces the pre-pivot popup's dark grey borderless surface, one-cell side padding, white normal-weight labels, no initial selection, and live accent-selected hover. The historical reference is the parent of pivot commit `9f0307c0`, specifically the native attach popup painter/model. No retired native code or accent lookup table was restored.
- Edit invokes the naming workflow directly rather than submitting `/name`. Focused shell cases preserve an unsent prompt and attached image through both name submission and cancellation, with no model prompt sent.
- Optional name-field code loads on first use with an existing compact input placeholder and bounded ordered keyboard/pointer buffering. A queued copy is not intercepted as cancellation. Footer context routing loads after the first synchronous frame; until prepared, ordinary pointer and keyboard routing remains untouched. Shared extension bridge types reuse the neutral contract rather than duplicating it.
- Copied-source provenance and hashes describe initial caret placement and footer-name geometry/hover. The size ratchet was lowered for the smaller bridge function; no architecture, cycle, or startup budget was relaxed.

## Focused validation

- Five targeted files passed, 93 tests: `session-shell-workflows.test.ts`, `footer-name-menu.test.ts`, `extension-ui-bridge.test.ts`, `session-name-menu.test.ts`, and `prompt-input-ux.test.ts` under their owning test directories.
- `npm run typecheck`: passed after the required checkout build supplied launcher declarations.
- `npm run check:architecture`: passed, including the unchanged startup limits, owner/import/cycle rules, writer guard, product identity, and pinned-source ledger.
- `npm run build`: passed.
- Strict OpenSpec validation and `git diff --check`: passed.

## Known gaps

No known implementation gaps. A physical interactive terminal has not been manually exercised; pointer and clipboard behavior is covered through the real owned-shell route and focused component fixtures. Maintainer manual acceptance and exact-head CI remain separate from implementation completion.

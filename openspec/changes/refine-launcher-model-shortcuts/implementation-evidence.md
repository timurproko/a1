# Implementation evidence

## Delivered behavior

- Bare A1 now declares Ctrl+M for `app.model.cycleForward`, leaves model selection unbound by default, and retains Ctrl+P for Launcher. Effective startup/shortcut help distinguishes cycling from `/models` selection. Explicit overrides and comparison defaults remain intact; indistinguishable legacy carriage return remains Enter.
- The shell calls the unchanged `cycleModelWorkflow` and pinned session cycle implementation used before PR #900. An empty session scope cycles all available models; a nonempty scope cycles available scoped models in scope order without widening. Scope clearing, wraparound, and zero/one eligible model behavior remain the pinned behavior.
- Unified Models now mounts through the original input-dock dialog host instead of the floating overlay adapter. The unused floating-Models bridge is removed. Search, scope controls, saving, deferred loading, retained drafts, failed-switch visibility, and transcript interaction remain covered.
- The visible application chooser is Launcher with no subtitle or reserved description row. The shared stepped panel permits an omitted description without changing described Settings selectors; capacity accounts for the omitted row. Loading/unavailable/close copy, shortcut help, and user documentation use Launcher. Application routes and internal stable identifiers are unchanged.
- Successful model switches remain quiet and warnings/failures remain visible. Shared floating-modal contrast, nested Settings selectors, and footer PR presentation are unchanged.

## Historical verification

- Compared `8c5a4d03`, the parent of PR #900: Ctrl+P invoked `onModelCycle`, the shell delegated to `cycleModelWorkflow`, and the workflow delegated directly to `session.cycleModel`.
- Verified the same pinned `@earendil-works/pi-coding-agent` 1.5.0 session chooses the all-available or available-scoped pool. The follow-up changes declarations and selector placement, not that engine algorithm.

## Focused local checks

- Build and typecheck passed after preparing the fresh worktree's emitted runtime entries.
- 67 tests passed across `model-cycling.test.ts`, `prompt-input-ux.test.ts`, `session-shell-models.test.ts`, `apps-dialog.test.ts`, and `session-shell-apps.test.ts`.
- 128 tests passed across `session-shell-paste.test.ts`, `dialog-coordinator.test.ts`, `models-dialog.test.ts`, `dialog-panel.test.ts`, and `workflow-output.test.ts`.
- The seven new real pinned-session cycle cases exercise all available models, scope order and eligibility, wraparound, clearing scope, and zero/one eligible model pools. Shell/input cases verify both distinguishable Ctrl+M encodings, no selector, retained drafts, visible cycle failures, ordinary Enter, overrides, and comparison Ctrl+P.
- Architecture boundaries, session writer guard, product identity boundaries/package governance, pinned source-port provenance, and changed-file documentation checks passed. The ledger records the current declarations and refreshed port digest.
- Strict OpenSpec validation passed. Required exact-head CI remains the post-readiness authority; these local results do not claim remote CI success or manual acceptance.

## Models opening and Hotkeys follow-up

- Removed the deferred Models loading placeholder and unused initial refresh-status copy. The host holds the current terminal frame until the Models controller is ready, using the same atomic presentation boundary as other asynchronous selectors. The hold releases in `finally`; early input/cancellation and actual failures remain supported.
- Regression tests assert an empty pending component render, preserved early search input, no terminal writes even on a forced render while held, a completed Models frame without loading/refresh text, and release on readiness or early cancellation.
- Added Hotkeys to Launcher using its existing full-screen reference route and live keybinding document. Added cross-application coverage for reaching it, canceling Launcher over it, selecting the current Hotkeys screen without resetting it, returning to the retained Agent draft, and keyboard/pointer isolation.
- Removed Hotkeys from the bare-A1 built-in catalog, completion/help inputs, and built-in slash route dispatch. Tests retain the comparison command manifest and in-feed behavior, and prove that a same-named extension completion remains available.
- 174 tests passed across the ten affected dialog, shell/reference-screen, autocomplete, presenter, engine-workflow, and composition test files. The final atomic-presentation helper rerun passed all 46 tests in its three directly affected files; extracting that helper shrank the presenter factory from 271 to 267 lines, and the size ratchet was lowered accordingly. Typecheck, architecture/session-writer/product-identity guards, pinned source-port provenance, and strict OpenSpec validation also passed. Required exact-head CI must validate the follow-up; the previous finalized head is not current evidence.

## Known gaps

None. Legacy terminals cannot distinguish Ctrl+M from Enter; preserving Enter is the approved compatibility behavior, with `/models` available for explicit selection.

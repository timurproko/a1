## Approval and implementation

The maintainer approved the planning draft and explicitly requested implementation with “approved implement”. Implementation continued in the linked `E:/Git/a1/.worktrees/progress-spinner-mouse-selection` worktree and draft PR #727.

Terminal-routed reproduction established that the spinner component was already passive: selection could begin on `Working…`, and a dock-originated drag crossed it upward. The defect was the reverse direction. `TranscriptViewport.#visibleSelection` selected its projection boundary from the anchor alone, so a document-originated range was clipped at `viewportHeight` after crossing the working row into the dock.

The implementation now detects a mixed viewport/dock range from both surface-qualified endpoints. Mixed ranges project across the complete visible base frame regardless of drag direction, while document-only ranges remain clipped to the scrollable viewport and continue following their source rows. The progress status gains no mouse handler, capture, focus request, or control hit region.

Manual acceptance then exposed input/footer-origin gestures and clipboard presentation cases not represented by the original three-case regression. Terminal-routed coverage now exercises held-button and no-button movement beginning on the input and footer/status rows. Visual selection remains complete-frame, while clipboard extraction admits only persistent transcript rows: transient status, autocomplete/input, footer/status, and whitespace-only ranges do not submit clipboard work. A sole submitted prompt copies semantic prompt text without `❯`, padding, or timestamp; the same prompt retains its visible chrome in a larger transcript range. Copied acknowledgement text now preserves the selected blue background rather than resetting a dark block beneath itself.

## Validation

- A pre-fix terminal-fixture regression covering spinner-originated, downward, and upward drags passed the spinner-originated and upward cases and failed the downward case because the dock endpoint had no selection paint.
- `npx vitest run test/ui/components/progress-status.test.ts test/integrations/pi/components/progress-status-animation.test.ts test/ui/components/transcript-viewport.test.ts test/app/session-shell/session-viewport-controller.test.ts test/app/session-shell/session-shell-selection.test.ts test/app/session-shell/session-shell-viewport.test.ts` — passed 239 tests across 6 files after the manual-feedback regressions were added.
- `npm run build && npm run typecheck` — passed. An earlier typecheck before building lacked generated `dist` declarations used by `tsconfig.bin.json`; building produced the declared artifacts and the complete typecheck then passed.
- `npm run check:architecture` — passed all architecture, product identity, pinned Pi source-ledger, and terminal-host provenance checks.
- `npm run check:code-documentation:changed` — passed with no violations.
- `npx openspec validate fix-progress-spinner-mouse-selection --strict --no-interactive` and `git diff --check` — passed.

## Known gaps

None.

## 1. Notice routing

- [ ] 1.1 In `session-shell-root.ts`, make `appendWorkflowStatus` store the message as the current dock notice in the custom-viewport route while the pinned route keeps its anchored transcript component; verify a bare-A1 `Switched to …` result renders no `workflow-status-` transcript entry and one dim notice row in the dock.
- [ ] 1.2 Render the notice in `#renderDockLayout` as one blank row plus `renderPiShellStatusText` rows placed after the non-live status rows and before the above-editor widgets, and include it in `editorOffset`; verify the on-screen order is working status (when live), blank, notice, blank, editor border, and that a long message wraps at the dock width.

## 2. Replacement and dismissal

- [ ] 2.1 Replace the notice in place on a newer informational message; clear it when a new transcript block is mounted, when a non-informational workflow presentation is appended, and in `resetWorkflowPresentation`; verify a streamed revision update to an existing block keeps the notice, a new assistant or prompt block removes it, an appended error removes it, and `/new` removes it.
- [ ] 2.2 Keep the notice out of `documentRows`, selection, copy, prompt navigation, persistence, and transcript order; verify a selection dragged into the dock excludes the notice text and `#syncTranscript` never resurrects it.

## 3. Route isolation and evidence

- [ ] 3.1 Confirm the pinned `a1 pi` route is byte-for-byte unchanged by running the existing informational-status and command-message fixtures in `test/integrations/pi/session-ui/session-shell.test.ts` untouched, and add custom-viewport fixtures for placement, replacement, dismissal, and the full-then-dock-only composition sequence in `rendering-budgets.test.ts` where dock height changes are counted.
- [ ] 3.2 Run the focused session-shell, viewport, and rendering-budget tests plus typechecking, record the commands and outcomes, and confirm with `./scripts/dev` that `/model` in a fresh session shows the confirmation directly above the editor and that it disappears on the next submitted prompt.

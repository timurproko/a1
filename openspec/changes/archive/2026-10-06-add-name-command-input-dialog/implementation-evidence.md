# Implementation Evidence

## Implemented behavior

- Bare-A1 `/name` opens the existing compact single-line input with the `Session Name` title, standard prompt row, and shared submit/cancel hints.
- A non-empty submitted value re-enters the direct naming workflow, preserving session-name normalization and result presentation.
- `/name <name>` continues to apply immediately without opening a dialog.
- Escape and whitespace-only submission close silently without changing the current name.
- The explicit `a1 pi` comparison profile retains its pinned argument-free warning behavior.

## Automated validation

- `npx vitest run test/app/session-shell/session-shell-workflows.test.ts test/integrations/pi/components/extension-ui-bridge.test.ts test/integrations/pi/engine/workflow-runner.test.ts` — 30 tests passed.
- `npm run build` — passed and produced the interactive candidate.
- `npm run typecheck` — passed after the build supplied the bin contract's generated `dist` imports.
- `npm run check:architecture` — passed after re-pinning the intentional 659-byte startup-graph increase from the name-dialog route.
- `npx openspec validate add-name-command-input-dialog --strict` — passed.
- `git diff --check` — passed.

## Manual review

The maintainer approved the built interactive candidate after handoff for `/name <name>`, argument-free `/name`, typed Enter submission, Escape cancellation, whitespace-only dismissal, title/input/shortcut spacing, and restoration of the ordinary prompt.

## Known gaps

None.

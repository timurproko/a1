# Implementation evidence

Implementation continued in the linked `E:/Git/a1/.worktrees/status-bar-manual-copy` worktree and draft PR #758 after the maintainer approved the plan and explicitly requested implementation.

## Results

- Dock composition now declares the final rows rendered by the footer/status presenter without classifying prompt input, autocomplete, widgets, notices, or transient `Working…` rows as status-bar copy sources.
- Frame-selection capture has separate automatic and explicit intents. Selection release remains persistent-transcript-only, while `Ctrl+C` additionally admits selected footer/status rows and clears the retained selection through the existing path.
- Status-only release produces no clipboard work or acknowledgement even when fullscreen auto-copy is enabled. The subsequent `Ctrl+C` delivers the selected visible status text through the existing bounded asynchronous clipboard coordinator and shows one existing copy acknowledgement.
- Mixed explicit selections preserve eligible transcript and status rows in frame order, retain lone-prompt semantic copying, omit intervening dock chrome, and keep dock selection anchored across output and geometry changes.

## Validation

- `npx vitest run test/ui/components/transcript-viewport.test.ts test/app/session-shell/session-viewport-controller.test.ts test/app/session-shell/session-shell-selection.test.ts` — 3 files and 203 tests passed, covering status-only, mixed, reverse, partial-column, whitespace, prompt, dock-only recomposition, pinned-selection, clipboard acknowledgement, and excluded-chrome behavior.
- Focused `/copy` workflow and `a1 pi` fullscreen comparison-profile tests passed in `session-shell.test.ts` and `session-shell-paste.test.ts`.
- `npm run build` and `npm run typecheck` — passed. An initial typecheck before building lacked generated `dist` declarations used by `tsconfig.bin.json`; building produced those prerequisites and the complete source/bin typecheck passed.
- `npm run check:architecture` — passed architecture, product-identity, pinned Pi source-ledger, and terminal-host provenance checks.
- `npm run check:code-documentation:changed` — passed with no violations.
- `openspec validate copy-status-bar-on-demand --strict` and `git diff --check` — passed.

## Known gaps

None.

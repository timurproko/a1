# Implementation evidence

Implementation continued in the linked `E:/Git/a1/.worktrees/autocopy-input-status-selection` worktree and draft PR #793 after the maintainer approved the plan and explicitly requested implementation.

## Results

- Dock composition now declares exact ordinary prompt-text and footer/status rows as copyable while leaving prompt rules, counters, autocomplete entries, widgets, notices, transient progress, alignment rows, and replacement input surfaces excluded.
- Complete-frame release and retained-selection `Ctrl+C` use one eligible-row policy. The existing live `Copy on select` setting controls release-time submission, while explicit copy remains available when it is disabled.
- Editor-owned prompt word and line multi-click selection exposes exact expanded semantic text without collapsing the highlight and submits it automatically only when `Copy on select` is enabled.
- Prompt, status, transcript, and mixed snapshots continue through the existing bounded asynchronous coordinator, newest-intent ordering, failure handling, and `copied N chars to clipboard` acknowledgement.
- A newer complete-frame selection owns `Ctrl+C` over an older retained editor selection, preventing stale prompt selection from displacing an explicit status or frame copy.

## Validation

- `npm exec vitest -- run test/ui/components/selection-copy.test.ts test/ui/components/transcript-viewport.test.ts test/app/session-shell/session-viewport-controller.test.ts test/integrations/pi/components/editor-autocomplete-placement.test.ts test/app/session-shell/session-shell-selection.test.ts` — 5 files and 239 tests passed, covering exact bounded snapshots, prompt/status row classification, full and dock-only composition, auto-copy toggling, editor multi-click ownership, mixed payloads, exclusions, and acknowledgements.
- `npm exec vitest -- run test/app/session-shell/session-shell.test.ts test/integrations/pi/components/pinned-editor-input-parity.test.ts` — 2 files and 35 tests passed, covering adjacent `/copy` behavior and comparison-profile isolation.
- `npm run build` and `npm run typecheck` — passed. An initial typecheck in the fresh worktree lacked generated `dist` declarations used by `tsconfig.bin.json`; building produced those prerequisites and the complete source/bin typecheck then passed.
- `openspec validate copy-input-and-status-on-selection --strict` and `git diff --check` — passed.

## Known gaps

None.

# Implementation evidence

## Result

- Bare-A1 default-editor autocomplete keeps its pinned inner list width and row content while using a one-cell outer gutter; selected menu markers now align horizontally with the working indicator.
- Autocomplete and persistent-history counters begin at visual cell three with unchanged dim styling and full-width borders. History overflow cues remain independently centered or omitted when complete labels cannot coexist.
- Prompt text retains the two-cell `❯ ` prefix, menu height and body offsets remain unchanged, and comparison-profile rendering stays on the pinned path.

## Validation

- `npx vitest run test/ui/components/prompt-input.test.ts test/integrations/pi/components/editor-autocomplete-placement.test.ts test/integrations/pi/components/history-editor-core.test.ts test/integrations/pi/components/history-editor-shell.test.ts test/app/session-shell/session-shell-history.test.ts test/app/session-shell/session-shell-selection.test.ts` — 53 tests passed across prompt composition, both history modes, narrow borders, terminal paint, streaming spinner alignment, shell geometry, and comparison isolation.
- `npm run build` — passed and produced the repository-checkout interactive candidate.
- `npm run typecheck` — passed for source and bin projects after the build completed. The pre-build invocation reported only the expected missing generated `dist` imports in the fresh worktree and was superseded by the successful post-build run.
- `npm run check:architecture` — passed after synchronizing the reviewed owned-source provenance records and local hashes.
- `openspec validate align-input-menu-and-counters --strict` — passed.
- `git diff --check` — passed.

## Manual handoff

Build and launch the repository checkout with `./scripts/dev`. While the working indicator is visible, type `/` and confirm the selected menu arrow shares its one-cell gutter. Navigate until the completion counter appears and confirm it starts one cell left of the prior position. Recall saved prompts with Up and confirm short and `100/100` history counters use the same inset without moving the prompt or centered overflow cue.

## Known gaps

- Physical-terminal visual confirmation remains for maintainer review; deterministic component, shell, and terminal-cell evidence covers the requested geometry.

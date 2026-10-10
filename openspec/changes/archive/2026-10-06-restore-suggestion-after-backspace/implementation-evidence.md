# Implementation evidence

## Repair

The pre-existing one-character regression passed while rendering the editor directly, but the session shell did not explicitly republish an available suggestion when an editor mutation returned the prompt to empty. The repaired lifecycle adds a bounded controller operation that reasserts only retained `available` ghost text. The shell invokes it in a microtask after the editor's empty change, allowing Backspace-owned autocomplete cleanup to finish before the scheduled terminal frame.

The production-path regression now types the multi-character draft `draft`, removes it through five terminal Backspace events, verifies the suggestion stays hidden until the final deletion, and observes `run the tests` in terminal writes from that final transition. It also verifies the shell explicitly republishes the same suggestion, generation occurs once, and Tab accepts without submitting. Controller evidence verifies restoration adds neither a second request nor a second diagnostic outcome.

## Validation

- `npx vitest run test/app/session-shell/prompt-suggestion-controller.test.ts test/app/session-shell/session-shell-suggestions.test.ts test/integrations/pi/components/shell-components.test.ts` — passed: 3 files, 115 tests.
- `npm run build` — passed.
- `npm run typecheck` — passed after the required build generated ignored runtime declarations; the pre-build invocation failed only because those generated `dist` modules were absent in the fresh worktree.
- `npm run check:architecture` — passed after repinning the reviewed startup source-byte ceiling from 1,547,798 to 1,548,646; file count, optional modules, and Pi public artifact limits are unchanged.
- `npm run check:code-documentation` — passed.
- `npm run check:code-documentation:changed` — passed.
- `npx openspec validate restore-suggestion-after-backspace --strict --no-interactive` — passed.
- `git diff --check` — passed.

## Known gaps

None. Interactive terminal confirmation remains the maintainer acceptance step.

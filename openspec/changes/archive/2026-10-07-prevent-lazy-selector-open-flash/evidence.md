# Implementation evidence

## Result

- Bare A1 prepares the optional Thinking Level and Session Tree modules after its first input-ready frame while keeping their loader and component code outside the eager startup graph.
- `/thinking`, `/tree`, and double-Escape Session Tree opening hold terminal presentation across pending lazy construction, then force one current repaint with the requested selector instead of exposing the cleared ordinary prompt.
- Nested presentation holds are reference-safe, and a failed selector load releases presentation, restores usable ordinary input, and reports the rejected submission.
- Thinking Level and Session Tree content, interaction, cancellation, nested tree transitions, and the `a1 pi` comparison profile remain unchanged.

## Validation

- `npm run build` — passed for the implementation candidate.
- `npm run typecheck` — passed for source and bin projects.
- `npx vitest run test/integrations/pi/tui-runtime/adapter.test.ts test/app/session-shell/session-shell-workflows.test.ts test/integrations/pi/components/lazy-selectors.test.ts test/integrations/pi/components/prompt-input-ux.test.ts test/integrations/pi/components/tree-selector.test.ts --maxWorkers=1 --minWorkers=1` — 5 files and 71 tests passed, including shared and rejected module preparation, pending Thinking Level and Session Tree loads, slash and double-Escape tree entry, failure recovery, nested hold release, and retained selector behavior.
- `npm run check:architecture` — passed with 159 eager files and the reviewed 1,564,821-byte source baseline; `lazy-selectors.ts` and both selector component modules remain optional.
- `npm run check:code-documentation`, `npm run check:code-documentation:changed`, and `npm run check:docs-governance` — passed.
- Strict OpenSpec validation and `git diff --check` — passed.

## Known gaps

None.

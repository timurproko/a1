## 1. Expose the presentation-mode boundary

- [x] 1.1 Add a read-only central theme query for whether the semantic accent projection is active, and verify focused theme tests distinguish bare-A1 and comparison modes without changing theme bytes.

## 2. Apply the secondary range role

- [x] 2.1 Adapt only the built-in read fallback's call renderer to resolve its line-range suffix through `mdHeading` in bare A1, and verify `offset: 95, limit: 170` renders `:95-264` with the Settings heading style across representative live accent changes.
- [x] 2.2 Preserve the original read title, path, compact forms, range arithmetic, spacing, and geometry, and verify focused renderer fixtures cover omitted and partial range arguments.
- [x] 2.3 Keep result warnings, extension-owned read renderers, and projection-disabled comparison rendering outside the adapter, and verify warning-role assertions plus exact owned-versus-pinned comparison bytes.

## 3. Complete implementation evidence

- [x] 3.1 Run focused tool-rendering and theme suites, type checking, strict OpenSpec validation, and diff review; record results and explicit known-gap disposition in implementation evidence.

## Implementation evidence

- `npm run build` passed after refreshing the owned startup budgets for the added adapter.
- `npm run typecheck`, `npm run check:architecture`, and `npm run check:code-documentation:changed` passed.
- Focused Vitest run passed: 2 files, 42 tests; the selected rendering-smoke tier passed 2 files and 5 tests.
- `openspec validate accent-read-line-range --strict` and `git diff --check` passed.
- Manual render smoke confirmed `:95-264` matched `mdHeading` and changed ANSI foregrounds between purple and green accents.
- Diff review confirmed the proxy is supplied only to the owned built-in read call renderer; result warnings, extension renderers, and comparison mode retain their original theme.
- Known gap disposition: `npm run test:fast` passed 4,428 tests and failed only the two pinned-public-API assertions because TypeScript resolves `Keybindings` differently through this linked worktree's `node_modules` junction; the same baseline check passes from the primary checkout with the same dependency directory, so this is a worktree-link artifact unrelated to the change.

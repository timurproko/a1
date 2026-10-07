## Validation

- `npx vitest run test/app/session-shell/session-shell-workflows.test.ts test/integrations/pi/components/session-selector.test.ts` — passed 2 files and 21 tests.
- `npm run build` — passed and produced development runtime artifacts for manual testing.
- `npm run typecheck` — passed both source and bin configurations after the build generated required runtime declarations.
- `npm run check:architecture` — passed architecture, product identity, pinned Pi source-ledger provenance, and terminal-host provenance checks.
- `npx openspec validate refine-resume-session-search-guidance --strict` — passed.
- `git diff --check` — passed.

## Behavior evidence

- The empty Resume Session field renders `re:<pattern> regex, "phrase" exact`; its non-caret text uses the same faint presentation as existing search suggestions, and typed query text replaces it without adding placeholder content.
- The complete ordinary footer occupies one row in the requested order, exposes dynamic path state and optional rename, and preserves `Esc close` when constrained.
- Existing selector coverage continues to pass for filtering, scope cycling, navigation and selection, sort and named filters, path display, rename, delete confirmation and protection, transient feedback, empty states, progressive loading, cancellation, and shell restoration.
- The copied-source ledger and provenance header record the owned placeholder and one-line footer deviations; the comparison profile remains unchanged.

## Known gaps

None identified.

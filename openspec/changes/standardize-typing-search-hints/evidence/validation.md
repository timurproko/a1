# Implementation evidence

## Result

- Models and Session Tree now render the exact typing guidance `Type search`.
- `Type` uses the shared quiet key role while `search` uses the shared muted action role; neighboring hints retain their existing order and spacing.
- Models keeps its clipped close-suffix footer, Session Tree keeps entry-aware wrapping, and search input, filtering, navigation, and the pinned comparison profile remain unchanged.
- The Session Tree copied-source provenance and local hash record the owned typing-hint presentation.

## Local validation

- `npm exec -- vitest run test/ui/components/shortcut-hints.test.ts test/integrations/pi/components/models-dialog.test.ts test/integrations/pi/components/tree-selector.test.ts test/app/session-shell/session-shell-workflows.test.ts` — 4 files and 51 tests passed.
- `npm exec -- vitest run test/repository-governance/pi-modal-surface-inventory.test.ts` — 1 file and 3 tests passed.
- `npm run build` — passed.
- `npm run typecheck` — passed after the build produced the bin typecheck's required `dist` declarations.
- `npm run check:architecture` — passed, including the refreshed pinned Pi source ledger.
- `node node_modules/@fission-ai/openspec/bin/openspec.js validate standardize-typing-search-hints --strict` — passed.
- `git diff --check` — passed.

## Known gaps

None.

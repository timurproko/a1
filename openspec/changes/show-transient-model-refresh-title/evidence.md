# Implementation evidence

## Result

- A successful Models-dialog catalog refresh removes the body progress row and renders success-colored `(refreshed)` beside the title for one second.
- The marker composes with dirty scope state as `Models (unsaved) (refreshed)` and disappears without changing the persistent `(unsaved)` state.
- A newer progress or warning outcome cancels the success marker; timeout and failure details remain visible in the body.
- Repeated success replaces the dismissal timer, and dialog disposal clears it so no closed surface requests a late render.
- Catalog row reconciliation, query, selection, pending scope edits, model switching, and authenticated-provider authority remain unchanged.

## Local validation

- `npx vitest run test/integrations/pi/components/models-dialog.test.ts test/app/session-shell/session-shell-models.test.ts` — 2 files and 25 tests passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npx openspec validate show-transient-model-refresh-title --type change --strict --no-interactive` — passed.
- `git diff --check` — passed.

## Manual handoff

Build with `npm run build`, launch with `./scripts/dev`, and open `/models`. Confirm refresh success appears briefly as `(refreshed)` beside `Models` (and beside `(unsaved)` after a scope edit), then disappears without leaving `Model catalogs refreshed.` at the bottom. Timeout or failure details should remain readable in the body.

## Known gaps

None. Physical-terminal visual confirmation is the prepared maintainer handoff, not an implementation gap; deterministic rendering and lifecycle behavior are covered by the focused component and shell tests.

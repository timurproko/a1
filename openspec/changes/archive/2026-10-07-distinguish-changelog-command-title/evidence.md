# Implementation evidence

## Result

- Bare A1 now opens the complete packaged history from `/changelog` under the `Changelog` title.
- The automatic current-release document supplied after an eligible update continues to open under `What's New`, with its content, deferred startup lifecycle, and acknowledgement behavior unchanged.
- The pinned `a1 pi` in-feed changelog presentation remains unchanged.
- Presenter inventory and manual visual-check guidance now describe the distinct command and startup titles.

## Validation

- `npm run build` — passed for the final implementation candidate.
- `npm run typecheck` — passed for source and bin projects.
- `npx vitest run test/composition/settings-route-host.test.ts test/app/session-shell/session-shell-reference-screens.test.ts test/features/owned-ui/reference-screen-app.test.ts test/repository-governance/pi-presenter-ownership-inventory.test.ts` — 4 files and 41 tests passed, covering both changelog title contexts, reference-screen behavior, startup routing, and presenter ownership.
- `npm run check:architecture` — passed, including the unchanged bounded startup graph.
- `npm run check:docs-governance` and `npm run check:code-documentation:changed` — passed.
- `npx openspec validate distinguish-changelog-command-title --strict` and `git diff --check` — passed.

## Known gaps

None.

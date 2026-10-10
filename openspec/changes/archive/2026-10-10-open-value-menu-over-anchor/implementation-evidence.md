# Implementation Evidence

## Delivered behavior

- A value menu is laid over its anchor so the entry for the value in effect occupies the source row, with earlier choices above and later choices below.
- Near either body edge the menu shifts only as far as needed to stay inside the body.
- A pointer-opened Settings menu highlights the value in effect immediately; moving the pointer onto another entry highlights that entry, and moving off the menu clears the highlight.
- Keyboard opening, navigation, Escape cancellation, Enter confirmation, and press-outside dismissal are unchanged.

## Validation

- `npx vitest run test/ui/components/value-menu.test.ts test/features/owned-ui/settings-app.test.ts test/repository-governance/owned-settings-interaction-boundary.test.ts` — passed: 71 tests across 3 files.
- `npm run build` — passed.
- `npm run typecheck` — passed.
- `npx openspec validate open-value-menu-over-anchor --strict --no-interactive` — passed.
- `git diff --check` — passed.

## Known gaps

None. The maintainer checked the interactive placement and pointer highlight in `/settings` with the built candidate.

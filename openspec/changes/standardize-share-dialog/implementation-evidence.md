## Implemented behavior

- Bare A1 selects an owned `Share` operation dialog built on the shared modal frame; the pinned `a1 pi` profile continues to select the upstream bordered loader.
- The share title follows the top rule directly, the progress and semantic `Escape/Ctrl+C cancel` hint inherit the one-cell frame inset, and the hint is directly adjacent to the bottom rule.
- Escape and Ctrl+C abort the same signal passed to the existing share workflow, preserving the established cancellation and editor-restoration lifecycle.
- A successful bare-A1 share decorates only its viewer and gist status URLs with the theme's `mdLink` role and exact OSC 8 targets; ordinary statuses and the surrounding labels retain their previous presentation.

## Automated evidence

- `npm run build` — passed.
- `npm run typecheck` — passed after the build produced the bin contract's required `dist/` declarations.
- `npx vitest run test/integrations/pi/components/shell-components.test.ts test/app/session-shell/session-shell.test.ts test/integrations/pi/components/modal-frame.test.ts test/ui/components/spans.test.ts test/ui/components/visible-hyperlinks.test.ts test/repository-governance/pi-modal-surface-inventory.test.ts` — 6 files and 135 tests passed.
- `npx openspec validate standardize-share-dialog --strict` — passed.
- `git diff --check` — passed.

## Manual evidence

On 2026-10-06 the maintainer reviewed the pushed interactive candidate in the supported terminal and reported that it looked good. This accepts the standard bare-A1 `Share` dialog presentation, its compact bottom spacing and aligned hints, the generated viewer/gist link appearance and interaction, and the unchanged comparison-profile behavior. No implementation gap is known.

# Validation evidence

## Implemented behavior

- The bare-A1 footer resolves `off`, `minimal`, `low`, `medium`, `high`, and `xhigh` at fixed positions `0`, `0.2`, `0.4`, `0.6`, `0.8`, and `1` on an OKLCH interpolation from semantic dim grey to the active semantic accent.
- `off` renders through the theme's exact `dim` role and `xhigh` through its exact `accent` role; intermediate levels derive from the active concrete endpoint colors before terminal-mode conversion.
- Only the primary active level span uses the gradient. Model/provider text, separators, routed-model details, usage, width fitting, hidden/no-model behavior, editor borders, and the pinned comparison footer retain their prior paths.
- Focused coverage exercises all six selectable accents against dark/light themes in truecolor and 256-color modes, including live reprojection through the same footer instance.

## Automated evidence

- `npx vitest run test/integrations/pi/components/prompt-input-ux.test.ts test/integrations/pi/components/pinned-theme-parity.test.ts` — 2 files and 45 tests passed.
- `npm run build` — passed and produced the repository runtime artifacts.
- `npm run typecheck` — passed after the required build-first sequence populated `dist` for bin typechecking.
- `npm run check:architecture` — passed, including the refreshed copied-source digest and an exact 870-byte startup-source budget increase for the eagerly used gradient presentation.
- `npm run check:code-documentation:changed` — passed.
- `npx openspec validate accent-thinking-level-gradient --strict` and `git diff --check` — passed.

## Pending physical evidence

Build-first interactive review remains pending. It must confirm the visible low-to-high progression, exact `xhigh` match after changing Accent color, grey `off`, neutral adjacent footer cells, and unchanged `a1 pi` presentation before task 3.2 can complete and the PR can become ready.

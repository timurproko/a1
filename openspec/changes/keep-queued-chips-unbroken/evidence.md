## Automated evidence

- `npx vitest run test/integrations/pi/components/shell-components.test.ts test/app/session-shell/session-shell-viewport.test.ts` — passed: 2 files, 70 tests. Coverage includes every canonical chip family, forced continuation wrapping, adjacent and repeated chips, dynamic queue/keybinding updates, ordinary bracketed text, oversized Unicode fallback, pinned comparison isolation, and the reported transient-viewport screenshot case with queue order, guidance, and scrolling.
- `npm run build` — passed and produced the expected emitted artifacts for build-dependent checks.
- `npm run typecheck` — passed after the build established the fresh worktree's expected `dist/` imports. The pre-build attempt failed only because those generated imports were absent.
- `npm run check:architecture` — passed after re-pinning the measured eager graph from 1,523,209 to 1,523,717 source bytes; reachability remains 157 files and the Pi public artifact remains 2,044 files / 9,581,110 bytes.
- `npm run check:code-documentation` — passed with no violations.
- `npm run check:docs-governance` — passed with the inventoried legacy occurrences unchanged.
- `node scripts/pi/update-startup-graph-baseline.mjs --check` — passed at the exact updated baseline.
- `npx openspec validate keep-queued-chips-unbroken --strict` and `git diff --check` — passed.

## Pending physical evidence

Task 3.2 remains open for a Windows Terminal run of the exact pushed implementation. The reviewer should queue prose ending near the right edge followed by an image chip and confirm that a fitting chip starts intact on the next row; a chip wider than the full content width should remain complete across width-bounded rows.

## Automated evidence

- `npx vitest run test/ui/components/prompt-chip.test.ts test/integrations/pi/components/shell-components.test.ts test/app/session-shell/session-shell-viewport.test.ts test/app/session-shell/session-shell.test.ts` — passed: 4 files, 103 tests. Coverage includes every canonical chip family, uninterrupted prefix/suffix text, adjacent and repeated chips, dynamic queue/keybinding updates, ordinary bracketed text, one-row oversized ellipsis, complete retained source, pinned comparison isolation, and the reported steering-to-submitted-content path.
- `npm run build` and `npm run typecheck` — passed and produced/checked the emitted candidate. The first fresh-worktree typecheck attempt preceded the initial build and failed only because its expected `dist/` imports were absent.
- `npm run check:architecture` — passed after re-pinning the reviewed shared presenter at 158 files / 1,525,486 source bytes; the Pi public artifact remains 2,044 files / 9,581,110 bytes.
- `npm run check:code-documentation` — passed with no violations.
- `npm run check:docs-governance` — passed with the inventoried legacy occurrences unchanged.
- `node scripts/pi/update-startup-graph-baseline.mjs --check` — passed at the exact updated baseline.
- `npx openspec validate keep-queued-chips-unbroken --strict` and `git diff --check` — passed.

## Physical evidence

The first pushed implementation (`013201a5`) failed physical review: when a screenshot chip directly touched a long `s` run, Windows Terminal showed the chip split in both pending `Steering:` and submitted content. The repair adds reversible token boundaries on both sides of every canonical chip and replaces the former oversized multirow fallback with one width-bounded ellipsized label.

The reviewer rebuilt and launched exact pushed repair `47cc3434` in Windows Terminal, repeated the reported uninterrupted-text screenshot-chip flow, and confirmed “works now.” The fitting chip remained atomic in pending `Steering:` and after promotion to submitted content; the agreed narrower-than-chip behavior is one width-bounded label truncated with `…`, backed by the focused resize/source-retention evidence above.

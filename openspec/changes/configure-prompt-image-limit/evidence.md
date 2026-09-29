# Implementation evidence

## Result

- Bare A1 exposes a live, profile-local `Prompt image limit` Agent setting from 1 through 16 and preserves 8 as the default; settings-free and comparison compositions receive no owned limit and retain the fixed eight-image policy.
- Prompt-chip paste admission and final preparation use the current effective limit, while the owned command boundary remains fail-closed at 16 attachments and count diagnostics name the applicable limit.
- Image-count notices carry typed ownership and retire when a setting increase, ready-image removal, or failed overflow-marker removal makes the draft compliant. A newer unrelated notice is preserved, and failed images are never retried or promoted.
- The reviewed startup baseline is 158 reachable files / 1,529,979 source bytes and 2,044 Pi-public files / 9,593,368 evaluated bytes.

## Validation

- `npm run build` and `npm run typecheck` — passed for emitted, source, and bin projects.
- `npx vitest run test/contracts/owned-ui/image-attachments.test.ts test/app/session-shell/prompt-chips.test.ts test/app/session-shell/paste-executor.test.ts test/app/session-shell/session-shell-paste.test.ts test/ui/settings/declarations.test.ts test/ui/settings/sections.test.ts test/ui/settings/manager.test.ts test/features/owned-ui/settings-app.test.ts --maxWorkers=1` — 8 files and 241 tests passed, covering settings persistence/migration/order, limits below and above eight, the 16/17 command boundary, synchronous and isolated paste admission, ordinary and queued preparation, live-limit changes, corrected notices, and unrelated-notice preservation.
- `npx vitest run test/composition/prompt-suggestion-diagnostics.test.ts --maxWorkers=1` — 6 tests passed, including bare-A1 limit composition and comparison/settings-free isolation.
- `npm run check:architecture`, `npm run check:code-documentation`, and `npm run check:docs-governance` — passed.
- `node scripts/pi/update-startup-graph-baseline.mjs --check`, `npx --no-install openspec validate configure-prompt-image-limit --strict`, and `git diff --check` — passed.

## Known gaps

None.

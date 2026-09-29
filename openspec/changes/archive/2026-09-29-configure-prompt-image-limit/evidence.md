# Implementation evidence

## Result

- Bare A1 exposes a live, profile-local `Prompt image limit` Agent setting from 1 through 16 and preserves 8 as the default; settings-free and comparison compositions receive no owned limit and retain the fixed eight-image policy.
- Prompt-chip paste admission and final preparation use the current effective limit, while the owned command boundary remains fail-closed at 16 attachments and count diagnostics name the applicable limit.
- Image-count notices carry typed ownership and retire when a setting increase, ready-image removal, or rejected overflow-marker removal makes the draft compliant. Count-rejected attachments render as dimmed atomic `not sent` chips, do not consume a sendable slot, and are omitted from successful submission and reusable history without retry or promotion.
- Image-bearing prompt dispatch uses the live `Sending…` spinner until settlement and then restores extension/engine-owned working presentation; it does not fabricate per-image transport progress.
- The reviewed startup baseline is 158 reachable files / 1,533,020 source bytes and 2,044 Pi-public files / 9,593,368 evaluated bytes.

## Validation

- `npm run build` and `npm run typecheck` — passed for emitted, source, and bin projects.
- `npx vitest run test/contracts/owned-ui/image-attachments.test.ts test/app/session-shell/prompt-chips.test.ts test/app/session-shell/paste-executor.test.ts test/app/session-shell/session-shell-paste.test.ts test/ui/settings/declarations.test.ts test/ui/settings/sections.test.ts test/ui/settings/manager.test.ts test/features/owned-ui/settings-app.test.ts --maxWorkers=1` — 8 files and 241 tests passed, covering settings persistence/migration/order, limits below and above eight, the 16/17 command boundary, synchronous and isolated paste admission, ordinary and queued preparation, live-limit changes, corrected notices, and unrelated-notice preservation.
- `npx vitest run test/composition/prompt-suggestion-diagnostics.test.ts --maxWorkers=1` — 6 tests passed, including bare-A1 limit composition and comparison/settings-free isolation.
- `npx vitest run test/contracts/owned-ui/image-attachments.test.ts test/app/session-shell/prompt-chips.test.ts test/app/session-shell/session-shell-paste.test.ts --maxWorkers=1` — 3 files and 118 tests passed after warning refinement, including exact limit guidance, warning presentation without an error label, submission wording without an unrelated recovery instruction, and corrected-notice retirement.
- `npx vitest run test/app/session-shell/prompt-chips.test.ts test/app/session-shell/session-shell-paste.test.ts test/app/session-shell/session-shell-viewport.test.ts --maxWorkers=1` — 3 files and 132 tests passed after inactive-overflow refinement, including dimmed `not sent` presentation, accepted-subset dispatch/history, live `Sending…` status, and extension-status restoration.
- `npx vitest run test/integrations/pi/components/pinned-status-indicator-parity.test.ts test/integrations/pi/components/progress-status-animation.test.ts test/ui/components/progress-status.test.ts --maxWorkers=1` — 3 files and 16 tests passed, preserving pinned status and progress-animation behavior.
- `npm run check:architecture`, `npm run check:code-documentation`, and `npm run check:docs-governance` — passed.
- `node scripts/pi/update-startup-graph-baseline.mjs --check`, `npx --no-install openspec validate configure-prompt-image-limit --strict`, and `git diff --check` — passed.

## Known gaps

None.

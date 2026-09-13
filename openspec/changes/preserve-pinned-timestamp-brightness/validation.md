# Implementation validation

Accepted proposal: PR #367. Implementation base: `dfc32530` (develop after proposal merge). Required planning CI passed in run `34756739315`.

## Change and regression evidence

The owned prompt anchor now carries optional semantic timestamp columns derived from the shared layout. The neutral viewport forwards that metadata only to quiet painting. The owned painter clears additional faint intensity within those columns after applying the existing quiet style, using the existing bounded span helper to restore surrounding state. No palette, persisted timestamps, source rows, navigation, rendering scheduler, or comparison-route behavior is changed.

The strengthened real-shell regression failed before the fix: quiet timestamp foreground attributes included the faint bit (`134217728`) whereas the prominent timestamp did not. It passes after the fix with identical timestamp foreground color, faint, and bold attributes while the prefix/content still fade.

Coverage includes both normal prompts and completed compactions; all scrollbar appearances; source, prominent, quiet, hover, and reverse-scroll states; width changes across timestamp omission; missing/invalid metadata; clock-like prompt content; anchor replacement; adjacent padding and next-row intensity isolation; and unchanged background styling. Engine normalization of unavailable compaction timestamps to epoch zero remains unchanged and is explicitly covered. Existing navigation, selection/copy, link, cache, tool-content, and comparison regressions are retained.

## Commands and results

- `env -u PI_OFFLINE npx vitest run test/integrations/pi/components/compaction-prompt.test.ts test/integrations/pi/components/shell-components.test.ts test/integrations/pi/session-ui/session-shell.test.ts test/ui/components/submitted-prompt.test.ts test/ui/components/transcript-viewport.test.ts test/integrations/pi/session-ui/transcript-content-retention.test.ts test/integrations/pi/engine/tool-rendering.test.ts`: **352 passed, 0 failed**.
- `env -u PI_OFFLINE npx vitest run test/integrations/pi/tui-runtime/input-responsiveness-budgets.test.ts`: **1 passed**. No rendering budget, timeout, scheduler, or assertion threshold was weakened; issue #366 remains a separate investigation.
- `npm run typecheck`: passed.
- `node scripts/governance/check-code-documentation.mjs --mode full --root .`: passed.
- `openspec validate preserve-pinned-timestamp-brightness --strict`: passed.
- `git diff --check`: passed.
- `npm run build`: passed.
- No local `test:fast`, `test:full`, or `test:release` tier was run. Synthetic diagnostic/session artifacts are not committed.

## PR handoff

Implementation PR: #368. The first implementation commit is `2e8af2e0`; CI run `34757417696` was in progress when checked. GitHub confirmed the PR open and conflict-free, with `auto_merge: null`. Required implementation CI remains pending; the final handoff-record commit starts a fresh candidate check. Task 3.3 remains incomplete until user visual acceptance is recorded.

## Manual review pending

Worktree: `D:/Git/a1/.worktrees/pinned-timestamp-brightness-impl`

Branch: `fix/pinned-timestamp-brightness`

A fresh synthetic session was generated using `scripts/pi/create-compaction-review-session.mjs` and copied locally to `.artifacts/timestamp-review.jsonl`. It contains no private transcript and requires no model call.

```sh
npm run build && ./scripts/dev --session .artifacts/timestamp-review.jsonl
```

Use Shift+Up to find the compaction, scroll through and beyond its full summary with the pointer away from the pinned row, then hover and leave the pinned row. The timestamp must retain precisely its pre-dimming gray appearance; only the rest of the row fades after all source rows scroll out. Click to return to the source, compare ordinary prompts, and resize across timestamp omission.

Headless evidence is not physical visual acceptance. Keep the implementation PR open, with auto-merge disabled, until required CI succeeds and the user validates the exact candidate and explicitly authorizes merge. The earlier `prompt-style-compaction` acceptance finding remains open; neither change is archived by this implementation.

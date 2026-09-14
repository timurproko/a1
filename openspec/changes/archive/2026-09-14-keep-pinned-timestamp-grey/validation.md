# Implementation validation

## Candidate

- Implementation worktree: `D:/Git/a1/.worktrees/keep-pinned-timestamp-grey-impl`
- Branch: `fix/keep-pinned-timestamp-grey`
- Accepted planning PR: #372
- The shell supplies the existing natural first row as an optional prominent variant. The viewport chooses it only while non-hovered and before the block becomes quiet; existing quiet/hover source rows and painters are unchanged. Paint-cache keys include the selected row and no transcript-wide work is added.

## Local evidence

- `npx vitest run test/ui/components/transcript-viewport.test.ts test/integrations/pi/session-ui/session-shell.test.ts test/integrations/pi/session-ui/session-viewport-controller.test.ts`: 335 tests passed.
- Coverage includes resolved source/prominent timestamp cells, all quiet/hover transitions, hover exit, reverse scrolling, prompts/compactions, invalid/missing metadata, clock-like content, reflow and scrollbar changes, navigation, selection/link retention, comparison-route behavior, bounded dock rendering, and source-variant paint caching.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `openspec validate keep-pinned-timestamp-grey --strict`: passed.
- `npm run check:docs-governance`: passed.
- `git diff --check`: passed.
- No broad local test tier or generated baseline update was run.

## CI correction

PR #375's first candidate (`1fe784bd`) failed changed-file documentation validation with DOC005 at `session-shell.test.ts:407`: a new implementation comment lacked the required category prefix. Added `Compatibility:` without changing test or runtime behavior. `node scripts/governance/check-code-documentation.mjs --root . --mode full` now passes with no violations. The earlier docs-governance command checks a different policy and did not cover this failure. Replacement CI on `914e5937` passed all required checks before #375 merged.

The user initially reported “test failed” without details; clarification was requested to distinguish this confirmed CI failure from a possible local launch or visual failure. Their later explicit acceptance and archival confirmation resolves that pending report; see acceptance.md. The independent Windows guardian failure is tracked in #377 and did not recur in the accepted required CI run.

## Physical review handoff and acceptance

Create a disposable session with the existing `scripts/pi/create-compaction-review-session.mjs`, then launch it through `./scripts/dev --session <generated-path>` after building. Press Ctrl+Home, keep the pointer away from the header, and scroll down slightly into the long compaction summary. The pinned timestamp must remain the same grey as its source before the summary leaves view. Hover must retain its existing highlighting; leaving hover restores grey. Scrolling beyond the full summary retains existing quiet-row dimming. Repeat with a multiline ordinary prompt.

Required CI and acceptance are recorded independently in acceptance.md. The maintainer merged #375, then explicitly confirmed acceptance, archival, and cleanup on 2026-09-14. This closes tasks 3.1 and 3.2 without inventing earlier acceptance or additional physical-terminal evidence. Older changes' pending acceptance is not altered.

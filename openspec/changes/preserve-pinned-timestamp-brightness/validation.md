# Revised implementation validation

Initial proposal: PR #367. Implementation PR: #368, based on `dfc32530`. During review the user explicitly approved revising this specification and implementation together to restore pre-#360 ordinary-prompt styling and reuse it unchanged for compactions. The previous candidate `3c30153c` and its timestamp-only intensity exemption are rejected, not visually accepted. Their earlier passing tests verified a now-superseded contract.

## Baseline restoration

The reference is develop `53e924c8`, immediately before #360. A local source comparison using `git show 53e924c8:src/integrations/pi/session-ui/session-shell-root.ts` confirms that the restored `pinnedPromptSourceRow` function and shared sticky/quiet painters exactly match that commit. `git diff --exit-code dfc32530 -- src/ui/components/transcript-viewport.ts test/ui/components/transcript-viewport.test.ts` passes: neither the timestamp-column API nor its dedicated test remains.

Relative to the implementation base, the only production change is restoring the pinned timestamp's `userMessageText` foreground and the helper's original explanatory comment. Compaction anchors, full summaries, normal-weight headings, shared styling, and navigation already exist from #360 and remain intact. Unrelated renderer repairs are not reverted.

Naturally visible source timestamps remain metadata-colored. Prominent and hovered pinned timestamps use the normal prompt foreground, white in the default dark theme. Quiet styling applies to the whole pinned row, including the timestamp. No protected timestamp span, special compaction palette, or new hover policy remains.

## Regression evidence

Before the restoration, all three revised scrollbar-state tests failed: the pinned timestamp was `#666666` while baseline prompt text was `#d4d4d4`. After restoration, all nine focused style/edge-case tests pass. They compare equivalent prompts and compactions across source, prominent, quiet, hover, hover-leave, and reverse scrolling, asserting both foreground and faint/bold attributes and row backgrounds.

Retained edge cases cover unavailable/invalid timestamps, the engine's existing epoch-zero compaction fallback, narrow widths, resize, clock-like prompt text, anchor replacement, adjacent padding, and next-row intensity isolation. Existing navigation, semantic copy, links, cache reuse, tool content, and comparison-route regressions remain in place.

## Commands and results

- `env -u PI_OFFLINE npx vitest run test/integrations/pi/components/compaction-prompt.test.ts test/integrations/pi/components/shell-components.test.ts test/integrations/pi/session-ui/session-shell.test.ts test/ui/components/submitted-prompt.test.ts test/ui/components/transcript-viewport.test.ts test/integrations/pi/session-ui/transcript-content-retention.test.ts test/integrations/pi/engine/tool-rendering.test.ts`: **351 passed, 0 failed**.
- `env -u PI_OFFLINE npx vitest run test/integrations/pi/tui-runtime/input-responsiveness-budgets.test.ts`: **1 passed**. No assertion threshold, rendering budget, timeout, or scheduler change; #366 remains separate.
- Typecheck, full code-documentation governance, strict OpenSpec validation, diff checks, and build passed.
- No local `test:fast`, `test:full`, or `test:release` tier was run. Synthetic sessions and diagnostic logs remain local artifacts.

## Manual acceptance pending

Worktree: `D:/Git/a1/.worktrees/pinned-timestamp-brightness-impl`

Branch: `fix/pinned-timestamp-brightness`

```sh
npm run build && ./scripts/dev --session .artifacts/timestamp-review.jsonl
```

Use Shift+Up to reach the compaction, scroll through and beyond its full summary with the pointer away, then hover and leave the pinned row. Compare with ordinary prompts: both label and timestamp should become quiet together and return to baseline bright foreground on hover. Click to return to full source, test Shift+Down, and resize. The source timestamp keeps its original metadata appearance; there is no constant-brightness exception for the pinned timestamp.

Keep #368 open with auto-merge disabled until required CI succeeds and the user validates the exact revised candidate and explicitly authorizes merge. The earlier compaction acceptance finding also remains open. Neither this revision nor headless tests constitute physical visual acceptance or archival.

# Implementation evidence

Accepted planning change: `fix-selection-endpoints`, spec PR #233 (merge `82c8948037a2f7041e06bc308765523781a7c266`).

## Scope audit

- The sole production consumer of the shared selection helpers is `TranscriptViewport`. Bare A1's owned fullscreen shell reaches it through `SessionViewportController`; both paint and copy already use the same normalized range. No consumer-side production changes were necessary.
- The pinned comparison layout disables that controller. Its fallback behavior, prompt-editor selection, terminal-owned regular-mode selection, `a1 pi`, installed/upstream Pi packages, dependencies, and presentation scheduling are unchanged.
- Ordinary clicks remain empty; an accepted drag returning to its anchor selects one complete grapheme. Existing rendered source-row indentation and source filtering are preserved.

## Local evidence (2026-09-05)

- 129 tests passed across `text-selection.test.ts`, `transcript-viewport.test.ts`, `session-viewport-controller.test.ts`, `session-shell.test.ts`, and `terminal-paint-evidence.test.ts`.
- Real shell terminal writes were replayed at 192x54 to assert exact selection-background cells through both reversal directions, return/release at the anchor, copy clearing, and both multiline block endpoints. Clipboard bytes were asserted separately.
- Existing row-damage reuse, no-button continuation, semantic clicks, source/chrome filtering, hyperlinks, streaming, auto-scroll, and restoration assertions remain intact.
- `npm run typecheck`, `npm run build`, `./scripts/dev --help`, `openspec validate fix-selection-endpoints --strict`, and `git diff --check` passed.
- No local `test:fast`, `test:full`, or `test:release` run. Required CI results remain pending; tasks 3.2 and 3.3 must stay open until those results are recorded.

## Manual handoff

Worktree: `D:/Git/a1/.worktrees/fix-selection-endpoints` (detached).
Delivery branch: `fix/selection-endpoints`. The accompanying PR/reply identifies the exact commit.

```sh
cd D:/Git/a1/.worktrees/fix-selection-endpoints && npm run build && ./scripts/dev
```

In bare A1, run `!printf 'abcde\nfghij\n'` to create selectable output without an agent request. Hold the mouse on `c`, drag to `b`, back to `c`, then to `d`: expect `bc`, `c`, then `cd`, never an empty highlight. Return to `c`, release, and copy: expect exactly `c`. Drag across both output rows in both directions, stopping on the first/last source characters: both boundary characters must be included. Check clipboard text and try Unicode, ordinary clicks, and word/line selection too.

Known acceptance gap: no physical-terminal acceptance has been reported. Record the tested commit, terminal geometry, and user-observed highlight/copy results before completing task 4.2. The code PR must remain open for manual validation and explicit merge authorization; do not archive yet.

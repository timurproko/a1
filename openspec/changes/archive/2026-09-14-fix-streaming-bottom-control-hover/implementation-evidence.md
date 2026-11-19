# Bottom-control hover implementation evidence

## Candidate and scope

- Accepted specification: [PR #307](https://github.com/timurproko/a1/pull/307), integrated as `0423ce63`.
- First-paint regression commit: `d01381c8`.
- Implementation commit: `6943f437ba97b1cc6118884cec7394481eabc0fb`.
- Implementation worktree: `D:/Git/a1/.worktrees/implement-streaming-bottom-hover`.
- Publication branch: `fix/streaming-bottom-control-hover`.

The root now checks live document, transient, geometry, ownership, interaction, and selection inputs before reusing viewport rows. Document identity refers to cached semantic rows, not a freshly concatenated array. Unchanged dock-only input no longer copies the complete transcript tail. Published revision and pointer metadata describe the frame actually composed, and a subsequent keyboard frame cannot perpetuate an older hover under a newer revision.

Production changes are limited to the owned shell root and a read-only pointer accessor on its controller. The payload-free root evidence accessor does not render. Bounded capture and classification live under `test/support/rendering/`; they are disabled by default and have no installed logger, automatic session capture, or new CLI. Pinned package files, `a1 pi`, terminal protocols, and stream scheduling remain unchanged.

## Reproduced failure before the fix

On base `0423ce63`, both parameterizations of `paints the first editor-then-hover frame with hovered=%s` failed against actual scheduled terminal writes:

| Transition | Expected dark-theme RGB | First painted RGB before fix |
| --- | --- | --- |
| Enter | `#3a3a4a` | `#282832` |
| Leave | `#282832` | `#3a3a4a` |

The fixture sends editor input and a mouse report before the runtime's queued paint, then inspects the first synchronized terminal write. It does not call `root.render` or `renderNow` to repair or inspect the post-input result. Both tests pass with the implementation. Subsequent ordinary typing retains the button background, uses dock-only composition, performs no settled-block rendering, and paints only dock/cursor rows.

## Separate scroll-only evidence

The six `paints scroll-only hover checkpoints ...` cases passed for 60-by-16 and 192-by-54 geometry, each with no stream, assistant output, and tool output. These workloads send no editor input. Named checkpoints include:

- `wheel-reveal`;
- `hover-leave-with-stream-pending` and `hover-enter-with-stream-pending`;
- two `stationary-hide-*` / `stationary-reveal-*` cycles;
- `spinner-and-stream-flush` and `completion` for active-stream cases.

At each checkpoint, the first scheduled frame's pointer/revision metadata and replayed control-cell RGB agree with the declared input sequence. The detached reading position remains stable during streamed growth. Isolated no-stream hover paints only the button row with no full-screen clear; mixed-stream changes retain separately attributable content/rail/status damage. Complete-write background replay covers each checkpoint, and a real hover transaction also reaches identical final cells when synchronization is honored or ignored by token replay.

The bounded metadata capture correlates routed SGR reports, composition, and cell-paint observations with sequence numbers and relative times. Tests cover disabled capture, limits, truncation, and exclusion of editor payloads and unrelated sentinel fields. Classification tests distinguish missing reports, stale composition, incorrect paint, physical-only discrepancies, and inconclusive captures.

**Physical scroll-only verdict: inconclusive / not yet accepted.** The synthetic cases did not reproduce a scroll-only failure. They do not establish that the user's physical symptom is resolved, and the confirmed cache-race result is not used as a substitute for that verdict.

## Local validation

- Seven focused suites: **262 tests passed**.
- `npm run typecheck`: passed.
- `npm run check:architecture`: passed, including source-ledger/package-boundary checks.
- `npm run check:code-documentation:changed`: passed.
- `openspec validate fix-streaming-bottom-control-hover --strict`: passed.
- `npm run build`: passed.
- Change-specific required CI: pending publication/result; task 4.3 remains open until its result is recorded.

The focused suites cover shell/controller/viewport behavior, bounded hover diagnostics, stream coalescing, input coordination, and damage-aware terminal painting. They include existing selection/copy, modal bypass, stationary hover, resize, hyperlink cleanup, transient-tail, and terminal-restoration cases. This is not a new verdict on the broader independent rendering-stability matrix.

Focused repeat command:

```sh
cd D:/Git/a1/.worktrees/implement-streaming-bottom-hover && npx vitest run test/integrations/pi/session-ui/session-bottom-hover.test.ts test/integrations/pi/session-ui/session-shell.test.ts test/integrations/pi/session-ui/session-viewport-controller.test.ts test/integrations/pi/session-ui/stream-presentation-coalescer.test.ts test/ui/components/transcript-viewport.test.ts test/integrations/pi/tui-runtime/damage-aware-terminal.test.ts test/integrations/pi/tui-runtime/input-presentation-coordinator.test.ts
```

## Exact-artifact manual handoff

Build and run the implementation worktree through its color-preserving shell entry:

```sh
cd D:/Git/a1/.worktrees/implement-streaming-bottom-hover && npm run build && ./scripts/dev
```

For the unchanged comparison route, build first and use `./scripts/dev pi` from that same worktree; it intentionally has no A1 bottom control.

In bare A1, use a populated conversation and request a response long enough to keep generation active. While it streams:

1. Scroll upward, then move onto and off the center of "Jump to bottom" without typing. Expect the highlight to follow the latest reported position while output continues.
2. Keep the pointer at the button position, wheel to the end so it hides, then wheel upward so it reappears. Repeat; the first visible button frame should already be highlighted.
3. Repeat while typing a character into the editor immediately before moving onto or off the button. Expect both the newest editor text and correct hover in the next frame, without another motion or token repairing it.
4. Click the control and verify it returns to the current end. Press outside it and verify it does not activate. Check ordinary typing, selection, and resize still behave normally.

Record the exact tested commit, terminal name/version, dimensions, theme/color mode, scrollbar settings, and separate results for the editor-race and scroll-only sequences. If a miss persists, record whether clicking still jumps and moving away/back restores the highlight. No user-controlled physical acceptance has been recorded; tasks 5.2 and 5.3 remain open, and the code PR must not merge merely because synthetic hover tests pass.

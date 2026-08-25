## Why

A1 becomes unusable during a long agent run, and vanilla Pi in the next terminal tab
does not. In a session that had been running for an hour the working indicator vanished
while content was still streaming, the wheel and left-button selection stopped working,
and finally the editor stopped accepting keys altogether while output kept arriving. The
process was not blocked — it had burned 441 seconds of CPU. Input became responsive again
the moment generation stopped, and the mouse never recovered at all.

Three things in A1's own code cause it, and pinned Pi `0.84.2` shows what each should
have been.

Per-token cost grows with the transcript. Every engine event calls `#syncView`, which
deep-copies the whole transcript twice (`pi-engine-adapter/adapter.ts:922`,
`pi-owned-ui-integration/session-shell.ts:773-775`), resyncs component order with a
containment scan inside a loop (`session-shell.ts:531`), and every frame re-renders every
block after locating it with a linear search inside a `flatMap` (`session-shell.ts:249`).
Pinned Pi mutates one live component instead: `interactive-mode.js:2572` creates a single
`AssistantMessageComponent` at `message_start`, each `message_update` calls `updateContent`
on that one component, and finalized blocks are never touched again. It rebuilds the chat
exactly once, after compaction.

Event delivery never yields. The queue is drained by a synchronous `while` loop inside a
microtask (`adapter.ts:2030`, `adapter.ts:2055`), so a burst of streaming events runs to
exhaustion before the event loop turns. Typed keys, mouse reports, and the spinner's timer
are all waiting on that turn. Pinned Pi coalesces a render request behind a flag and
schedules the frame with `setTimeout` at a sixteen-millisecond floor (`tui.js:499`,
`tui.js:533`, `tui.js:110`), which yields between frames, and gives input its own
preempting path so a keystroke never waits for a streaming frame.

Working state is cleared by events that do not end the work. `agent_settled` is folded
into `agent_end` (`adapter.ts:1613`), and `auto_retry_end` and `compaction_end` blanket-clear
lifecycle and working message (`adapter.ts:1647`) — including the `willRetry` case, whose
flag A1 discards. Because the indicator is only built while lifecycle is `busy`
(`pi-component-adapter/shell-footer-status.ts:154`), any premature clear removes it outright
for the rest of the run. Pinned Pi keys its indicator by kind and clears by kind:
`clearStatusIndicator(kind)` returns early unless the active indicator is that kind
(`interactive-mode.js:1624`), `agent_end` clears only `"working"`, `compaction_end` clears
only `"compaction"`, and `agent_settled` changes no status at all.

Pointer reporting is also left on. A1 turns reporting on for an owned screen presented as a
main-screen overlay (`session-shell.ts:1427`) and turns it off only in that screen's own close
path (`session-shell.ts:1449`), so shutdown and session replacement leave the terminal
reporting and the terminal's native scroll and selection stay dead after A1 stops using them.
That already contradicts the paired-enable requirement this change amends. Pinned Pi enables
reporting only on the alternate screen, where leaving it restores the terminal by construction
(`tui-alt-screen.js:14-16`).

## What Changes

- Streaming keeps the shell responsive: per-event work stops depending on transcript
  length, and event delivery yields to the event loop so typing, pointer input, and timed
  indicators are serviced while output streams.
- Working, retry, and compaction state are each cleared only by the event that ends that
  work. Settling, a finished retry, and a finished compaction that continues the turn leave
  the indicator standing.
- Pointer reporting is disabled on every path that ends the screen using it, including
  session shutdown and session replacement, so the terminal is never left reporting.

## Capabilities

### Modified Capabilities

- `owned-pi-ui-foundation`: streaming output holds the shell's responsiveness, and working
  state survives events that do not end the work.
- `ui-components`: pointer reporting is paired against session teardown and session
  replacement, not only against a screen's own close path.

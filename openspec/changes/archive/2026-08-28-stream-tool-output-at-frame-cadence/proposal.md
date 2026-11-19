## Why

A long tool execution freezes the whole shell. When the agent runs a command that
streams heavily — a `git worktree add` checking out ~2,000 files with progress lines, an
`npm ci` — the spinner stops animating, typed input is not echoed, and nothing recovers
until the command exits. Vanilla Pi running the same command stays live. The process is
not blocked on the child; the event loop is saturated by A1's own per-chunk work.

The engine emits one `tool_execution_update` per output chunk, and each update restates
the whole accumulated output. Three costs in A1 grow with that stream:

- The engine adapter's tool-execution upsert summarized the full partial result on every
  chunk: `jsonSummary` deep-copies the accumulated output through `sanitizeJson` and
  `JSON.stringify`s it — megabytes restringified per chunk, truncated to 512 characters
  afterwards. Quadratic work over the stream, and the payload's `result` summary is never
  read for a partial: the transcript presenter renders partials from the block's text
  alone.
- Every transcript-block event made the session shell rebuild the full view model, and
  the view recomputed usage by walking every session entry (`#readUsage`), plus context
  and subscription lookups, once per chunk.
- Applying one streamed block invalidated the whole shell root: every component's render
  cache dropped per chunk, so each frame re-wrapped the entire transcript. The pinned
  shell dirties only the component the chunk touched.

The fourth cost is the flood itself: chunks arrive far faster than a terminal frame can
show, and A1 paid full event-pipeline cost for every one of them.

## What Changes

- Tool-execution updates are coalesced to a frame-like cadence: only the newest partial
  per tool call is applied, on a short timer. Start and end events keep applying
  immediately, and an end supersedes any partial still waiting.
- A partial tool result is no longer summarized as JSON; only the final result is. The
  partial's block text still carries the accumulated output for rendering.
- The view model's usage section is memoized and recomputed only on events that can move
  it (anything other than a message or tool-execution stream chunk, and any full view
  emit) instead of on every view read.
- Applying one transcript block invalidates only that block's cached rows; the shell root
  is no longer invalidated wholesale per chunk.

## Capabilities

### Modified Capabilities

- `owned-pi-ui-foundation`: a streaming tool execution costs frames rather than chunks,
  and the shell stays typeable with its timed indicators running for the duration of the
  command.

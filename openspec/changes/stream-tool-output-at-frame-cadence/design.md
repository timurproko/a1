## Context

This fix was first implemented against the pre-restructure tree
(`src/integrations/pi/engine/adapter.ts`,
`src/integrations/pi/session-ui/session-shell-root.ts`) and re-applied after the
structure change moved the files to `src/integrations/pi/engine/adapter.ts` and
`src/integrations/pi/session-ui/session-shell-root.ts`. The document names symbols rather
than line numbers so it survives further moves.

## Mechanics

### Engine adapter (`src/integrations/pi/engine/adapter.ts`)

New state on the adapter class:

```ts
readonly #pendingToolUpdates = new Map<string, Record<string, unknown>>();
#toolUpdateFlush: ReturnType<typeof setTimeout> | null = null;
#usageCache: OwnedUiUsageView | undefined;
```

New constant next to `EVENT_DELIVERY_BATCH`:

```ts
const TOOL_UPDATE_COALESCE_MS = 50;
```

`#handlePiEvent` — first statement after the record/type guard:

```ts
// Usage moves at message and lifecycle boundaries, not with stream chunks, so the
// two streaming event kinds keep the memo and everything else drops it.
if (event.type !== "message_update" && event.type !== "tool_execution_update") this.#usageCache = undefined;
```

`#handlePiEvent` — tool execution cases split:

```ts
case "tool_execution_start":
case "tool_execution_end": {
  // The end supersedes any update still waiting on the coalescing timer.
  const toolCallId = stringValue(event.toolCallId);
  if (toolCallId !== undefined) this.#pendingToolUpdates.delete(toolCallId);
  this.#upsertToolExecutionBlock(event);
  return;
}
case "tool_execution_update":
  this.#coalesceToolExecutionUpdate(event);
  return;
```

New methods:

```ts
#coalesceToolExecutionUpdate(event: Record<string, unknown>): void {
  const toolCallId = stringValue(event.toolCallId);
  if (!toolCallId) return;
  this.#pendingToolUpdates.set(toolCallId, event);
  this.#toolUpdateFlush ??= setTimeout(() => {
    this.#toolUpdateFlush = null;
    if (!this.#disposed) this.#flushPendingToolUpdates();
  }, TOOL_UPDATE_COALESCE_MS);
}

#flushPendingToolUpdates(): void {
  if (this.#toolUpdateFlush !== null) {
    clearTimeout(this.#toolUpdateFlush);
    this.#toolUpdateFlush = null;
  }
  if (this.#pendingToolUpdates.size === 0) return;
  const pending = [...this.#pendingToolUpdates.values()];
  this.#pendingToolUpdates.clear();
  for (const update of pending) this.#upsertToolExecutionBlock(update);
}
```

`#upsertToolExecutionBlock` — the payload's `result` field:

```ts
// A partial result repeats the whole accumulated output on every chunk;
// summarizing it each time would cost quadratic work over the stream.
result: ended ? jsonSummary(source) : { summary: "", json: null },
```

`view()` — usage field: `usage: this.#usageCache ??= this.#readUsage(),`

`#emitView()` — first statement: `this.#usageCache = undefined;`

`flushEvents()` — first statement: `this.#flushPendingToolUpdates();`

`dispose()` — immediately after `this.#disposed = true;`:

```ts
if (this.#toolUpdateFlush !== null) {
  clearTimeout(this.#toolUpdateFlush);
  this.#toolUpdateFlush = null;
}
this.#pendingToolUpdates.clear();
```

### Shell root (`src/integrations/pi/session-ui/session-shell-root.ts`)

`applyTranscriptBlock` — replace the trailing `this.invalidate();` with:

```ts
// One chunk touches one block, and the updated component tracks its own dirtiness.
// Invalidating the whole shell here would re-wrap the entire transcript per chunk.
this.#renderedRows.delete(block.id);
```

## Decisions

- 50 ms coalescing (~20 fps) rather than the TUI's 16 ms floor: tool output is a
  progress surface, not typed feedback, and the cheaper cadence leaves more of the loop
  for input. Start/end stay immediate so short commands render exactly as before.
- One shared timer for all pending tool calls, not a timer per call: parallel tools
  flush together and the adapter never accumulates timers.
- The usage memo is invalidated by event kind, not by time: `message_update` and
  `tool_execution_update` are the only high-frequency kinds and neither can move usage,
  context, or subscription state, which change at message/lifecycle boundaries.
- `flushEvents()` flushes pending partials first so tests and callers that flush observe
  the newest output; without it a coalesced partial could sit unapplied behind an
  awaited queue.

## Risks

- If a later restructure renames the symbols above, map by behavior: the pi-event
  switch, the tool-block upsert, the view-model builder, and the shell root's per-block
  apply.
- If a presenter starts reading `payload.result` for partial tool results, the
  `{ summary: "", json: null }` placeholder must be revisited; today only `block.text`
  feeds partial rendering (see the `partialResult === true` branches in
  `src/integrations/pi/components/shell-presenters-transcript.ts`).

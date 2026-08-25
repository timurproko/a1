## 1. Coalesce tool-execution updates in the engine adapter

- [x] 1.1 In the Pi engine adapter's event handling
  (`src/integrations/pi/engine/adapter.ts`, `#handlePiEvent`), route
  `tool_execution_update` through a coalescer: keep only the newest event per
  `toolCallId` in a pending map and apply the pending set on a single short timer
  (50 ms, `TOOL_UPDATE_COALESCE_MS`)
- [x] 1.2 Keep `tool_execution_start` and `tool_execution_end` immediate, and make the
  end delete that tool call's pending partial before applying, so the final result
  supersedes it
- [x] 1.3 Flush the pending partials synchronously at the start of `flushEvents()`, and
  clear the timer and the pending map in `dispose()`

## 2. Stop summarizing partial results

- [x] 2.1 In the tool-execution block upsert (`#upsertToolExecutionBlock`), build the
  payload's `result` with `jsonSummary(source)` only when the execution ended; a partial
  gets `{ summary: "", json: null }` (the presenter renders partials from `block.text`
  only — verify against the tool-result branch in
  `src/integrations/pi/components/shell-presenters-transcript.ts` before assuming this
  still holds)

## 3. Memoize the view's usage aggregate

- [x] 3.1 Cache the result of `#readUsage()` and serve `view()` from the cache
  (`usage: this.#usageCache ??= this.#readUsage()`)
- [x] 3.2 Drop the cache at the top of `#handlePiEvent` for every event type except
  `message_update` and `tool_execution_update`, and in `#emitView()`

## 4. Invalidate one block, not the shell

- [x] 4.1 In the shell root's `applyTranscriptBlock`
  (`src/integrations/pi/owned-ui/session-shell-root.ts`), replace the whole-shell
  `this.invalidate()` with dropping only that block's entry from the rendered-rows cache
  (`this.#renderedRows.delete(block.id)`); the updated component tracks its own
  dirtiness and the render request comes from the caller (`#syncBlock`)

## 5. Validate

- [x] 5.1 `npx vitest run test/integrations/pi` passes
- [x] 5.2 `npm run test:fast` passes (typecheck plus fast vitest tier)
- [ ] 5.3 Manual acceptance: from an A1 session, have the agent run a command that
  streams heavily for ~10 s or more, e.g.
  `git fetch origin develop --quiet && git worktree add --detach .worktrees/spec-freeze-probe origin/develop && npm ci --ignore-scripts`
  — the spinner keeps animating and typing stays live for the whole run; remove the
  probe worktree afterwards

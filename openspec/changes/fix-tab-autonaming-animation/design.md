# Design

## Context

See `proposal.md` for motivation. Auto-naming currently watches a `busy` to non-busy lifecycle transition in `bindResidentTabBridge`, so it cannot start until the complete tool-using turn settles. Each of its two attempts is limited to 64 output tokens, while the v2 implementation escalated from 4,096 to 32,768 tokens because reasoning models can consume a small budget without emitting title text.

The bridge already carries `nameSource`, the server rejects an automatic registry update after a user-owned rename, and the attach client starts animation only when a tab-list update changes a name whose source is `auto`. However, composition can still execute `/name` after a user renamed while generation was pending, changing the Pi session even though the server rejects the resulting registry update.

The Rust strip already retains animation start time and the old title, but its frames use one approximate color for the whole title, do not preserve the wider endpoint width, and emit generated truecolor sequences even in palette mode. The v2 reference implementation in `E:/Backups/pi/v2/tabs/title-anim.ts` defines the required frame behavior.

## Goals / Non-Goals

**Goals:**

- Begin naming at the semantic first-agent-run boundary and keep it independent of turn completion.
- Give reasoning models enough bounded completion budget to emit a short answer.
- Preserve user ownership across the complete asynchronous generation-and-apply race.
- Match deterministic v2 frame timing, color progression, width, and non-truecolor behavior in the native strip.

**Non-Goals:**

- Changing the `tabsAutoName` setting, 16-character name limit, deterministic fallback policy, bridge protocol generation, or manual rename UX.
- Naming resumed sessions that already have a non-default name, renaming more than once per tab process, or exposing animation settings.
- Importing v2's extension architecture into the resident child.

## Decisions

### 1. Trigger on `agent-run-started`

Composition will launch the one naming attempt from the owned `agent-run-started` event and read the first user transcript block already projected into the session view. This is the closest current semantic equivalent of v2's `before_agent_start` hook and excludes unrelated busy states such as compaction. If no usable prompt exists or the current name is already user-owned, naming remains unattempted only until the first valid run-start event; after a valid request launches, the existing one-attempt guard remains authoritative.

Using the generic transition to `busy` was rejected because it can represent non-agent work. Waiting for `agent-run-settled` is the reported defect.

### 2. Restore v2's bounded budget escalation

The auto-name generator will use the v2-compatible strictly increasing budgets of 4,096 then 32,768 tokens, retaining a per-attempt timeout and deterministic fallback after both attempts fail. The request remains a tool-free `completeSimple` call through the active session model, so it cannot mutate the agent turn and runs concurrently rather than extending its lifecycle.

Keeping 64 tokens was rejected because reasoning tokens share that ceiling for affected providers. An unbounded request or a third attempt was rejected to preserve predictable work.

### 3. Revalidate ownership immediately before apply

After generation resolves, composition will reread the current session name and apply the result only if it is still absent or a default `agent`/`agent N` name. It will mark the generated value as pending only for the duration of the name workflow, allowing emitted session metadata to retain `nameSource: auto`. The server's existing user-source rejection remains defense in depth.

Relying only on server rejection was rejected because `/name` changes the Pi session before the bridge update reaches the server, which can leave the session and chip with different names.

### 4. Port the v2 frame model into the native renderer

The strip will derive animation frames from elapsed time through a deterministic helper used by tests. In truecolor mode it will:

1. Clip old and new endpoints to the chip's title-width budget.
2. Pad active frames to the wider clipped endpoint.
3. Render 600 ms of a moving HSL rainbow over the old title, offset per displayed character.
4. Reveal the new title every 45 ms with a static per-character rainbow.
5. Blend that rainbow toward RGB `170,170,170` for 300 ms, then return the ordinary title.

In palette/non-truecolor mode it will skip rainbow and settle colors but preserve typewriter timing and stable width. ANSI styling will be applied after clipping and width calculation so escape bytes never affect display width or hit targets. Existing automatic-source detection will start an animation only on an actual automatic name change; unchanged list refreshes retain the active animation, and user/default changes cancel rather than start it.

A single generated RGB for the whole title was rejected because it is not the v2 transition. Translating arbitrary generated RGB into palette entries was rejected in favor of v2's plain fallback.

## Risks / Trade-offs

- **[A concurrent naming completion increases model traffic during the main run]** → Keep exactly two bounded attempts, per-attempt abort deadlines, no tools, and one launch per tab.
- **[The first run event could precede transcript projection]** → Read only the authoritative session view and cover event ordering in composition tests; do not synthesize prompt text from terminal output.
- **[Wide or combining titles can destabilize animation layout]** → Clip and measure endpoint text before styling, retain grapheme-safe strip truncation, and test ASCII plus Unicode widths.
- **[Registry refreshes can restart or erase animation]** → Start only on an actual auto-source name change and preserve the existing animation object on unchanged refreshes.

## Migration Plan

No data or protocol migration is required. Existing default, user, and automatic `nameSource` values remain valid. Rolling back restores delayed naming and the approximate renderer without changing persisted tab records.

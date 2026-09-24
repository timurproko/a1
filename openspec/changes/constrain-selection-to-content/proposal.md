## Why

When a selection begins in transcript content and is expanded toward the bottom edge, pointer motion or edge-held scrolling can extend its highlight across the pinned editor/footer rows. The resulting highlight floods fixed shell chrome instead of remaining owned by the content region; Claude Code keeps a scroll-box selection inside its viewport boundary.

## What Changes

- Give a selection started on transcript content transcript-region ownership for the full gesture, clipping paint and visible-frame copy to the current content rectangle.
- Keep that boundary when the pointer moves or is held over the pinned editor/footer, including during edge auto-scroll and at the document limit.
- Treat a sticky prompt as non-selectable chrome while pinned, but keep the prompt selectable at its ordinary document position.
- Keep selection attached to source rows so it shrinks and disappears as those rows scroll out rather than transferring to pinned prompt or status surfaces.
- Preserve editor-originated selection, scrollbar gutter behavior, controls, modal ownership, and `a1 pi` behavior outside this region rule.
- Add deterministic viewport and shell coverage for upward/downward scrolling, direct boundary crossing, sticky prompts, reverse drags, and dock stability.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Keep transcript selection owned by visible scrolling source rows, excluding pinned prompt and dock/status chrome.

## Impact

Expected implementation is limited to bare-A1 transcript selection projection/composition and focused viewport/session-shell tests. No settings, persistence, public API, terminal protocol, content layout, scrollbar geometry, editor-originated selection, or pinned Pi package behavior changes.

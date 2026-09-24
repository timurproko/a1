## Why

When a transcript selection is expanded by edge-held scrolling, its document endpoint can project past the scrollable transcript rectangle and into the pinned editor/footer rows. The resulting highlight floods fixed shell chrome even though the pointer never explicitly crossed into it; Claude Code instead keeps a transcript-originated scrolling selection inside the content viewport while still allowing a deliberate drag across the viewport/dock boundary.

## What Changes

- Keep a selection whose endpoints remain transcript-document anchors visually clipped to the current transcript content rectangle while edge auto-scroll moves either source endpoint off screen.
- Treat an explicit pointer crossing into visible dock text as a complete-frame selection, preserving selection below the transcript when the user asks for it.
- Keep selection copy, scrollbar gutter behavior, controls, modal ownership, prompt selection, and `a1 pi` behavior unchanged outside this region distinction.
- Add deterministic viewport and shell coverage for upward/downward auto-scroll, off-screen endpoint projection, explicit boundary crossing, reverse drags, and dock stability.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Distinguish scroll-induced off-screen transcript projection from an explicit complete-frame drag across the viewport/dock boundary.

## Impact

Expected implementation is limited to bare-A1 transcript selection projection/composition and focused viewport/session-shell tests. No settings, persistence, public API, terminal protocol, content layout, scrollbar geometry, editor selection, or pinned Pi package behavior changes.

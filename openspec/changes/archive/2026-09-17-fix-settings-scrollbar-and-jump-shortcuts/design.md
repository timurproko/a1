## Context

See `proposal.md` for motivation. The settings screen already resolves the effective live `scrollbarSpeed` through the shared scrollbar policy for wheel distance, but its rail is drawn by `withScrollbarRail`, which paints the thin rail whenever `scrollbarGeometry` reports overflow. The transcript viewport decides rail visibility through `scrollbarPresentation` (appearance, style, hover, drag, and a 900 ms activity window after every scroll, repainted by a 925 ms timer) and reserves the rail column for `auto` and `always`. The shared `ScrollbarRails` helper for keyed hover and drag state exists in the component layer but has no consumer yet.

The settings key table maps `[H` and `[F` to `home` and `end`, which the shortcut registry binds to the first and last setting; the search branch intercepts the same two keys before the shared line input sees them. The transcript route (`fix-home-end-shortcuts`, archived 2026-09-14) settled on `Ctrl+Home`/`Ctrl+End` for content boundaries and left unmodified `Home`/`End` to the prompt line.

## Goals / Non-Goals

**Goals:**
- One appearance decision for every scrollable A1 surface: the settings rail asks the same shared presentation policy the transcript asks, with the same inputs.
- The settings rail responds to the pointer the way the transcript rail does, so `auto` has a way to be revealed.
- The same boundary chords across the agent view and the settings screen.

**Non-Goals:**
- No change to `scrollbarGeometry`, `scrollbarPresentation`, the settings declarations, migrations, or the transcript viewport.
- No shortcut customization, no new key decoder, and no change to search-input editing keys beyond letting the shared line input keep the ones it already handles.

## Decisions

### 1. Resolve appearance and style the way speed is resolved

Generalize the existing `#scrollbarSpeed()` lookup into one helper that reads any `Scroll` entry's shown value (pending change first, then the entry, then the session value) and validates it against the allowed literals, falling back to the declared default. `scrollbarWheelRows(this.#scrollbarSpeed())` stays as the wheel-distance call so the existing governance test keeps matching. Changing `Scrollbar mode` or `Scrollbar style` on the screen therefore affects the screen's own rail on the next frame, before the store reflects the value, exactly as speed already does.

### 2. Present the rail through the shared policy and the shared rail state

`render` computes `scrollbarGeometry` as today, then `scrollbarPresentation` with the resolved appearance and style, the rail's hover and drag state from a `ScrollbarRails` instance keyed `settings`, the activity window, and `Date.now()`. The activity window is the transcript's: a frame whose scroll position differs from the previous frame extends it by 900 ms and arms one 925 ms timer that requests a render, so the rail fades without another input. Noticing the move in `render` covers the wheel, a drag, a track page, keyboard jumps, and a search that resets the scroll with one check. Closing the app clears the timer and the rail state. `withScrollbarRail` takes that presentation: when `reservesSpace` is false the rail columns are not reserved and content uses the full width; when it is true but `visible` is false the rail cell is blank; when visible, the track and thumb use the presentation's glyphs, so `thick` and a hovered or dragged thumb draw `┃`. The hit region (rail column at the right edge, rows from the top inset to the body height, current geometry) is recorded per frame the way `#frameRows` already is, and is null when nothing is reserved or the list fits.

### 3. Pointer ownership of the rail

Before the row hit test in `onMouse`, a report whose column and row fall inside the recorded rail region is the rail's. Motion updates hover through `ScrollbarRails.notePointer` and repaints when hover changed. Press on the thumb starts a drag with the grab offset; motion while dragging scrolls with `scrollForThumbRow`; release ends the drag. Press on the track above or below the thumb pages with `scrollForTrackPage`. A pointer that leaves the rail clears hover. Motion over the rail does not set a row hover, and the wheel keeps its whole-pane ownership. The structured dialog and the value menu keep taking the pointer first, as they do now, so the rail never reacts beneath them.

### 4. Boundary chords

Replace the `home`/`end` declarations with `ctrl+home`/`ctrl+end` in the `Navigate` section with the same descriptions. Extend the literal key table with the xterm modifier form (`[1;5H`, `[1;5F`) and the rxvt Ctrl form (`[7^`, `[8^`), and drop the `home`/`end` entries so unmodified keys resolve to no list action. The search branch intercepts `ctrl+home`/`ctrl+end` for the list jump and lets `Home`/`End` fall through to `handleLineInputKey`, which already moves the search cursor. The status bar hint set is unchanged because the boundary keys were never advertised there; shortcut listings derive from the declarations.

## Risks / Trade-offs

- [The rail column disappears under `hidden`] → Content width grows by the rail columns and the value column shifts; this matches the transcript's `hidden` behavior and is covered by a width assertion.
- [`auto` looks like a missing scrollbar to a keyboard-only reader] → This is the setting's meaning on the transcript; `always` remains available, and the default stays `auto` per the existing spec.
- [Terminal intercepts `Ctrl+Home`/`Ctrl+End`] → Same host caveat as the transcript change; physical acceptance uses Windows Terminal/Git Bash, which forwards them.
- [Test fixtures still send `[H`] → Every fixture is retargeted by intent: list jumps use the Ctrl forms, and a new search test asserts `Home`/`End` move the cursor rather than the selection.

## Migration Plan

No data or dependency change. Readers who used `Home`/`End` on the settings screen switch to `Ctrl+Home`/`Ctrl+End`, which the shortcut listing shows. Rollback reverts the key table, declarations, rail presentation, and tests together.

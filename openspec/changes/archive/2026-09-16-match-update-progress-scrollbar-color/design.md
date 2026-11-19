## Context

See `proposal.md` for motivation. The update command renders its progress frame without loading the interactive Pi theme, and it deliberately uses explicit 24-bit ANSI foreground colors so terminal palette remapping cannot change the intended presentation. The current renderer already separates completed glyphs, remaining-track glyphs, and percentage text into color runs.

## Goals / Non-Goals

**Goals:**

- Give the completed run the requested scrollbar-aligned teal while preserving the existing muted track and neutral percentage.
- Keep output deterministic in terminals that support the current 24-bit ANSI sequence.
- Preserve every non-color aspect of the update meter.

**Non-Goals:**

- Loading user or Pi theme configuration during self-update.
- Changing scrollbar rendering, progress milestones, animation, dimensions, glyphs, or output cleanup.
- Adding a new color configuration setting.

## Decisions

### Use a fixed `#8abeb7` foreground for completed progress

The renderer will emit `38;2;138;190;183m` before completed glyphs. This directly reproduces the requested teal and is the same RGB value as A1's established dark accent. A fixed RGB value also preserves the update command's independence from interactive theme initialization.

Alternatives considered:

- **Load the active theme and resolve `scrollbarThumb`:** rejected because update currently has no theme context, custom scrollbar tokens can be background colors, and adding profile/theme I/O would broaden a presentation-only change.
- **Use a named ANSI color:** rejected because terminal palette remapping would make the result inconsistent.

### Retain existing track and percentage colors

The remaining track stays `#666666` and the percentage stays `#808080`. Only the completed run changes, keeping contrast and scope aligned with the requested screenshot.

### Assert the complete ANSI frame

The existing table-driven unit test will continue to cover clamping and fill geometry while expecting the new completed-run escape sequence. This detects accidental color bleed and confirms the final foreground reset remains present.

## Risks / Trade-offs

- [A fixed dark-presentation accent may be less ideal on unusual light terminal backgrounds] → Preserve the current explicit-color model and limit the change to the requested visual; do not introduce theme-loading complexity into update.
- [A shared color value could drift elsewhere] → Document the intended RGB in the behavioral delta and focused renderer assertion so future changes are explicit.

## Migration Plan

Ship as a presentation-only update. Rollback restores the previous completed-run gray escape sequence; no data or configuration migration is required.

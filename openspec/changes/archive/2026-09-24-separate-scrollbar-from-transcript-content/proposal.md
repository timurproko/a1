## Why

The transcript scrollbar currently overlays the final content column, so its track cuts through full-width tool and message backgrounds and can make the right edge look broken while the rail is visible. The scrollbar needs a stable gutter that stays visually separate from transcript text and blocks without changing scroll behavior.

## What Changes

- Place the bare-A1 transcript rail in a dedicated final-column gutter instead of drawing it over transcript text or block backgrounds.
- Render ordinary transcript content within the remaining width so text, wrapping, and full-row backgrounds end at one consistent edge beside the gutter.
- Keep the gutter stable across `auto`, `always`, and temporary visibility transitions so showing or hiding the rail does not reflow content or produce jagged block edges.
- Preserve scrollbar hover, drag, paging, wheel speed, selection/copy semantics, dock layout, and the pinned `a1 pi` comparison route.
- Add component, shell, and decoded terminal-cell regressions for plain, styled, selected, linked, and wide-character rows at the content/gutter boundary.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Replace the transcript rail's content-overlay behavior with a stable dedicated gutter while preserving interaction and semantic content boundaries.

## Impact

- Expected implementation areas: `src/app/session-shell/session-shell-root.ts`, `src/ui/components/transcript-viewport.ts`, and focused viewport rendering tests.
- The canonical custom-session viewport contract will no longer require ordinary source text or block backgrounds beneath the rail cell; right-edge selection remains truthful at the new content boundary.
- Bare A1 only; no dependency, settings-schema, persisted-data, or comparison-profile changes.

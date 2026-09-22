## Why

The bare-A1 keyboard-shortcut screen renders its table section labels like ordinary bold Markdown and leaves a blank row before each table. That presentation is looser and less scannable than the owned Settings screen, whose section labels use the yellow accent and sit directly against their section content.

## What Changes

- Render every `/hotkeys` section label, including optional Models dialog and Extensions sections, with the same bold accent treatment used by Settings section headers.
- Remove the blank row between each shortcut section label and its table while retaining the existing table content, wrapping, section order, scrolling, and surrounding screen chrome.
- Keep the pinned `a1 pi` in-feed hotkeys document unchanged; this refinement applies only to the bare-A1 shortcut reference screen.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Refine the bare-A1 hotkeys reference screen's section styling and vertical spacing.

## Impact

Implementation will affect the bare-A1 hotkeys document presentation assembled in `src/integrations/pi/components/shell-presenters-info.ts` and focused presenter/reference-screen tests. It will not change shortcut declarations, binding resolution, command routing, the changelog screen, or the pinned comparison profile.

This change contains planning artifacts only, not implementation.

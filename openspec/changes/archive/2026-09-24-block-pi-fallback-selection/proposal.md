## Why

Bare A1 can still expose Pi's reverse-video fullscreen selection above the application-owned dark-blue frame selection, producing a white viewport-anchored block that survives inner transcript scrolling and may surface around modified-key interactions. Bare A1 must have exactly one selection owner so no fallback Pi highlight can compete with, obscure, or outlive the owned selection.

## What Changes

- Prevent Pi's outer fullscreen renderer from receiving residual mouse reports on the bare-A1 custom viewport, after A1-owned pre-input surfaces have had their opportunity to route them.
- Keep terminal mouse reporting explicitly owned by bare A1 while preventing the outer Pi renderer from independently enabling or disabling its fallback mouse-selection path.
- Preserve A1 frame selection, controls, overlays, replacement surfaces, wheel handling, right-click paste, and keyboard shortcuts while proving reverse-video fallback selection cannot be created.
- Leave `a1 pi`, regular-mode terminal selection, and pinned Pi package behavior unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: Require bare A1 to maintain exclusive fullscreen selection ownership and suppress Pi's reverse-video fallback across pointer, scrolling, surface, and modified-key input paths.

## Impact

The change affects the Pi TUI runtime adapter's custom-viewport input boundary, bare session-shell runtime configuration, terminal mouse-report ownership, and focused adapter/shell selection tests. It does not change persisted settings, dependencies, comparison profiles, regular-mode behavior, or installed Pi code.

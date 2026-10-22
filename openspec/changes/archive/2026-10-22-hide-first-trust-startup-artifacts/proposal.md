## Why

On a profile's first resident-tab launch, confirming the project-trust dialog can leave a transient animated glyph in the tab chip and a lone cursor in an otherwise blank body before the owned shell appears. The completed first part of this change keeps that handoff visually quiet.

Interactive testing of the same resident surface also exposed two presentation-fidelity defects. Tool rows whose child renderer emits its own SGR reset lose the enclosing pending/success/error background before the available row ends, while the independently composed scrollbar gutter can retain that background. Separately, a jump-to-bottom badge or live `Working` row can survive after its replacement moves or changes, leaving two copies near the dock. The resident view must converge to one coherent current frame instead of exposing styling boundaries or stale prior-frame cells.

## What Changes

- Preserve the completed suppression of the starting lifecycle glyph and child cursor during the blank project-trust-to-shell handoff.
- Keep pending, successful, and failed tool-shell backgrounds active through nested renderer background resets and every available content cell.
- Compose the reserved scrollbar rail over the completed row background without letting the rail split, extend, or substitute for the content background.
- Ensure moved, relabeled, or removed scroll-to-bottom controls and bottom-aligned live-status rows replace their former cells so only the newest content remains visible.
- Make resident content cell-for-cell equivalent to solo output at the same child geometry, including blank-cell colors, attributes, links, wide characters, cursor placement, scrolling, and transient row replacement.
- Add pipeline parity coverage comparing authoritative terminal input with retained capture, wire transport, and differential resident replay, rather than relying on isolated synthetic style/row tests.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: keep the first-run project-trust handoff quiet and make resident structured replay converge to the newest complete child frame without stale rows.
- `owned-pi-ui-foundation`: preserve full tool-shell background geometry when nested renderers reset or change ANSI styles.
- `custom-session-viewport`: keep the scrollbar composition and transient bottom overlays coherent when content, labels, or dock geometry change.

## Impact

- Owned tool-shell row composition under `src/integrations/pi/components/` and focused renderer parity/geometry tests.
- Custom viewport frame/damage composition under `src/ui/components/`, `src/app/session-shell/`, and the Pi TUI runtime adapter where required by the failing boundary test.
- Native retained-surface capture or resident presentation under `native/terminal-host/src/` only where required to make the structured replay converge to the authoritative child frame.
- Existing project-trust choices, lifecycle truth, direct `a1 solo` / `a1 pi` startup behavior, protocol compatibility, and semantic scrollbar ownership remain unchanged.

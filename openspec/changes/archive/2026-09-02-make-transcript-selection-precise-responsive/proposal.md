## Why

Bare A1's application-owned transcript selection cannot select exactly one character with a drag and visibly trails the pointer during multiline selection. The custom fullscreen viewport must provide precise, promptly painted selection without giving up its owned viewport or changing `a1 pi` and untouched Pi.

## What Changes

- Define boundary-accurate transcript drag semantics in which a drag may select exactly one complete grapheme while a click without a drag remains unselected.
- Make forward, reverse, and multiline selection produce symmetric highlighting and exact copied text, including wide and combining graphemes.
- Give selection motion an immediate, latest-state presentation path that is not delayed by stream presentation cadence or stale pointer frames.
- Bound selection repaint work to visible selection damage and stable cached viewport rows rather than repeatedly measuring and repainting the growing selected area or complete transcript.
- Add deterministic selection-state, copy, repaint-damage, scheduler, and producer evidence plus exact-artifact physical comparison in Windows Terminal.
- Preserve the custom fullscreen viewport, editor selection, viewport controls, auto-scroll, ANSI source styling, links, scrollbar overlay, modal ownership, and terminal restoration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Specify one-grapheme drag selection, exact directional and multiline copy behavior, immediate latest-pointer presentation, bounded visible damage, and physical acceptance for bare A1's transcript viewport.
- `ui-components`: Specify boundary-based text-selection primitives and damage-aware cached composition that preserve display-width and styling semantics.

## Impact

Affected areas include the neutral text-selection and transcript-viewport components, the custom session viewport controller and shell-root input/render scheduling, the owned terminal presentation descriptor where selection damage is classified, focused component/integration tests, and terminal-paint evidence. No upstream Pi package, private/deep import, installed dependency, `a1 pi`, untouched Pi, settings behavior, or regular-mode terminal selection is changed.

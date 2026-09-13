## Why

Whole-line and multiline selections can leave the rightmost source character unselected, while hovering the scrollbar can make that same cell appear selected without changing the selected text. The highlight must truthfully represent the source selection before, during, and after scrollbar hover.

## What Changes

- Make the full rendered transcript width reachable by an existing selection drag, including the source character beneath the scrollbar overlay column.
- Keep the rightmost cell's selected or unselected background faithful to its actual range when the scrollbar appears, changes hover style, or disappears.
- Preserve semantic copy output, grapheme integrity, source styling, scrollbar interaction ownership, and existing full-row/padding rules.
- Add focused endpoint, ANSI-cell, shell pointer, and terminal repaint regressions for both selected and deliberately unselected final characters.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Require truthful right-edge selection and hover-invariant selection membership and painting.

## Impact

- Expected implementation areas: `src/ui/components/transcript-viewport.ts`, ANSI span composition in `src/ui/components/spans.ts`, and viewport pointer/theme integration under `src/integrations/pi/session-ui/`.
- Focused tests in component, session-shell/controller, and terminal-paint suites.
- Bare A1 only; no dependency changes, new settings, comparison-profile changes, or broad selection endpoint redesign.
- This is an OpenSpec-only planning change. Code and tests follow in a separate implementation pull request after this specification merges and implementation is explicitly requested.

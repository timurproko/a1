## Why

The Models, Skills, Thinking Level, Session Tree, Settings screen, and slash-command menu still indicate selection with only an accent arrow and accent text. The supplied Resume Session reference uses the clearer blue `selectedBg` surface with readable primary text and muted metadata. Bare-A1 selection should use that palette consistently while preserving each surface's existing arrow icon and item-bounded geometry.

## What Changes

- Apply the Resume Session selection palette to Models, Skills, Thinking Level, Session Tree, Settings, and the bare-A1 slash-command menu: preserve the accent `→`, use normal text for the primary label, retain muted supporting text, and paint the blue `selectedBg` background.
- Limit the selected background to the rendered item span while keeping rows single-line, clipped, and free of whole-row bold styling.
- Preserve each surface's semantic state markers, values, search, navigation, filtering, model scope/default actions, descriptions, counters, and close/select behavior.
- Centralize the owned selected-row rendering contract and add focused ANSI-role, span, clipping, and interaction regressions so these selectors cannot drift independently.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define one selected-row palette for the standard bare-A1 Models, Skills, Thinking Level, Session Tree, Settings, and slash-command menu surfaces.

## Impact

Expected implementation is limited to shared bare-A1 selection presentation helpers, the Models, Skills, Thinking Level, and Session Tree components, the owned Settings list/panel theme, the owned editor's slash-command menu theme, focused component/session-shell tests, and copied-source provenance notes for adapted selectors. Resume Session supplies the accepted color reference; its behavior and specialized full-row geometry are unchanged. Generic extension prompts, session/trust selectors, startup trust, the explicit `a1 pi` comparison profile, dependencies, persisted settings, and workflow outcomes remain unchanged.

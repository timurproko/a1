## Why

The Models, Skills, and Thinking Level dialogs still indicate selection with only an accent arrow and accent text, while the redesigned Session Tree uses a clearer subtle-purple selected row. These standard bare-A1 selectors should communicate focus with one consistent visual treatment instead of making selection strength depend on which dialog is open.

## What Changes

- Apply the Session Tree's selected-row treatment to Models, Skills, and Thinking Level: an accent `→`, accent primary label, muted supporting text, and the subtle purple `customMessageBg` background.
- Limit the selected background to the rendered item span while keeping rows single-line, clipped, and free of whole-row bold styling.
- Preserve each dialog's semantic state markers, search, navigation, filtering, model scope/default actions, descriptions, counters, and close/select behavior.
- Centralize the owned selected-row rendering contract and add focused ANSI-role, span, clipping, and interaction regressions so these selectors cannot drift independently.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Define one selected-row presentation for the standard bare-A1 Models, Skills, Thinking Level, and Session Tree dialogs.

## Impact

Expected implementation is limited to shared bare-A1 dialog presentation helpers, the Models, Skills, and Thinking Level components shown in the supplied captures, focused component/session-shell tests, and the copied-source provenance note for the adapted Thinking selector. Session Tree supplies the accepted visual reference; its tree behavior is unchanged. Generic extension prompts, session/trust selectors, startup trust, owned Settings screens, the explicit `a1 pi` comparison profile, dependencies, persisted settings, and workflow outcomes remain unchanged.

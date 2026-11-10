# Restore direct model cycling and clarify Launcher

## Why

The Apps delivery changed both the model shortcut action and the selector placement. The requested follow-up keeps application launching separate while restoring direct model cycling and the familiar in-place Models selector.

## What Changes

- Bind bare A1's default Ctrl+M to the existing next-model cycle action, with no selector or floating overlay opened by that action. Leave model selection without a replacement default shortcut and retain `/models` and explicit user selection bindings.
- Restore the unified Models selector to its pre-Apps, in-place input-dock presentation and styling rather than a centered floating modal. Retain model search, selection, scope toggling, ordering, saving, and normal transcript interaction.
- Rename the user-facing Apps modal to Launcher and use the single explanatory sentence `Launch Agent, Settings, or Changelog.` beneath its title. Update corresponding help, loading, error, and close labels while keeping Ctrl+P, destinations, and switching behavior intact.
- Keep ordinary Enter unchanged in legacy terminals where Ctrl+M cannot be distinguished from carriage return. Preserve custom keybindings, comparison-profile behavior, and quiet successful model switches with visible warnings and failures.

## Capabilities

### Modified Capabilities

- `ui-shortcuts`: Ctrl+M cycles models directly, Ctrl+P opens Launcher, and effective help separates cycling from explicit model selection.
- `ui-apps`: Launcher naming and description replace Apps presentation without changing application identity or lifecycle.
- `ui-components`: Unified Models returns to in-place presentation; Launcher and nested Settings selectors retain shared floating-modal contrast.

## Impact

The change touches owned shell action declarations and shortcut help, the Models input-surface integration, Launcher copy, related documentation and tests, and the pinned source-port provenance ledger if a synchronized port changes. It does not change engine model-cycle ordering, model scope semantics, application routes, footer PR presentation, or the shared floating-modal palette.

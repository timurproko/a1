## Why

The agent prompt and Settings search draw similar input chrome through different paths, so their bars and arrows drift visually. Thinking-level color belongs on the level name in the status bar rather than on the input frame, and level switching needs a dedicated Ctrl+L binding.

## What Changes

- Use one A1-owned input presentation component for the agent prompt and Settings search, with shared rule, prefix, spacing, and caret composition rather than per-instance ANSI styling. Preserve their multiline editing and single-line filtering behaviors.
- Give both inputs neutral white bars matching the existing Settings search reference, independent of model thinking level. Match both `❯` prefixes to the existing undimmed submitted-prompt arrow, without dim/faint styling.
- Color the agent status-bar thinking-level name with the existing level-to-bar color mapping, including a visible off label when a model is selected. Keep surrounding status text unchanged; use the v2 prototype as a placement reference, not a new palette.
- **BREAKING**: In bare A1, change the default level-cycle shortcut from Shift+Tab to Ctrl+L. Remove the model-selector default shortcut without assigning a replacement; preserve `/model` access. Leave Shift+Tab unassigned and inert in the default agent input, reserved for later use.
- Keep pinned `a1 pi` presentation and defaults unchanged. Existing explicit user keybinding overrides remain configurable; this change does not rewrite user configuration or reserve Shift+Tab in unrelated modal scopes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Shared agent/search input presentation with consistent neutral bars and undimmed prompt prefixes.
- `owned-pi-ui-foundation`: Declare the bare-A1 input/status customization, moving thinking color from bars to the status-bar level label while preserving the pinned comparison profile.
- `ui-shortcuts`: Ctrl+L level cycling, no default model-selector shortcut, and unassigned Shift+Tab in the agent-input scope, with accurate help and conflict handling.

## Impact

Affected implementation areas include `src/ui/components/line-input.ts`, agent editor presentation and selection geometry, Settings search composition, the session footer, A1 keybinding declarations, and profile-aware shortcut help. Tests will cover shared rendering, colored status spans, editing preservation, key dispatch, modal scope isolation, and pinned-profile regressions. No dependency or engine protocol change is required. Implementation will follow separately after this specification merges.

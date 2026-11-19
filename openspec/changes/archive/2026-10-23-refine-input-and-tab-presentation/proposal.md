## Why

Several resident and input surfaces still expose startup or selection artifacts and inconsistent prompt chrome. The requested refinements make launch state immediately legible, distinguish the main user prompt from auxiliary search inputs, and let users place the resident tab bar where it best fits their terminal workflow.

## What Changes

- Hide the outer terminal cursor from the moment resident fullscreen mode starts, so a first launch cannot flash a stray block before the child surface is ready.
- On reattach to an existing resident tab set, identify and highlight the first ordered Agent tab immediately instead of briefly presenting the strip with no active tab.
- Add one leading blank cell before the main bare-A1 user-prompt chevron while preserving semantic editor text, wrapping, selection, and copy behavior.
- Remove chevron markers from auxiliary Agent search/edit inputs and Settings search while retaining their caret, placeholder, rules, and content alignment.
- Add a live `Tab bar position` setting under Tabs with `top` and `bottom` choices, defaulting to `top`; resident composition, cursor placement, overlays, pointer routing, selection, and child geometry follow the chosen edge.
- Restore seamless tab drag-and-drop reordering: movement previews a stable insertion line within the strip, release performs one durable reorder, and a no-op or cancelled drag leaves order unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: resident startup cursor suppression, deterministic initial active-tab presentation, configurable top/bottom tab-strip placement, and seamless drag-and-drop reordering.
- `owned-ui-settings`: the Tabs position control and marker-free Settings and per-model search inputs.
- `owned-pi-ui-foundation`: main prompt leading inset and marker-free auxiliary Agent inputs.
- `contextual-prompt-suggestions`: suggestion and ordinary prompt geometry after adding the leading prompt inset.
- `ui-components`: reusable input composition supports surface-specific prompt markers without changing editing semantics.

## Impact

- Native resident attach, strip, presentation, drag state, reorder routing, overlay, cursor, and mouse-coordinate composition under `native/terminal-host/src/roles/`, plus additive attach-handshake metadata for the initially selected existing tab.
- A1 setting declarations, resolution, persistence, and native settings watching for the new tab-bar position.
- Shared TypeScript prompt/input components and their Agent/Settings call sites.
- Focused TypeScript and Rust tests for exact prompt cells, initial attach state, top/bottom geometry, cursor placement, overlays, and pointer translation.
- `a1 pi`, extension-owned editors, child row count, tab order, and agent/session lifecycle remain unchanged.

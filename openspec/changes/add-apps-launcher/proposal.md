## Why

Settings and Changelog are application surfaces, not Agent commands. A searchable Apps launcher makes switching between Agent, Settings, and Changelog quick, while stronger modal separation and quiet model changes reduce visual noise.

## What Changes

- Add a centered, searchable Apps dialog containing Agent, Settings, and Changelog, using the compact title/search/list/footer layout of the supplied Default Model reference.
- Open Apps with Ctrl+P from Agent, Settings, and Changelog; selecting Agent returns to the existing session without starting another agent or losing its prompt.
- Remove Settings and Changelog from bare A1's Agent built-in command surface while retaining their application routes and startup What's New behavior.
- Assign Ctrl+M to the unified Models dialog and remove the default Ctrl+P model-cycling collision. Preserve Ctrl+L thinking-level cycling, explicit user overrides, and comparison-profile behavior.
- Increase modal/background separation centrally: darken the complete underlying surface reliably and give floating panels a visibly contrasting opaque background, inspired by the supplied Commands reference. Include nested Settings selectors.
- Suppress successful in-session model-switch acknowledgements in bare A1; the existing status bar remains the confirmation. Keep model failures and actionable warnings visible.
- Separate the first-row pull-request link from path/branch with ` • `, matching the session-name separator, without moving the link or changing its click target. The maintainer requested this refinement and directed completion of the remaining PR item.

## Capabilities

### Modified Capabilities
- `ui-apps`: searchable Apps launcher and application switching.
- `ui-shortcuts`: Ctrl+P Apps and Ctrl+M Models defaults and effective help.
- `ui-components`: stronger shared floating-modal contrast and backdrop rendering.
- `a1-shell`: quiet successful model changes and a consistent first-row PR separator in the owned session.

## Impact

The session shell and dialog coordinator, application route composition, command catalogs, A1 input declarations and help, shared modal presentation and its Pi runtime adaptation, focused tests, and user-facing shortcut documentation. No extra agents, sessions, tabs, settings migration, or pinned comparison-profile redesign.

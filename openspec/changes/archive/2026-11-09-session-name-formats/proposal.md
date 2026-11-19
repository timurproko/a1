## Why

Automatic session names currently force lowercase hyphenated labels. Expose the three maintainer-selected formats so users can choose readable sentence or title capitalization without changing existing names.

## What Changes

- Add a live, profile-persisted Agent setting, **Session name format**, offering Kebab case (default), Sentence case, and Title Case.
- Apply the selected format to subsequent automatic generation, context-driven regeneration, and deterministic fallback, retaining the 16-character bound and current ownership/cancellation rules.
- Preserve acronym and mixed-case technical spellings in readable formats. Setting changes do not rewrite existing names or trigger generation; pending generation uses the latest choice.

## Capabilities

### Modified Capabilities
- `a1-shell`: configurable formatting of bounded automatic session names.
- `owned-ui-settings`: the three-choice automatic-name format setting in the Agent group.

## Impact

Session-naming generation, settings declarations/presentation, composition wiring, focused tests, and maintained session-name documentation. No change to manual names, session metadata contracts, or comparison mode.

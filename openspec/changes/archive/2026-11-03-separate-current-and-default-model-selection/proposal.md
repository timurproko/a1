## Why

The bare-A1 Models dialog currently persists every Enter selection as the default model, so a temporary model switch silently changes what later sessions start with. Current-session selection and default-model configuration need separate, explicit surfaces.

## What Changes

- Change Enter in the bare-A1 Models dialog to switch only the active session model and leave the persisted default unchanged.
- Add an Agent Settings entry named `Default model` whose `configure` surface provides a searchable authenticated-model selector and persists the selected model for later sessions without changing the current session.
- Keep model-scope editing and persistence in the Models dialog unchanged, including Space, Ctrl+S, dirty state, filters, refresh behavior, and advanced scope bindings.
- Preserve the pinned `a1 pi` comparison profile's existing model-selection surfaces and persistence behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Separate current-session model switching in `/models` from persisted default-model changes.
- `owned-ui-settings`: Add the searchable `Default model` configuration surface to the owned Settings screen.
- `pi-settings-runtime`: Define the default model as a deferred next-session setting that must not mutate the active session.

## Impact

- Affects bare model workflow persistence flags and confirmation wording, the Pi settings bridge and effect inventory, owned Settings presentation, model-selector state, and session/settings tests.
- Adds focused coverage for current/default separation, default-model persistence, failed writes, catalog filtering, and comparison-profile isolation.
- Updates maintained OpenSpec requirements and modal/settings inventories that describe model selection.
- Adds no external dependency and requires no settings migration because Pi's existing `defaultProvider` and `defaultModel` fields remain authoritative.

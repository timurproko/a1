# Proposal

## Why

Settings search currently requires `/` before typing and uses only the agent prompt's visual chrome, not its full editing interaction. Users should be able to begin a settings query immediately and receive the same cursor movement, selection, copy, cut, and pointer behavior as the agent input, while Settings deliberately remains a type-only field with paste disabled.

## What Changes

- Replace the dedicated `/`-to-open Settings search flow with type-to-search: the first ordinary printable input opens the search field and appears in the query.
- Present `Type search` in Settings guidance and `Search settings` as the empty search placeholder.
- Use one configurable A1 input component for both the agent prompt and Settings search, including keyboard editing, selection, copy/cut, pointer drag, double-click word selection, and triple-click whole-content selection.
- Configure the shared component as multiline and paste-enabled for the agent prompt, and single-line and paste-disabled for Settings search; paste shortcuts and terminal paste frames must not change the Settings query.
- Preserve Settings result navigation, filtering, cancellation, scrolling, framing, resident/direct parity, and the pinned `a1 pi` comparison profile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-components`: Require one configurable interactive input component, not only shared input chrome, for the bare-A1 agent prompt and Settings search.
- `owned-ui-settings`: Make Settings search typing-first with agent-equivalent editing and selection behavior while disabling paste at the component capability boundary.

## Impact

Expected implementation affects the shared input/editor interaction boundary, Settings input and pointer routing, owned route clipboard composition, shortcut guidance, focused component and Settings tests, and the corresponding specifications. No persisted setting, engine protocol, dependency, or pinned comparison behavior changes.

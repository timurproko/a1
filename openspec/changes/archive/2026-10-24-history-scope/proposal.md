## Why

Today every enabled bare-A1 agent using the same profile reads and writes one prompt history. Running two `a1 solo` instances or several resident Agent tabs exposes one agent's prompts to the others. Users need an opt-in way to retain this existing shared behavior while defaulting to private, durable recall per agent session.

## What Changes

- Add **History scope** under Settings → History with **Unique** (default) and **Shared** choices. Like the existing history controls, it takes effect on the next agent start, not mid-session.
- In Unique mode, separate agent session identities address separate durable history databases and image sidecars, whether launched in separate `a1 solo` processes or resident tabs. Restarting/resuming the *same* session recovers its history; a new session or fork gets its own history.
- In Shared mode, use the existing profile-wide history location and behavior unchanged. Changing modes never automatically copies, imports, merges, deletes, or migrates either mode's history.
- Retain existing profile/data-root isolation, count and byte limits, session-local recall and transcript seeding, disabled-persistence behavior, and untouched `a1 pi` comparison.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Expose the new profile-local, restart-applied History scope setting and its default/validation.
- `persistent-prompt-history`: Select durable history and image-sidecar storage by scope and stable session identity, with a backward-compatible Shared path.

## Impact

The work affects owned settings declarations, history path/worker composition, session identity wiring, and focused settings/history/launch tests. It adds no new dependency, Pi setting, engine history schema migration, or history data transfer. No production implementation is authorized by this draft.

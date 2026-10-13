# Proposal

## Why

The Settings screen combines Pi/Agent settings and A1-specific settings, but they currently live in different files. Preserving `C:\Users\<user>\.a1\agent\settings.json` therefore does not preserve the whole screen, which is surprising to users coming from Pi and can make A1-specific choices appear reset after an update.

## What Changes

- Use `<effective-home>/.a1/agent/settings.json` as the single user-facing settings file for both Pi/Agent and A1-specific preferences.
- Store A1-specific preferences in one reserved top-level `a1` section with its own versioned `values` object, leaving Pi's root keys and schema unchanged.
- Persist only A1 values that differ from their declared defaults; changing a value back to its default removes that A1 key.
- Add a collision gate that fails compatibility when pinned Pi claims the reserved `a1` key, rather than silently sharing a name.
- Coordinate A1 and Pi writes through the same file-lock protocol and merge only the owning namespace so either writer preserves the other's values, including concurrent updates.
- Read the former standalone A1 settings document only when the shared file has no `a1` section, then migrate non-destructively into the shared section on the next accepted A1 change.
- Add focused restart, update/reinstall, migration, collision, and concurrent-write coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Embed the versioned A1 settings document in the shared agent `settings.json`, elide defaults, and define compatibility migration.
- `launch-profiles`: Require every normal A1 version to resolve the same shared user settings file under the selected A1 agent profile.
- `pi-settings-runtime`: Define namespace ownership, collision refusal, and lossless coordinated writes between Pi and A1 settings.

## Impact

Expected implementation affects owned-settings persistence, launch/profile wiring, resident-tabs preflight reads, the pinned-Pi compatibility inventory, package dependencies for compatible file locking, and focused tests. Pi's existing root setting names, engine settings API, project settings, vanilla `~/.pi`, release/control-state paths, and the Settings UI remain unchanged.

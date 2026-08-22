## Why

The owned Pi UI has reached accepted 1:1 parity, and `check:customization-ready` reports zero
architecture debt, so A1-specific experience work is now permitted through owned slots. That work
has no place to keep a decision. `src/features/owned-ui/customization.ts` can register slot
implementations and owned commands, but nothing stores what the user chose, nothing reloads it on
the next launch, and nothing lets the user change it while a session runs.

The three custom-experience milestones that follow this one — custom viewport, paste chips, and
input behavior — each need to read a persisted user preference. Without a settings foundation each
would invent its own storage, its own defaults, and its own surface, and A1 would accumulate three
incompatible answers to the same question.

This change establishes one persisted A1-owned settings store and one section model over it, so the
later milestones and the settings screen consume a settled contract instead of defining one.

## What Changes

- Add a typed A1 settings model with declared defaults, validation, and a version stamp, owned by
  A1 rather than derived from Pi settings.
- Persist settings under the existing A1 configuration root, profile-local, alongside other A1
  control state. Pi's own profile directories are untouched.
- Read settings once during owned UI startup, expose the resolved values to slot implementations,
  and apply a changed value to the running session without requiring a restart.
- Offer the resolved settings as grouped sections a surface can render: the declared A1 settings in
  one section, the engine-reported agent settings in a distinct Agent section.
- Read and write agent settings only through the existing engine settings port, which already
  advertises read, write, and flush capability. Where write is not advertised those entries are
  reported as not editable. A1 never writes Pi settings storage directly.
- Migrate a settings file written by an older version forward on read, and treat an unreadable or
  invalid file as absent rather than failing startup.
- Ship no user-visible surface. The pinned `/settings` route is unchanged in this change, so nothing
  here touches the accepted parity baseline.

Deliberately excluded: the surface itself. A first attempt at one showed why — rendering a settings
screen means inventing scrolling, sticky headers, a keymap, and a scrollbar, all of which belong in a
shared owned UI component layer rather than in this capability. That layer is its own change, and the
settings screen lands on it as its first consumer. Also excluded: any A1 setting that changes visible
composition, which belongs to the custom-viewport milestone. This change ships the model, the store,
the session, and one behaviourally inert A1 preference.

**BREAKING**: none. A1 without a settings file behaves exactly as it does today.

## Capabilities

### New Capabilities

- `owned-ui-settings`: A1-owned persisted user preferences for the owned UI — the settings model,
  its defaults and validation, profile-local persistence and forward migration, resolution during
  startup, live application to a running session, and the surface that edits them.

### Modified Capabilities

None. The pinned settings route is untouched, so the accepted parity baseline is unaffected. The
requirement changes that legalize a declared A1-owned replacement belong to the change that actually
ships one.

## Impact

- New: `src/foundation/owned-ui-settings/` (model, validation, defaults, migration, persistence)
  and its tests under `test/foundation/owned-ui-settings/`.
- Modified: `src/features/owned-ui/run.ts` resolves settings once before the application starts;
  `src/composition/index.ts` builds the session for the selected profile; `runtime-selection.ts` and
  `bin/a1-ui.js` carry the profile id to it.
- Engine: agent settings are read and written through the existing `AgentSettingsPort`
  (`listSettings`, `readSetting`, `writeSetting`, `flush`), reached by a new lazy
  `PiEngineAdapter.settingsPort()`. No new engine surface.
- Storage: one new profile-local settings file under the A1 configuration root. No change to
  `~/.pi/agent`, `~/.a1/agent`, or `~/.a1/sandbox` layout.
- Parity: unaffected. No pinned surface changes, so no checkpoint changes.
- No dependency, packaging, native, or protocol changes.

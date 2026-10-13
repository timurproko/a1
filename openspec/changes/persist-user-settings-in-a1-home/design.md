# Design

## Context

See `proposal.md` for motivation. The Settings screen currently combines pinned Pi settings from `<home>/.a1/agent/settings.json` with product settings from `<configDir>/settings/a1.json`. Preserving the familiar Pi file therefore does not preserve the whole screen.

Pinned Pi's current `SettingsManager` rereads the global JSON under an adjacent lock before each write, merges only fields it marked modified, and leaves unknown root properties intact. That behavior already allows a reserved product object to coexist at the root. Replacing Pi's storage or routing every settings-manager construction through a facade would add significant integration surface when A1 only needs to update one unknown root property safely.

Reusable implementation names must remain product-neutral. The namespace key is supplied from validated `PRODUCT_IDENTITY.commandName`, so the shipped object is named `a1` without embedding that brand in storage helpers.

## Goals / Non-Goals

**Goals:**

- Present users with one familiar global profile `settings.json`.
- Keep Pi root settings and product-specific settings logically isolated.
- Add the smallest safe A1 writer: compatible locking, current-file merge, and atomic replacement.
- Persist a flat product object containing only values that differ from declarations, with no schema metadata.
- Turn Pi's preservation of the product object into an upgrade-gated compatibility contract.

**Non-Goals:**

- Replace, wrap, or reimplement Pi's settings manager or storage.
- Change runtime, trust-preflight, or package settings-manager construction.
- Reimplement Pi setting semantics, migrations, getters, setters, or project settings.
- Expose product settings as Pi engine descriptors or root fields.
- Change the vanilla `a1 pi` profile under `<home>/.pi/agent`.

## Decisions

### 1. Append one flat product object to the existing global file

The normal profile keeps `<effective-home>/.a1/agent/settings.json`. Pi settings retain their current root shape. Product-specific settings use one root object whose key is injected from `PRODUCT_IDENTITY.commandName`:

```json
{
  "theme": "dark",
  "showImages": true,
  "a1": {
    "accentColor": "cyan",
    "scrollbarSpeed": "fast"
  }
}
```

The `a1` object contains direct setting properties—no schema version, `values` wrapper, or migration metadata. A second file was rejected because it recreates the persistence surprise. Prefixed root keys were rejected because they look like Pi settings and multiply collision checks.

### 2. Leave Pi settings management unchanged

Normal runtime startup, project-trust preflight, and package operations continue using pinned Pi's existing `SettingsManager.create(...)` paths. No facade, replacement storage implementation, or new manager factory is introduced.

Pinned Pi currently preserves unknown root fields because every persisted change rereads the locked file and merges only modified Pi fields. Focused file-backed conformance tests will place an `a1` fixture in `settings.json`, exercise representative Pi setters and package persistence, flush, and require the object to remain unchanged. Those tests join the Pi-upgrade gate so this assumption cannot drift silently.

Relying on behavior without a gate was rejected. Replacing Pi storage was also rejected because it would increase startup, trust, package, error-reporting, and upgrade risk without improving the one-object update A1 requires.

### 3. Update the product object with one locked read-modify-write helper

A product-neutral helper will accept the file path, injected namespace key, and next product object. It will:

1. acquire the same adjacent lock protocol used by pinned Pi;
2. reread and parse the latest complete JSON while holding the lock;
3. refuse malformed roots or a namespace shape it cannot safely interpret;
4. replace or remove only the namespace property while preserving every other root property;
5. write a temporary sibling and atomically replace the target; and
6. release the lock after replacement.

The helper name will use generic terms such as `profile`, `namespace`, or `shared`, never the A1 brand. A compatible lock implementation will be pinned directly rather than imported from Pi's private dependency tree.

Blind text append was rejected because it can create invalid JSON. An unlocked parse/write was rejected because an overlapping Pi or package write could be lost. Holding only a process-local mutex was rejected because multiple release cohorts can remain active.

### 4. Keep product resolution in the existing owned settings manager

`OwnedSettingsManager` continues to own declarations, defaults, application boundaries, notices, and Settings sections. Its persistence source changes from a standalone document to the object read from the selected agent `settings.json`. The pre-UI resident-tabs reader reads the same object without constructing the UI.

The flat object stores accepted declared values only when they differ from current defaults, plus unknown properties preserved for downgrade safety. Returning a setting to its default removes that property. If no non-default or unknown property remains, the whole `a1` object is removed.

Future compatibility transforms are idempotently selected by recognizable legacy keys or value shapes, leaving current and unknown properties unchanged. No version decision is exposed in user configuration.

### 5. Fail closed on namespace collisions

The namespace key comes from validated product identity. A compatibility test compares it with the complete pinned Pi root setting inventory. If a Pi upgrade introduces a root `a1` setting, the candidate fails before release and names the collision.

The A1 writer also refuses an existing non-object `a1` property rather than replacing data it cannot own safely. Silent A1-wins or Pi-wins precedence was rejected because either can destroy user state.

### 6. Import the former standalone document lazily

When the shared file has no product object, the manager may read the former `<configDir>/settings/a1.json`. Its historical metadata is consumed only while importing and is never copied into the shared object. An existing shared object always wins.

Startup performs no migration write. On the next accepted product change, the manager filters declarations against defaults, preserves unknown properties, updates `a1` through the locked helper, and leaves the old file unchanged. Eager moves and dual writes were rejected because they complicate rollback and create two authorities.

## Risks / Trade-offs

- **[A future Pi writer stops preserving unknown root fields]** → File-backed conformance runs for every pinned Pi update and blocks the candidate.
- **[Pi and A1 write concurrently]** → Both use the compatible cross-process lock; A1 rereads current bytes under lock before merging.
- **[An older A1 release writes through a different path]** → Pi-compatible locking and Pi's gated unknown-field preservation protect the object; new releases do not add another Pi storage implementation.
- **[Pi later claims the product namespace]** → Static collision validation and runtime shape refusal block destructive precedence.
- **[The standalone document and embedded object disagree]** → The embedded object wins as one authority; no per-key chronology is invented.

## Migration Plan

1. Add the generic locked namespace updater and prove it preserves arbitrary Pi root content.
2. Read product settings from an existing `a1` object; otherwise read the former standalone document; otherwise resolve defaults.
3. On the next accepted product change, write only non-default and unknown properties directly in `a1`, without metadata or changes to the former file.
4. Add pinned-Pi round-trip and collision checks before removing any reliance on the standalone location.
5. Keep the old standalone file intact for rollback. Newer changes made only in `a1` are intentionally unavailable to binaries predating this contract.

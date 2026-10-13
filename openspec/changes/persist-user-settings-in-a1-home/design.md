# Design

## Context

See `proposal.md` for motivation. The Settings screen currently combines two persistence systems: pinned Pi's `SettingsManager` owns `<home>/.a1/agent/settings.json`, while `OwnedSettingsManager` writes `<configDir>/settings/a1.json`. The UI hides that distinction, so retaining the familiar Pi file does not retain A1-specific choices.

Pinned Pi exposes `SettingsManager.fromStorage(...)`, whose storage callback is a public structural boundary for global and project JSON. Pi's default file storage performs locked read-modify-write operations and preserves unknown root keys today, but relying on that incidental unknown-key behavior would not give A1 explicit namespace isolation or control of atomicity. Normal A1 constructs settings managers in runtime startup, project-trust preflight, and package operations; all three must use the same storage contract.

Internal implementation names must remain product-neutral. The current product key is supplied from validated `PRODUCT_IDENTITY.commandName`, so the shipped JSON section is `a1` without hardcoding that brand into reusable storage types.

## Goals / Non-Goals

**Goals:**

- Present users with one familiar global profile `settings.json`.
- Keep Pi root settings and product-specific settings logically isolated despite sharing a file.
- Own locking, atomic replacement, merging, and collision refusal at one generic storage boundary.
- Persist a flat product object containing only values that differ from declarations while preserving unknown newer properties and exposing no schema metadata.
- Route every normal-A1 Pi settings manager through the same boundary.

**Non-Goals:**

- Reimplement Pi setting semantics, getters, setters, migrations, or project-setting behavior.
- Expose product settings to Pi as engine descriptors or root fields.
- Change the vanilla `a1 pi` profile under `<home>/.pi/agent`.
- Synchronize profile settings between operating-system users or machines.
- Make binaries predating this contract understand the embedded section.

## Decisions

### 1. Use one namespaced global settings document

The normal A1 profile keeps `<effective-home>/.a1/agent/settings.json`. Pi settings retain their current root shape. Product-specific settings use one root section whose key is injected from `PRODUCT_IDENTITY.commandName`:

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

A flat top-level section was chosen over prefixed keys because it keeps product fields from looking like Pi settings while remaining obvious to users. A schema version and nested `values` object were rejected as implementation metadata users should not have to understand. A second file was rejected because it recreates the user-visible persistence problem. Placing product keys directly at the root was rejected because collisions and ownership would be ambiguous.

### 2. Put a product-neutral shared store beneath both managers

A generic `SharedProfileSettingsStore`-style component will own the global profile file and accept the namespace key as data. The exact implementation name may vary, but SHALL NOT contain the A1 brand. It provides:

- a structural Pi `SettingsStorage` view for `SettingsManager.fromStorage(...)`;
- a flat product-object read/write view for `OwnedSettingsManager`; and
- ordinary project-scope storage behavior for Pi's trusted project settings.

For a global Pi read, the store removes the reserved product object before invoking Pi's callback. For a Pi write, it parses the callback result, refuses a returned reserved key, then merges the unchanged product object back. Product operations receive and replace only that flat object. Thus neither side depends on the other's parser preserving unknown values.

A facade above an ordinary `SettingsManager.create(...)` was rejected because package operations and queued Pi writes could still bypass it. Deep-importing Pi's private file storage was rejected by the public API boundary. The public structural storage callback gives the required control without copying Pi behavior.

### 3. Centralize settings-manager construction

A product-neutral factory will create pinned settings managers over the shared store. Runtime startup, global-only project-trust preflight, and package operations will all use that factory. Existing test seams may inject a manager, but production construction for the normal A1 profile will have no independent writer to the global file.

The prerelease Pi comparison retains Pi's ordinary `.pi` profile and default behavior because it must not consume the product section. Engine getters, setters, flush behavior, and the existing A1 engine settings port remain unchanged above storage.

### 4. Derive and guard the namespace

The store receives the namespace from validated product identity; reusable types, classes, and functions use terms such as `shared`, `profile`, `product`, or `namespace`, never an embedded A1 brand.

A compatibility test derives the complete pinned Pi root setting inventory and asserts that the product key is absent. Pi-upgrade validation therefore blocks a candidate that introduces `a1`. Runtime merge code independently rejects any Pi callback result containing the reserved key before touching disk. Silent precedence was rejected because either choice could destroy user data.

### 5. Coordinate every writer with compatible locking and atomic replacement

The shared store will use the same adjacent lock protocol as pinned Pi, added as a direct pinned dependency rather than imported from Pi's private dependency tree. Under that lock it rereads the current file, applies one owner-scoped merge, writes a temporary sibling, and atomically replaces the target. The lock covers parsing through replacement, so overlapping A1 versions, runtime writes, and package operations merge against current bytes rather than stale startup snapshots.

A process-local mutex alone was rejected because updates may leave multiple release cohorts alive. Unlocked atomic rename was rejected because two valid complete writes could still lose one another.

### 6. Store only deviations from defaults

The flat product object contains accepted declared values only when they differ from current declaration defaults, plus unknown properties preserved for downgrade safety. Accepting a default removes that declared property. When no non-default or unknown value remains, the whole product object is omitted.

The object contains no schema version, `values` wrapper, or other implementation metadata. Resolution overlays its recognized properties on declarations, so an omitted key is always the default. Future compatibility transforms are selected idempotently by recognizable legacy keys or value shapes, leaving current and unknown properties unchanged. This keeps the user-facing file concise without serializing a full default snapshot or exposing migration machinery.

### 7. Import the former standalone document lazily

When the shared file has no product object, the manager may read the former `<configDir>/settings/a1.json` as a compatibility source. Its historical version is consumed only while importing that old format and is never copied into the shared object. The shared object always wins when present. Startup performs no migration write. On the next accepted product change, the manager filters resolved declarations against defaults, preserves unknown keys, writes the flat object, and leaves the old file unchanged.

Eager moves and dual writes were rejected because they complicate rollback and create two authorities. An unreadable shared section does not fall back to stale standalone values.

## Risks / Trade-offs

- **[A storage adapter can diverge from Pi's file semantics]** → Exercise pinned `SettingsManager` against the adapter and include the adapter in every Pi-upgrade compatibility run.
- **[An older A1 release can write through Pi's default storage]** → Use Pi-compatible cross-process locking; its current unknown-root merge preserves the section, while new releases no longer depend on that behavior among themselves.
- **[Pi later claims the product namespace]** → Block the upgrade in both static compatibility validation and runtime merge safeguards.
- **[Atomic replacement behaves differently across platforms]** → Reuse the repository's established sibling-replacement pattern and cover Windows and Unix fixtures in CI.
- **[The standalone document and embedded section disagree]** → Embedded state wins as one whole product document; no per-key chronology is invented.

## Migration Plan

1. Introduce and verify the generic shared store and manager factory before routing production constructors through it.
2. Route runtime, trust-preflight, and package settings managers through the shared storage view.
3. Read an existing flat product object; otherwise read the former standalone document; otherwise resolve defaults.
4. On the next accepted product change, persist only non-default values and unknown keys directly in the product object, without schema metadata or changes to the former file.
5. Keep the old standalone file intact for rollback. Newer changes made only in the embedded section are intentionally unavailable to binaries predating this contract.

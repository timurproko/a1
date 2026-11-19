## Context

See `proposal.md` for motivation.

The pieces this change builds on already exist. `src/features/owned-ui/customization.ts` holds
`OwnedUiCustomizationRegistry` and `OwnedCommandSurface`, so registering an owned command and a
slot implementation needs no new machinery. `src/foundation/owned-ui-contracts/model.ts` declares
the ten owned slot ids, including `dialog` and `selector`. `src/foundation/lifecycle/paths.ts`
exposes `resolveProductPaths()`, which already resolves the A1 configuration root from
`PRODUCT_IDENTITY` with the declared `A1_CONFIG_DIR` override, `%APPDATA%\A1` on Windows and
`XDG_CONFIG_HOME` on Unix.

Two existing constraints shape the approach. `openspec/specs/owned-pi-ui-foundation/spec.md`
requires the owned shell to reproduce pinned Pi's complete surface set, including its settings
surface and command list, and requires customization to resolve through versioned owned slots
without mutating the baseline. `openspec/specs/product-identity/spec.md` and
`project-structure-governance` require A1 control state to stay under the A1 roots and out of Pi
profile directories.

`src/foundation/storage/control-store.ts` is a `node:sqlite` store for runtime control state
(workspace agents, boot nonces). It is not a configuration store.

## Goals / Non-Goals

**Goals:**

- One settings contract the three later custom-experience milestones can consume unchanged.
- Resolution that cannot fail a launch: any unreadable, invalid, or future-versioned file
  degrades to declared defaults.
- A declaration mechanism for A1-owned additions that the parity comparison reads from the same
  source the runtime registers from, so the two cannot drift.

**Non-Goals:**

- No setting that changes visible composition. The first of those belongs to the custom-viewport
  milestone; this change ships the path, not the payload.
- No settings sync, export, import, or remote configuration.
- No change to the pinned `/settings` route, and no A1 settings inside it.
- No settings for `a1 pi` or `a1 sandbox`. Those are vanilla Pi and have no owned UI.

## Decisions

### A JSON document, not a `ControlStore` table

Settings live in a small JSON document written atomically (write to a temporary sibling, then
rename). Rationale: settings are user-facing configuration a person may want to read, hand-edit,
diff, or copy between machines, and the spec requires preserving unknown keys so a downgrade does
not destroy a newer version's value — both natural in a document and awkward in a schema-bound
table. Atomic rename gives the "complete previous or complete new" guarantee the spec requires.

Alternative considered: a table in the existing `ControlStore`. Rejected because that store is
runtime control state with a boot nonce and a different lifetime, and adding configuration to it
would couple settings durability to database migration.

### Location: `<configDir>/settings/<profile-id>.json`

`resolveProductPaths().configDir` is the root, with one file per A1 profile id. Rationale: keeps
settings inside A1 control state as `product-identity` requires, satisfies the spec's prohibition on
writing into a Pi profile directory, and makes profile isolation a property of the path rather than
of a filter applied after reading. `A1_CONFIG_DIR` therefore relocates settings with the rest of
control state, which is what `npm start`'s isolated development state already depends on.

Alternative considered: a file inside the active Pi profile root, next to Pi's own settings.
Rejected — it violates the spec and would make `a1 pi` comparison runs observe A1 state.

### Declarations own the shape; resolution is a pure function

Each setting is declared once with id, type, allowed values, default, description, and whether it
applies live or requires a restart. Resolution is a pure function from (declarations, parsed
document) to (resolved values, rejected entries, preserved unknown keys). Rationale: every spec
scenario about partial files, out-of-range values, unknown keys, and defaults becomes a unit test
over that function with no filesystem involved, and the surface renders from the same declarations
rather than a second hand-written list.

### Migration on read, persistence on write

A version stamp plus an ordered list of declared migrations. Reading an older document runs the
migrations in order and applies the result; the migrated form is persisted only when the user next
changes a setting. Rationale: reading must never be a write, so a comparison run or a read-only
profile cannot be mutated by being opened. A newer-than-known version does not migrate at all — it
falls back to defaults and reports, per the spec.

### A1-owned additions are declared in code and consumed by the parity gate

`customization.ts` gains a declared additions list — id, owned slot, the command that reaches it.
`scripts/run-pi-terminal-parity.mjs` and the manual comparison procedure read that declaration to
classify a surface as expected rather than divergent. Rationale: the new
`owned-pi-ui-foundation` requirement fails parity on an *undeclared* addition, which is only
enforceable if declaration and comparison share one source. A hardcoded exclusion list in the
parity script would drift the first time a milestone adds a surface.

Alternative considered: excluding additions by naming convention (an `a1-` command prefix).
Rejected — a convention cannot express which slot an addition owns, and it would silently exclude
a genuine divergence that happened to match the prefix.

### Two backends behind one section model

A1 settings live in the A1 document. Agent settings are read and written through the existing
`AgentSettingsPort` — `listSettings`, `readSetting`, and the optional `writeSetting` and `flush`,
which `src/foundation/pi-engine-adapter/` already implements over `PiSettingsIntegration`. The
section model tags each entry with the backend that owns it, and the session routes an accepted
change accordingly. Nothing copies agent values into the A1 document.

Rationale: an agent setting mirrored into A1 storage would immediately diverge from the value the
engine actually uses, and writing Pi's settings file directly would breach `pi-api-boundary`. Using
the port that already exists means no new engine surface and no second source of truth.

The port's capability flags drive presentation: without advertised `write`, Agent entries are
reported as not editable with a stated reason. A failed or empty `listSettings` leaves the A1 section
complete and reports the Agent section as unavailable, so a degraded engine cannot take the whole
model down.

### The port is resolved lazily

`PiEngineAdapter.settingsPort()` returns null until the engine runtime is up, so the session takes a
provider rather than a port captured at construction. Startup resolves A1 values before the
application starts; agent values are read when the sections are next built. Rationale: the adapter
starts lazily, and a port captured too early would leave the Agent section permanently empty.

### No surface in this change

A first attempt rendered a centered selector, which was the wrong shape: the intended experience is a
fullscreen screen with pinned section headers, block-jump navigation, a filter, and a scrollbar.
Those are general UI patterns, not settings concerns. Building them here would bake a bespoke pattern
into one capability and guarantee the next screen reinvents it. They belong in a shared owned UI
component layer, specified once, with the settings screen as its first consumer. This change
therefore stops at the section model and makes no route change.

## Risks / Trade-offs

- **[Adding any surface pinned Pi lacks widens the parity contract]** → The new requirement makes
  additions legal only when declared, and makes displacement of a pinned surface fail parity, so
  the baseline stays enforceable rather than becoming advisory.
- **[`test:pi-terminal-parity` currently runs in no CI workflow]** → This change makes the parity
  gate read a declaration, which is worth nothing if the gate never runs. Wiring it into CI is a
  separate concern and is out of scope here, but the declaration is exported so it can be asserted
  by an ordinary test in the fast tier meanwhile.
- **[A settings file is a new place for state to rot]** → Unknown keys are preserved rather than
  dropped, migrations are declared and ordered, and every failure path resolves to defaults instead
  of blocking a launch.
- **[Shipping a store with no visible setting risks an unexercised path]** → The surface ships with
  one navigable but behaviourally inert preference, so open, edit, accept, store, restart, and
  resolve are all exercised end to end before the custom-viewport milestone depends on them.

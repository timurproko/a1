## Why

The session shell lived at `src/integrations/pi/session-ui` as if it were a fourth Pi adapter, yet it composes the feature owners, the vendor-neutral UI foundations, and the three real adapters into the interactive session; the owner map had to grant it an adapter's allowances plus a startup exemption (`directLeafConsumers`) that silently let any startup module deep-import anything. Every owner's `index.ts` was a chain of `export *`, so no public contract was readable without loading the tree. The rules that actually matter (contracts import nothing, UI components import only contracts, only the Pi adapters import Pi) were implied by the dependency graph rather than checked.

## What Changes

- `git mv src/integrations/pi/session-ui src/app/session-shell` and `test/integrations/pi/session-ui` to `test/app/session-shell`; every relative import, fixture URL, baseline path, validation-suite entry, and document reference follows. The owner is `session-shell` (layer `app`); it may import the three contract owners, `ui-components`, `ui-apps`, `owned-ui-settings`, the three Pi adapters, `terminal-cleanup`, and the feature owners; only `composition` imports it.
- Every owner `index.ts` lists its named exports (`export type` for type-only symbols); `inspectProjectStructureImports` rejects `export *` in a public entry. The `pi-component-adapter` entry drops a redundant re-export that `export *` had silently deduplicated.
- The cross-owner rule keeps two exceptions: `composition`, and a module on the eager startup path importing a leaf of a provider whose public entry is in `PROHIBITED_STARTUP_ENTRIES`. The old exemption let any startup module deep-import any provider; seven imports into `contracts/owned-ui` that did not qualify now use its public entry.
- `inspectLayerBoundaries` enforces the three boundaries directly; `check-architecture.mjs` runs it beside the owner-graph check.
- `classifyRenderingImpact` records at most 256 changed paths while still classifying from all of them, so a directory move with hundreds of renames does not fail the impact selection (found by this change).
- `docs/architecture/project-structure.md` and `boundaries.md` describe the app layer, the named-export rule, the two deep-import exceptions, and the three boundaries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: public entries list named exports; deep imports are limited to composition and startup leaves of prohibited barrels; the session shell is an application-layer owner; three layer boundaries are checked directly.

## Impact

No runtime behavior changes. The startup graph stays at 153 files; source bytes rise from 1,442,658 to 1,443,318 because the seven redirected imports now load the small `contracts/owned-ui` entry. Removing the startup exemption entirely, as the plan proposed, would have pulled the `ui/components`, Pi adapter, and foundation barrels into startup (179 files, 1,537,584 bytes) and eagerly loaded the optional history-editor loader; the leaf rule keeps the startup budget and the lazy module while stating the exception precisely.

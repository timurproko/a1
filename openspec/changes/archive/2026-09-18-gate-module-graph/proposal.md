## Why

Nothing in the architecture gate looks at the shape of the module graph under `src/`. Two consequences have accumulated unnoticed. First, three import cycles exist: a ten-file strongly connected component in `src/foundation/release/` (`bootstrap`, `update`, `update-transaction`, `update-recovery`, `release-gc`, `endpoints`, `warmup`, `update-launch`, `restart-certification`, `dependency-certification-retention`), `dependency-layer.ts` with `release.ts`, and `session-ui/path-chip-presentation.ts` with `paste-text-preparation.ts`. Second, 45 of 281 source files are unreachable from any `bin/` entry, package export, or declared startup root: the on-hold workspace subsystem (`features/workspace`, `foundation/structured-agent-runtime`, `foundation/native-host-protocol`, `contracts/workspace`), and fourteen more files that only their owner's `index.ts` barrel exports and that production never imports (`composition/agent-engine-bridge.ts`, `composition/process.ts`, `cli/version.ts`, `features/owned-ui/customization.ts`, `features/owned-ui/diagnostics.ts`, three vendored Pi components, three engine integrations, `session-ui/route-host.ts`, `tui-runtime/conformance.ts`, `ui/components/prompt-row.ts`). The planned refactors that break the cycles and delete the dead code need a gate that proves each step and stops the counts from growing back.

## What Changes

- Add a module-graph policy that builds the relative-import graph of `src/`, reports every strongly connected component larger than one file, and reports every non-`index.ts` module unreachable through runtime imports from the entry set: `bin/*.js` imports of `dist/`, `package.json` `bin` and `exports`, `STARTUP_ROOTS`, and explicitly declared process entries (the paste and copy helpers, the paste text worker, and the shipped Pi public entry).
- Record the current cycles and unreachable modules in `config/architecture-allowlist.json`. The gate fails on any cycle or unreachable module not listed, and also fails when a listed entry no longer holds, so the list can only shrink.
- Wire both checks into `check-architecture.mjs` and prove them with fixture tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: the production module graph is acyclic and fully reachable except for an explicit, shrinking allowlist.

## Impact

Adds `scripts/governance/module-graph-policy.mjs` with its declaration file, `config/architecture-allowlist.json`, and one fixture test; edits `scripts/governance/check-architecture.mjs`. No production source changes. The allowlist starts with 3 cycles and 33 unreachable modules; the release-cycle, dead-code, and workspace-archive changes that follow each remove their entries.

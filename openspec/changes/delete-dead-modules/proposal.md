## Why

The module-graph gate (#473) recorded 31 modules that no entry point reaches. Twelve of them, outside the on-hold workspace subsystem, are product code that only their owner's `index.ts` barrel exports and only their own unit tests exercise: the superseded process composition root (`composition/process.ts` with `agent-engine-bridge.ts`), two owned-UI helpers never wired into the shell (`customization.ts`, `diagnostics.ts`), three engine integrations the adapter no longer uses (`model-auth-integration.ts`, `resource-extension-integration.ts`, `workflow-controllers.ts`), three vendored Pi components never rendered (`custom-entry.ts`, `first-time-setup.ts`, `markdown-transform.ts`), `cli/version.ts`, `ui/components/prompt-row.ts`, and a type re-export shim (`session-ui/route-host.ts`). Together about 1,000 lines of source plus 600 lines of tests that pass while proving nothing the product does. Two other listed modules are false positives of the gate: `engine/conformance.ts` is executed from `dist/` by the Pi upgrade scripts, and `components/prompt-input-port.ts` holds only types, so nothing imports it at runtime although two live modules depend on it.

## What Changes

- Delete the twelve modules and their dedicated tests, drop their barrel exports, and reclassify the three vendored components' ledger records as public-API reuse (the pinned package still ships them).
- Declare `engine/conformance.ts` a process entry (it is loaded from `dist/` by `scripts/pi/run-pi-engine-conformance.mjs` and the candidate evaluator).
- Teach the reachability gate that a module exporting only types is reached through type imports: a module with no runtime exports is judged by static edges, so `prompt-input-port.ts` leaves the allowlist without a source change.
- Shrink `config/architecture-allowlist.json` accordingly; what remains is the workspace subsystem (archived by the next change) and `tui-runtime/conformance.ts`, a pinned-runtime contract check that only its test runs and that stays listed until the Pi upgrade work decides where it lives.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: type-only modules count as reachable through their type importers; dormant modules are deleted rather than allowlisted.

## Impact

Removes 12 source files and 6 test files, edits 4 barrels, 1 shared test, three source-ledger records, the validation ownership registries, the allowlist, and `module-graph-policy.mjs` with one new fixture case. No behavior the shell exposes changes; the deleted modules had no runtime importer.

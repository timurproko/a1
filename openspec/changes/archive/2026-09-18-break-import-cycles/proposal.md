## Why

The module-graph gate (#473) records three import cycles. The release subsystem's ten-file strongly connected component closes through two back edges: `update-transaction.ts` imports the `UpdateChannel` type from `update.ts`, the command that owns the store, and `endpoints.ts` imports three endpoint helpers from `bootstrap.ts`, which in turn imports `endpoints.ts` and `release-gc.ts`. `dependency-layer.ts` and `release.ts` close over the `DependencyLayerReference` type, and in the session shell `path-chip-presentation.ts` and `paste-text-preparation.ts` close over two paste types. Every one is a leaf type or helper living in the wrong file. Breaking them empties the cycle allowlist so the gate can hold the graph acyclic from here on. While proving the result, the runtime-import parser that both the startup graph and the module graph rely on turned out to misread a bare-specifier import followed by a relative `import type` as one runtime import, so the eager startup graph had been counting modules that never load.

## What Changes

- Add `src/foundation/release/types.ts` holding `UpdateChannel` and `DependencyLayerReference`; `update.ts` and `dependency-layer.ts` re-export them so the barrel's public surface is unchanged.
- Move `readEndpointMetadata`, `probeOwnership`, `removeEndpointArtifacts`, and their private helpers from `bootstrap.ts` to `endpoints.ts`; `bootstrap.ts` and `update.ts` import them from there.
- Add `src/integrations/pi/session-ui/paste-types.ts` holding `ClipboardPath` and `PreparedPasteText`; `paste-text-preparation.ts` re-exports them.
- Fix `runtimeRelativeImports` (and the module graph's static scanner) so an import clause cannot cross a statement terminator; re-pin the startup graph baseline to the exact corrected totals (143 to 137 files, 2,649,104 to 1,381,566 bytes) and point `features/launch/intent.ts`, which the misparse had been counting as eager, at the lifecycle barrel.
- Empty `importCycles` in `config/architecture-allowlist.json`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: the module graph is acyclic with no allowlisted cycle, and the import parser counts only imports that load at runtime.

## Impact

Touches ten source files in `foundation/release` and `session-ui`, two governance policies with two new fixture cases, the startup graph baseline, and the allowlist. No exported name of the `release` or `session-ui` barrels changes; tests that reach the moved helpers through those barrels are unaffected. The corrected startup totals are the real eager graph and give the byte budget honest headroom for the first time.

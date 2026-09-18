## 1. Gate refinement

- [ ] 1.1 In `module-graph-policy.mjs`, classify a module as type-only when its source has no runtime export, and let `findUnreachableModules` reach a type-only module through static edges from a reachable importer; add fixture cases for a type-only module reached by `import type` (passes) and an ordinary module reached only by `import type` (fails).
- [ ] 1.2 Add `src/integrations/pi/engine/conformance.ts` to `entryModules`.

## 2. Deletions

- [ ] 2.1 Delete `src/cli/version.ts`, `src/composition/agent-engine-bridge.ts`, `src/composition/process.ts`, `src/features/owned-ui/customization.ts`, `src/features/owned-ui/diagnostics.ts`, `src/integrations/pi/engine/model-auth-integration.ts`, `src/integrations/pi/engine/resource-extension-integration.ts`, `src/integrations/pi/engine/workflow-controllers.ts`, `src/integrations/pi/session-ui/route-host.ts`, `src/ui/components/prompt-row.ts`, and `src/integrations/pi/components/upstream/components/{custom-entry,first-time-setup,markdown-transform}.ts`.
- [ ] 2.2 Delete `test/composition/composition.test.ts`, `test/features/owned-ui/customization.test.ts`, `test/features/owned-ui/diagnostics.test.ts`, `test/integrations/pi/engine/model-auth-integration.test.ts`, `test/integrations/pi/engine/resource-extension-integration.test.ts`, `test/integrations/pi/engine/workflow-controllers.test.ts`; remove the three vendored-component cases from `test/integrations/pi/components/pinned-reconciled-source-ports.test.ts`.
- [ ] 2.3 Drop the corresponding lines from `src/cli/index.ts`, `src/composition/index.ts`, `src/features/owned-ui/index.ts`, `src/integrations/pi/engine/index.ts`, and `src/integrations/pi/session-ui/index.ts` (re-export the two route types from `ui/apps` directly if the barrel must keep them); fix any consumer that imported a deleted symbol through a barrel.
- [ ] 2.4 Remove the three vendored components' records from `config/baselines/pinned-pi-source-port-ledger.json` and update the record and behavior counts asserted in `test/repository-governance/pinned-pi-source-ledger.test.ts`.

## 3. Allowlist and proof

- [ ] 3.1 Remove the deleted modules, `engine/conformance.ts`, and `prompt-input-port.ts` from `unreachableModules`; keep the workspace subsystem and `tui-runtime/conformance.ts`.
- [ ] 3.2 Run `npm run check:architecture`, `npm run typecheck`, the repository-governance, composition, owned-ui, engine, components, and session-ui suites, and `check:code-documentation`; record outcomes here.

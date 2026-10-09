## Why

The multi-agent tabs work will rewrite the most-edited files in the tree: `src/app/session-shell/session-shell.ts`, `src/app/session-shell/session-shell-root.ts`, `src/integrations/pi/engine/adapter.ts`, and `src/composition/owned-ui.ts`. Those diffs should not carry dead code and unused imports, and the repository has no static check that catches either. The shell alone holds roughly twenty-five unused imports, `src/integrations/pi/components/upstream/theme/system-theme.ts` is 915 ported lines with zero importers, and the `agent-engine` contract exports thirty-five names of which twenty-seven have no consumer outside `src/contracts`.

## What Changes

- Enable `noUnusedLocals` and `noUnusedParameters` in the TypeScript configurations that `npm run typecheck` evaluates, and remove every unused import, local, and parameter the compiler reports.
- Delete `system-theme.ts` and its sole export `generateSystemThemeColors`, and update the pinned Pi source port ledger so the provenance check no longer expects the file.
- Delete the dormant engine-session half of `src/contracts/agent-engine`: `AgentEnginePort`, `AgentSessionPort`, the `AgentCommand`, `AgentEvent`, and `AgentSnapshot` families, their validators and serializers, and the unused capability ports. Keep every export that has a consumer outside `src/contracts`.
- Delete `subscribeToPiSessionEvents` and `convertPiSessionEvent` from `src/integrations/pi/engine/session-integration.ts` together with their test, because they only exist to feed the deleted contract.
- Describe the surviving `agent-engine` contract as the agent settings and package contract in `docs/architecture/project-structure.md`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: unused locals, parameters, and imports fail the type check that every validation tier already runs.

## Impact

Behavior does not change. `tsconfig.json`, `tsconfig.bin.json`, and `tsconfig.build.json` gain two compiler flags. Source files lose unused imports. `src/contracts/agent-engine`, `src/integrations/pi/engine/session-integration.ts`, `src/integrations/pi/engine/index.ts`, `src/integrations/pi/components/upstream/theme/`, `config/baselines/pinned-pi-source-port-ledger.json`, and `test/contracts/agent-engine` shrink. The startup graph byte budget in `config/startup-graph-baseline.json` is a maximum and needs no edit when sources shrink.

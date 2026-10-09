## Authorization and sequencing

This change is planning-only until the maintainer approves it and requests implementation. It is the first of eight preparatory changes for multi-agent tabs and has no dependency on the others. Implement in this worktree, branch, and draft PR; reconcile current `origin/develop` first.

## 1. Compiler flags

- [x] 1.1 Add `noUnusedLocals: true` and `noUnusedParameters: true` to `tsconfig.json` and `tsconfig.bin.json`; confirm `tsconfig.build.json` inherits or add them there too.
- [x] 1.2 Run `npm run typecheck`, then remove every reported unused import and local in `src/`, `bin/`, and `test/`; rename interface-required unused parameters with a leading underscore.
- [x] 1.3 Confirm `scripts/governance/check-code-documentation.mjs --mode full` still passes after import removals that shortened files.

## 2. Dead ported theme code

- [x] 2.1 Delete `src/integrations/pi/components/upstream/theme/system-theme.ts` and any re-export of `generateSystemThemeColors`.
- [x] 2.2 Regenerate `config/baselines/pinned-pi-source-port-ledger.json` with `scripts/pi/update-pinned-pi-source-ledger.mjs` and verify `npm run check:architecture`.

## 3. Dormant engine-session contract

- [ ] 3.1 In `src/contracts/agent-engine`, delete `ports.ts`, `validation.ts`, `serialization.ts`, the `AgentCommand`, `AgentEvent`, `AgentSnapshot`, `AgentCapabilityContract`, and `AgentSessionLifecycle` families in `model.ts`, and every `capability-ports.ts` export with no consumer outside `src/contracts`; keep `AGENT_ENGINE_CONTRACT_VERSION` only if a surviving type references it.
- [ ] 3.2 Delete `subscribeToPiSessionEvents` and `convertPiSessionEvent` from `src/integrations/pi/engine/session-integration.ts`, their barrel exports in `src/integrations/pi/engine/index.ts`, and the `test/integrations/pi/engine/session-integration.test.ts` cases that cover only them.
- [ ] 3.3 Delete or narrow `test/contracts/agent-engine/contracts.test.ts` and `capability-ports.test.ts` to the surviving exports; keep `package-ports.test.ts` and `domain-contracts.test.ts`.
- [ ] 3.4 Update the `agent-engine/` line in `docs/architecture/project-structure.md` to "dependency-free agent settings and package contracts".

## 4. Validation evidence

- [ ] 4.1 Run `npm run typecheck`, `npm run check:architecture`, `npm run check:code-documentation`, and the affected test owners (`test/contracts`, `test/integrations/pi/engine`, `test/app/session-shell`).
- [ ] 4.2 Record removed import count, deleted line count, and any compiler finding outside the planned scope in the acceptance list.

## Why

`docs/architecture/boundaries.md` states that product features receive vendor-neutral ports, but the session shell is typed against the concrete adapter: `src/app/session-shell/session-shell-root.ts:146` declares `export type OwnedUiBackendPort = PiEngineAdapter`. The shell calls forty-nine distinct adapter members. A second backend kind, a per-tab session, or a test double cannot satisfy that surface, and the multi-agent tab host needs exactly such a port.

## What Changes

- Add `OwnedUiSessionBackend` to `src/contracts/owned-ui`, composed of sub-ports for identity, session, workflows, settings, catalog, and extensions, listing only the members the shell and composition use today.
- Move the structural request, result, snapshot, option, and context types that those members carry from `src/integrations/pi/engine/workflows.ts` into the contract under `OwnedUi*` names; they contain no Pi types.
- Declare `PiEngineAdapter implements OwnedUiSessionBackend`, exposing the sub-ports as getters over its existing private collaborators.
- Replace the alias with the interface in the shell and in composition, and keep the six members that still carry Pi-typed payloads on a transitional `pinned` sub-port that the follow-up `extract-pi-session-presenters` change deletes.
- Keep settings writes off the per-session command protocol: `setDefaultThinkingLevel` stays on the settings sub-port with a contract-typed level, and `applyPinnedSettingValue`, a courier for the pinned settings selector, moves to the transitional `pinned` sub-port (see `design.md`).
- Fail the architecture check when a file under `src/app` names `PiEngineAdapter`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: the application layer depends on a declared backend port rather than on the adapter class.

## Impact

Type-level change with no behavior change for bare `a1` or `a1 pi`. Touches `src/contracts/owned-ui`, `src/integrations/pi/engine/{adapter,workflows,index}.ts` and the four engine files whose plain types became contract aliases, `src/app/session-shell/{session-shell,session-shell-root,exit-notice}.ts`, `src/composition/{owned-ui,session-info-reference}.ts`, and `scripts/governance/project-structure-policy.mjs`. The session-shell test fixture builds a real adapter over a fake `AgentSessionRuntime`, so the forty-nine shell test files need no fake backend.

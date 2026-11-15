## Context

Planning starts at refreshed `origin/develop` commit `64709ced` in worktree `D:/Git/a1/.worktrees/session-exit-control` on branch `feature/session-exit-control`, created with ordinary Git from the primary checkout (the planning session was not an attachable A1 session).

The request comes from the Firstmate–Herdr integration plan (`C:/Users/tprokopiev/Desktop/firstmate-herdr-integration.md`, §10 "Safe external worker shutdown"): a supervisor needs a supported exact-runtime action that validates session identity and the session's actual idle/pending-input/UI state before committing shutdown, with independent outcome verification. The Firstmate fork's current approach (`hc keys <t> C-d` gated by a runtime identity probe, commit `5b9c865c` on pc2) is a keystroke path and does not meet that bar.

### Current owner seams (read at `64709ced`)

- `src/features/integration-api/protocol.ts` owns the version-1 request/response envelope: `OPERATIONS` is `capabilities | settings.list | settings.get | settings.update | session.get`; session targets require complete `sessionId` and `runtimeId` UUIDs; unknown fields fail before mutation. `integrationCapabilities()` returns `{ operations, launchColor, terminalIdentity, snapshots }`.
- `src/features/integration-api/service.ts` routes session-scoped requests through `IntegrationServices.session`, and `applyIntegrationSettings` runs inside the owning runtime.
- `src/cli/api.ts` is the public process boundary: one bounded JSON argument, `requestSessionControl` for session targets, `assertIntegrationResponse` before printing.
- `src/foundation/lifecycle/session-control.ts` is the neutral private transport: nonce, process-liveness and exact session/binding checks, a 5 s deadline ceiling, serialized handling through `queue`, and `dispose()` that destroys sockets, closes the server, then awaits `queue`.
- `src/composition/integration-api.ts` `startIntegrationControl(backend, settings, runtimeDir, runtime)` binds the handler: it rechecks the exact target against `identity()` and `context.runtimeId`, then calls `applyIntegrationSettings`. It knows the backend and settings only, not the shell.
- `src/composition/owned-ui.ts` creates `RuntimeApiLifecycle` (`createRuntimeApis`) before the terminal host/presenter exist; the shell is constructed later in `start()`.
- `src/app/session-shell/session-shell.ts` owns the state a safe exit needs: `view().lifecycle` (`starting|ready|busy|suspended|stopping|stopped|failed`), `root.editor.getText()`, `#submission.waiting`, overlays through the dialog coordinator/terminal `hasOverlay`, and `shutdown()`: the single `/quit` path that runs the engine quit workflow under `boundedCleanup`, disposes the shell and resolves `#stop`.
- `OwnedUiWorkflowPort.clearQueuedWorkflows()` is the only queued-input accessor and it clears. Readiness needs a non-mutating count.

## Goals / Non-Goals

**Goals**

1. A supervisor can ask one exact live bare-A1 session whether it can stop safely and receive a truthful, bounded snapshot.
2. A supervisor can request a graceful stop that is admitted only when nothing would be lost, runs the ordinary `/quit` path, and is acknowledged exactly once.
3. Every refusal is a stable structured error that names what blocks the exit; nothing is cleared, typed, interrupted or killed.
4. Existing operations, capability flags, transport fencing and the Herdr color consumer are unchanged.

**Non-Goals**

- Forced termination, draft clearing, queue discarding, dialog dismissal or turn interruption (a future, separately approved option).
- Proving process exit from inside A1. The acknowledgement means admitted; the consumer verifies exit through its host (Core terminal facts).
- Changing Firstmate, Herdr customizations, Core, or Pi.
- A subscription/event stream, a resident service, or a machine-wide "current session" selector.

## Decisions

### D1. Two operations in protocol 1, no version bump

`session.lifecycle` and `session.exit` join `OPERATIONS`. Both require a `session` target and accept no other fields. Protocol 1 is additive: `capabilities` gains `lifecycle: true`; `launchColor`, `terminalIdentity`, `snapshots` and every existing operation keep their meaning, so the deployed Herdr consumer (which requires only version 1 and the two booleans) is unaffected.

`session.lifecycle` data:

```json
{ "target": {"scope":"session","sessionId":"…","runtimeId":"…"},
  "lifecycle": "ready", "editorEmpty": true, "pendingSubmissions": 0, "queuedInput": 0, "overlayOpen": false,
  "exitAdmissible": true, "blockers": [] }
```

`blockers` is an ordered list drawn from `session-busy` (lifecycle not `ready`), `editor-not-empty`, `pending-input` (waiting submissions or queued engine input), `overlay-open`, `session-stopping` (lifecycle `stopping`/`stopped`/`failed` or shutdown already admitted).

`session.exit` success data: `{ "target": …, "status": "admitted", "lifecycle": "stopping" }`. Failure uses the first blocker as the error code.

### D2. Admission is atomic inside the serialized handler

The handler computes readiness and, when admissible, marks the shell as exit-admitted and starts `SessionShell.shutdown()` with no `await` between the check and the start. Because `serveSessionControl` serializes requests through one `queue`, a concurrent `session.exit` or `settings.update` cannot interleave. A second `session.exit` after admission returns `session-stopping`, never a second success.

### D3. Acknowledge before teardown can reach the socket

`serveSessionControl.dispose()` destroys live sockets before awaiting the queue. If the handler started teardown synchronously, the acknowledgement could be lost. Decision: the handler records admission and returns its result; the actual `shutdown()` call is scheduled on the next macrotask after the response is written (`setImmediate` through the shell's own scheduler port so tests control it). The integration control is disposed by `RuntimeApiLifecycle` during ordinary shutdown as today. A lost acknowledgement therefore means the request may or may not have been admitted; the consumer must read `session.lifecycle` (or observe its host facts) rather than retry blindly, matching the existing lost-acknowledgement guidance.

### D4. A small shell lifecycle port, late-bound into composition

Add `OwnedUiSessionLifecyclePort` to the owned-UI contracts: `readiness(): OwnedUiExitReadiness` and `requestExit(): "admitted" | OwnedUiExitBlocker`. `SessionShell` implements it from its existing state. `startIntegrationControl` receives a provider `() => OwnedUiSessionLifecyclePort | null`; `createRuntimeApis` resolves it from the shell once `start()` has constructed the presenter. Before the shell exists or after disposal the provider returns `null` and lifecycle operations fail with `session-unavailable`.

### D5. Non-mutating queued-input count on the workflow port

Add `queuedWorkflowCount(): number` to `OwnedUiWorkflowPort`, implemented by the Pi engine adapter next to `clearQueuedWorkflows()`. Readiness reads it; `restoreQueued()` behaviour is unchanged. Fake backends in tests gain the method.

### D6. Fail closed on anything uncertain

`starting`, `suspended`, `busy`, `stopping`, `stopped`, `failed`, a non-empty editor (including whitespace-only text is treated as non-empty; trimming is not a user decision A1 should make), any waiting submission, any queued input, any overlay, dialog or selector, and a disposed backend all refuse. There is no `--force`.

### D7. Consumer contract

Herdr Core labels `a1.session` and `a1.runtime` supply the exact target. Firstmate's hc backend (outside this change) would call `a1 api '{"version":1,"id":"…","type":"session.exit","target":{…}}'` via literal argv, treat `success:true` as admitted, and verify the terminal's program exit through Core before archiving or tearing down. Documentation states that exit acknowledgement is not exit proof.

## Risks / Trade-offs

- A session whose model turn ends between `session.lifecycle` and `session.exit` is still handled correctly because admission re-evaluates inside the handler; the snapshot is advisory.
- Treating whitespace-only drafts as non-empty may refuse an exit a person would consider safe; the supervisor can surface the blocker. Loosening this is a product decision, not an integration one.
- The quit workflow can be slow or hang; `shutdown()` already bounds terminal restoration with `boundedCleanup`. The API does not add a second timer.
- Strict OpenSpec validation could not run locally (the installed `@fission-ai/openspec` package has no CLI); CI performs it.

## Migration Plan

Additive. No persisted state, no settings schema change, no consumer edit required. Older A1 installations answer `unsupported-operation` for the new operations, which consumers already treat as "control unavailable".

## Open Questions

Resolved during implementation:

- `suspended` is folded into `session-busy`; the snapshot still carries the exact `lifecycle` value so a supervisor can distinguish it.
- The snapshot carries no turn counter; supervisors already receive turn facts from Core.
- A disposed backend is refused by the transport host before the shell is consulted and reaches the client as a structured `session-unavailable` failure (a rejected call), not a response envelope. Clients already treat rejected calls and failure envelopes alike.
- A failed engine quit clears the admission flag together with the retryable shutdown promise, so a later external request may try again instead of being stuck on `session-stopping`.

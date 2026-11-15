## Why

External supervisors (Firstmate through Herdr Core) must retire finished A1 workers, but A1 exposes no public way to ask a session to stop. Today the only options are typing `/quit` or Ctrl+D into the terminal, or Core's escalating `terminal.kill`. Keystrokes cannot prove the editor was empty or that nothing was queued, a damaged session can forward a typed command to the model, and a kill is not a graceful exit. A1 should let an exact, verified live session report whether it can stop safely and, when it can, stop through the same path as `/quit`, acknowledged over the existing authenticated integration boundary.

## What Changes

- Add two session-scoped operations to the version-1 `a1 api` protocol: `session.lifecycle`, a read-only readiness snapshot (lifecycle state, empty editor, pending submissions, queued engine input, open overlay, and the computed exit admissibility with named blockers), and `session.exit`, a graceful-exit request that the live runtime admits only while that snapshot has no blocker.
- Admit exit atomically inside the runtime's serialized request handler: the precondition check and the start of the ordinary quit path happen with no await between them, the acknowledgement is written before shutdown proceeds, and a later or concurrent request to a stopping session receives a structured refusal rather than a second acknowledgement.
- Never clear a draft, discard queued input, dismiss a dialog, interrupt a running turn or force termination. Refusals are stable structured errors: `session-busy`, `editor-not-empty`, `pending-input`, `overlay-open`, `session-stopping`. There is no force option in this change.
- Report `lifecycle` support in `capabilities` (additive; the existing `launchColor` and `terminalIdentity` flags and all current operations are unchanged).
- Give the owned shell a small lifecycle port the composition hands to the integration host: an exit-readiness snapshot and an exit admission that reuses `SessionShell.shutdown()`. Add a non-mutating queued-input count to the workflow port so readiness can be read without clearing anything.
- Document the operations, acknowledgement semantics (admitted and stopping, not exited), the consumer's duty to verify process exit through its own host facts, and the Firstmate/Herdr usage with native `a1.session`/`a1.runtime` labels.

## Capabilities

### New Capabilities

None. Exit control belongs to the existing integration-api capability.

### Modified Capabilities

- `integration-api`: add the lifecycle snapshot and graceful-exit operations, their admission preconditions, acknowledgement ordering and stable refusals.

## Impact

- Production owners: integration-api protocol/service, the owned-UI composition that binds the private session-control transport, the session shell (readiness and admission), the workflow port and its Pi engine adapter (queued-input count), CLI help and documentation.
- Tests mirror those owners with fake shells, fake backends and the existing disposable session-control fixtures; no live agent is used as a control target.
- No new dependency, resident service, listener, terminal-input injection, transcript inspection or private endpoint discovery. The Herdr customization and Firstmate are external consumers; this change authorizes no edits there.
- This draft is planning-only until the maintainer approves the plan and requests implementation; integration remains a separate exact-candidate decision.

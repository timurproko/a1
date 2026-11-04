## Context

Read-only inspection of the affected installation on 2026-11-04 found:
- Active release: `0.2.7-dev.1239`; pending and approved release: `0.2.7-dev.1240`.
- Automatic-update state: `blocked`, failure `resident-continuity-blocked`.
- Transaction phase: `certified`; error: `resident continuity check timed out`.

`inspectResidentContinuity` runs the candidate's native `workspace-check` with an 8-second process deadline. Native checking discovers profile sources, authenticates and checks each route, and reconciles workspace metadata. Activation checks continuity before and after supervisor preparation. The recorded timeout proves that this path did not finish; it does not yet identify the slow sub-operation or prove an incompatible runtime. Implementation must first identify that sub-operation with payload-free evidence and a deterministic fixture.

## Goals / Non-Goals

Goals:
- Complete background activation for supported healthy resident workspaces without disrupting agents.
- Recover a transient continuity timeout using the already-certified exact candidate.
- Use the exact green `Update installed, restart to update` instruction once restarting is guaranteed to select the approved successor.
- Reconnect the same agents, workspaces, sessions, and outstanding interactions when the app window restarts.

Non-goals:
- Hot-swapping executing agent JavaScript, restarting agents when idle, reboot/logout restoration, or adopting external session writers.
- Bypassing authentication, ignoring unknown live sources, forcing release-state pointers, or presenting a prepared candidate as installed.
- Killing running processes or deleting installation/session/workspace records to make a test pass.

## Decisions

1. Diagnose before changing bounds. Trace source discovery, authenticated inspection, metadata writer contention, and bounded-command lifecycle separately. Fix repeated/unnecessary blocking work or deadline composition if the fixture proves it; do not blindly increase the timeout.
2. Keep activation authority separate from preparation. Only the durable approved active reference establishes restart readiness. Transient failures retain the previous usable release and retry the prepared candidate without repeating npm installation.
3. Remove internal blocked-state wording from routine status presentation. Internal diagnostics retain bounded reasons for support; failure must not produce a green success notice. Preserve Notify mode and explicit-update diagnostics.
4. Treat restart as replacement of the resident viewer, not execution. Existing holders, agents, tools, session writers, inputs, and prompts remain attached to their original owners. Newly created agents use the selected release.
5. Test the failure boundary and full user path. Deterministic timeout/retry coverage must accompany real-process restart coverage, including an agent actively generating and an agent awaiting input. Do not substitute transcript reopening for process continuity.

## Risks / Open Questions

- Which operation exceeded the outer 8-second deadline is not yet known; the implementation must establish this before claiming the root cause repaired.
- Existing old processes retain their old JavaScript and may retain old status wording; candidate activation and native viewer observation must provide a safe upgrade path without requiring those processes to self-modify.
- Genuine incompatibility or an uninspectable live runtime still requires safe refusal. This repair cannot guarantee compatibility with arbitrary future protocols or unsupported old runtimes.

## Validation Strategy

Use a deterministic reproduction of the observed timeout, prepared-candidate retry and invalid-proof cases, status-rendering assertions, and native cross-release detach/reconnect tests with exact process and workspace identities. Run targeted checks before push; normal exact-head CI remains authoritative. Manual observation is optional and never gates progress bookkeeping.

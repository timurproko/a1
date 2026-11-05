## Context

Read-only inspection of the affected installation on 2026-11-04 found:
- Active release: `0.2.7-dev.1239`; pending and approved release: `0.2.7-dev.1240`.
- Automatic-update state: `blocked`, failure `resident-continuity-blocked`.
- Transaction phase: `certified`; error: `resident continuity check timed out`.

`inspectResidentContinuity` runs the candidate's native `workspace-check` with an 8-second process deadline. Previously, each check authenticated sources, opened a workspace writer, reconciled metadata, and opened another writer to persist topology. Activation repeats inspection before and after supervisor preparation. This brought writer contention and repeated durable filesystem flushes into a read-only readiness decision.

An installed-candidate probe reproduced `workspace writer lease is held` in 94 ms. A deterministic fixture now holds that exact lease while checking the live workspace; readiness must succeed without changing workspace bytes or epochs. The rebuilt candidate's read-only check also succeeded against the affected live installation in 1007 ms, 65 ms, and 62 ms, with the same fingerprint and unchanged 8-second deadline. No release references, processes, or user records were modified by the new probe. The historical timeout lacks stage telemetry, so its precise slow operation is not claimed as proven; the independently reproduced writer failure and unnecessary synchronous persistence are repaired.

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

1. Inspect committed workspace metadata without acquiring a writer, advancing epochs, creating directories, repairing history, or persisting topology. Preserve profile/epoch/schema validation, read-only fallback to valid previous topology, authenticated live routes, and verified closed-source refusal. Writable viewer reconciliation remains unchanged in authority. Keep the existing 8-second outer deadline.
2. Keep activation authority separate from preparation. Only the durable approved active reference establishes restart readiness. Transient failures retain the previous usable release and retry the already-certified exact candidate without repeating npm installation. Schedule blocked retries every 15 seconds instead of the normal 15-minute release-discovery interval; successful activation stops observation.
3. Remove internal blocked-state wording from routine prompt and pinned-footer status. The updated native viewer also projects away one unambiguous styled right-edge legacy blocked notice emitted by a retained old agent; arbitrary, linked, ambiguous, and raw fallback content remains untouched. Diagnostics retain bounded reasons; failure never produces a green success notice. Preserve Notify mode and explicit-update diagnostics.
4. Treat restart as replacement of the resident viewer, not execution. Existing holders, agents, tools, session writers, inputs, and prompts remain attached to their original owners. Newly created agents use the selected release.
5. Test the failure boundary and full user path. Deterministic timeout/retry coverage must accompany real-process restart coverage, including an agent actively generating and an agent awaiting input. Do not substitute transcript reopening for process continuity.

## Gap Disposition

- Historical timeout attribution: no stage trace survives. Do not claim a proven historical timeout root cause. The live writer refusal is reproduced, readiness no longer performs workspace writes, the corrected live check succeeds, and residual transient failures retain bounded exact-candidate retry. No deadline increase or compatibility bypass is needed.
- Old executable code remains immutable. Updated client projection handles the exact structured legacy status; an already-running old outer viewer cannot gain new code before replacement. Raw terminal content is deliberately not rewritten.
- Genuine incompatibility, malformed ownership, or an uninspectable live runtime still refuses activation. Compatibility with arbitrary future protocols and unsupported old runtimes is outside this change; it is not converted into false restart readiness.
- No remaining implementation gaps in the approved supported-workspace behavior. CI remains the post-finalization authority; local observations are not represented as CI success.

## Validation Strategy

The held-writer fixture reproduces the activation failure boundary without touching user state. Workspace unit tests cover unchanged bytes/epochs, absent state without creation, recoverable history without repair, and invalid profile/epoch refusal. Composition tests prove delayed prepared retry before registry-cache expiry and observation stopping after success; existing activation tests retain no-reinstall, invalid-proof, and unsafe-source cases.

The native cross-release regression preserves pending input, a session artifact, selected tab, incarnation, child and holder identities, and ongoing output through viewer replacement. Existing release-isolation coverage retains cross-release new-agent selection and workspace order. Notice tests preserve the exact installed instruction and diagnostics while excluding blocked wording from routine chrome, including retained-agent structured output.

Local evidence: build:core, typecheck, architecture and documentation governance passed; 87 targeted TypeScript tests, 13 release-isolation tests, and 11 native notice tests passed. Workspace-focused native tests passed. The startup-public build issue from a shared dependency junction disappeared after installing this worktree's pinned dependencies, without changing the startup budget. Manual observation is optional and never gates progress bookkeeping.

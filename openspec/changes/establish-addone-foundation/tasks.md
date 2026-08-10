## 1. Milestone 1 — Native Pi Walking Skeleton

- [x] 1.1 Select and record the supported Node/platform matrix, TypeScript and module strategy, package manager, exact AddOne TUI version, PTY/emulator stack, SQLite binding, packaging approach, and AddOne config/runtime directory conventions.
- [x] 1.2 Create the standalone AddOne workspace with separate UI, supervisor, domain, protocol, driver, storage, presentation, and test-harness boundaries and expose the package `addone` command.
- [x] 1.3 Add architecture checks that restrict Pi imports to Pi adapter/profile tooling, PTY dependencies to terminal adapters, TUI imports to presentation code, reject private Pi distribution imports and durable `globalThis` state, and prevent the UI from spawning agent processes directly.
- [x] 1.4 Locate the v2 intro source and capture its observable frame sequence, timing, dimensions, colors, completion state, and normalized visual checkpoints as the walking-skeleton reference.
- [x] 1.5 Define the minimal logical workspace, terminal agent, process generation, terminal surface, Native Pi profile, lifecycle state, capability, command, and event contracts without Pi, PTY, or TUI dependencies.
- [x] 1.6 Define the initial additive UI-supervisor protocol subset for handshake, revisioned snapshot, create-terminal-agent, input, resize, terminal-surface updates, exit, stop, request identity, generation identity, and resynchronization.
- [x] 1.7 Create the initial isolated control-store migration and repositories for the workspace, selected tab, logical terminal agent, current generation, driver profile, and lifecycle metadata used by the walking skeleton.
- [x] 1.8 Implement supervisor endpoint discovery, single-instance startup, UI attachment, initial snapshots, ordered events, and creation of terminal workers through the driver boundary.
- [x] 1.9 Implement the initial Native Pi terminal profile that resolves the user's `pi` command from `PATH` and launches it through a supervisor-owned child PTY with explicit cwd, environment, terminal type, and dimensions.
- [x] 1.10 Implement bounded terminal emulation, normalized cells and cursor, input, resize, output flow, process-tree stop, final-surface retention, and exit reporting for the initial Native Pi generation.
- [x] 1.11 Implement deterministic AddOne startup state that plays the v2-derived intro animation to completion from an injectable monotonic clock before revealing the shell.
- [x] 1.12 Implement the first AddOne tab strip with an always-reachable `+` control, selected Native Pi tab, keyboard activation, supported mouse activation, and AddOne-first input consumption.
- [x] 1.13 Implement the terminal surface and route unclaimed keyboard, paste, and supported mouse input to the selected Native Pi PTY while preserving AddOne global controls.
- [x] 1.14 Implement a deterministic fixture executable named `pi` that paints known terminal states, reports received input and dimensions, and exits with scenario-controlled outcomes without model or network access.
- [x] 1.15 Implement the isolated outer AddOne PTY runner with deterministic clocks, temporary home/config/database/socket/workspace/artifact paths, fixture-first `PATH`, keyboard and mouse injection, resize, normalized cells, cursor capture, deadlines, and process-tree cleanup.
- [x] 1.16 Add the release-gating walking-skeleton scenario covering `addone` launch, completed intro, visible `+`, keyboard and mouse tab creation, nested fixture surface, input, resize, child exit, retained final surface, and continued shell operation.
- [x] 1.17 Restart only the UI during the walking-skeleton scenario and verify the supervisor retains the Native Pi child and supplies its resident terminal surface before newer updates.
- [x] 1.18 Add a separate non-gating smoke scenario for an actually installed Native Pi using isolated offline configuration and no model request.
- [x] 1.19 Preserve named normalized frames, input timeline, supervisor events, outer and child logs, environment metadata, final surfaces, assertions, and a concise failure summary for every walking-skeleton failure.
- [x] 1.20 Document how to install or link AddOne, run `addone`, activate `+`, switch between AddOne chrome and Native Pi, run the deterministic scenario, and inspect its artifacts.

## 2. Foundation and Remaining v2 Reference

- [ ] 2.1 Catalogue the remaining initial v2 tabs, sidebar, agent-view, status/toast/scrollbar, PTY, UI-restart, and session-recovery flows with stable scenario IDs.
- [ ] 2.2 Capture normalized v2 reference frames, interaction timelines, state expectations, and performance observations for the remaining scenario catalogue.
- [ ] 2.3 Classify v2 modules as harvest, redesign, defer, or retire and record the specific pure models/tests intended for subsequent increments.

## 3. Driver and Event Contract Expansion

- [ ] 3.1 Expand the domain contracts to cover structured conversation surfaces, runtime and resource profiles, session references, lifecycle policy, and recovery outcomes.
- [ ] 3.2 Expand the capability vocabulary for structured messages, tools, sessions, exact resume, steering, follow-ups, models, extension UI, and specialized terminal behavior.
- [ ] 3.3 Expand the normalized AddOne event union for conversation, tools, queueing, recovery, extension UI, managed process state, and capability changes.
- [ ] 3.4 Expand the driver start, recover, prompt, steering, follow-up, abort, snapshot, session, model, resize, input, and stop interfaces with explicit unsupported-operation results.
- [ ] 3.5 Implement fake structured-conversation and expanded fake terminal drivers covering success, streaming, tool progress, failure, interruption, capability changes, and recovery outcomes.
- [ ] 3.6 Add driver contract tests proving capability rejection, generation correlation, event ordering, stale-event rejection, and failure containment.

## 4. UI-Supervisor Protocol Expansion

- [ ] 4.1 Expand protocol negotiation, idempotency keys, command-result persistence, bounded payload rules, and incompatible-version handling.
- [ ] 4.2 Implement malformed-client isolation, strict framing, request correlation, endpoint permissions, and disconnect cleanup across supported platforms.
- [ ] 4.3 Implement command-result deduplication so retried mutating requests cannot apply twice.
- [ ] 4.4 Complete snapshot revision, event-gap detection, resynchronization, and bounded terminal payload correlation.
- [ ] 4.5 Add protocol tests for unknown additive fields/events, stale revisions, duplicate commands, partial frames, oversized payloads, multiple clients, and reconnect.

## 5. Durable Supervisor Expansion

- [ ] 5.1 Add versioned SQLite migrations for workspace ordering, tab bindings, capabilities, runtime profiles, resource profiles, session references, drafts, leases, inbox/outbox records, interruption records, and lifecycle outcomes.
- [ ] 5.2 Expand transactional repositories and startup recovery queries while keeping runtime conversations outside the control database.
- [ ] 5.3 Implement graceful supervisor shutdown, diagnostic logging, database migration failure handling, and durable startup recovery.
- [ ] 5.4 Implement workspace and agent create, select, rename, reorder, close-presentation, stop, and delete operations with explicit destructive semantics.
- [ ] 5.5 Complete generation creation and stale-generation rejection for every worker event and command result.
- [ ] 5.6 Expand driver registration, capability publication, bounded start/recovery policy, and per-agent failure isolation.
- [ ] 5.7 Implement durable per-agent drafts and verify they survive tab switches, worker replacement, UI restart, and supervisor restart.
- [ ] 5.8 Implement session lease acquisition, canonical identity checks, transfer, denial, and explicit independent-fork handling.
- [ ] 5.9 Implement interruption records that distinguish idle failures from active side-effecting operations and prevent blind automatic replay.
- [ ] 5.10 Add supervisor tests for UI disconnect, multiple UI reconnects, supervisor restart, lease conflict, stale generation, worker crash, sibling isolation, and destructive actions.

## 6. Standalone AddOne Shell Expansion

- [ ] 6.1 Expand serializable application state, intent/update handling, explicit effects, supervisor snapshot application, ordered event application, and resynchronization for all planned surfaces.
- [ ] 6.2 Harvest the v2 tab overflow, active decoration, rename, reorder, title/status animation, and narrow-terminal behavior behind AddOne-owned models.
- [ ] 6.3 Harvest the v2 sidebar workspace/agent rows, sorting, selection, rename, reorder, push/overlay behavior, and action contract behind AddOne selectors and intents.
- [ ] 6.4 Implement the initial structured conversation surface for user messages, assistant text, thinking, tool calls/results, queue state, compaction/retry notices, recovery notices, and errors.
- [ ] 6.5 Expand deterministic input routing through global shortcuts, focused application shortcuts, focused components, structured editor, dialogs, and unclaimed PTY forwarding.
- [ ] 6.6 Harvest the initial v2 transcript scrolling, text selection, selection painting, submission feedback, scrollbar, status, toast, and clipboard behavior without Pi host APIs.
- [ ] 6.7 Implement capability-aware controls so structured, model, session, and terminal actions appear only when supported.
- [ ] 6.8 Add state/update/render tests for mixed surfaces, working/error decorations, drafts, overflow tabs, narrow terminals, focus, shortcut consumption, dialogs, and UI reconnection.

## 7. Hermetic Test Harness Expansion

- [ ] 7.1 Add deterministic fake/replay model behavior and expanded fake-driver orchestration for release-gating UI and supervisor tests without external model access.
- [ ] 7.2 Define the declarative scenario format for launch, user input, mouse input, driver events, resize, faults, waits, clock advancement, deterministic assertions, and artifact retention.
- [ ] 7.3 Generalize artifact bundles to include scenario definition, runtime/profile metadata, session references, driver diagnostics, relevant frames, and failure classification.
- [ ] 7.4 Port the remaining v2 reference catalogue into deterministic fake-driver and real-PTY AddOne scenarios.
- [ ] 7.5 Add parallel scenario isolation tests proving temporary homes, databases, sockets, sessions, workspaces, process trees, and artifacts cannot interfere.

## 8. Generic PTY Driver Expansion

- [ ] 8.1 Expand terminal-agent profiles with arguments, environment, cwd, terminal type, dimensions, runtime identity, trust settings, and declared resume level.
- [ ] 8.2 Harvest remaining v2 Windows/Unix process-tree handling without child Pi frame bridges or build-sync behavior.
- [ ] 8.3 Expand emulator bounds, frame revisions, alternate-screen behavior, backpressure, paste, and supported mouse forwarding.
- [ ] 8.4 Implement spawn-error, transport-error, signal, exit-code, final-surface, and crash-artifact reporting without affecting sibling agents.
- [ ] 8.5 Add generic command, Claude Code, and Codex profile templates while keeping provider-specific semantics disabled by default.
- [ ] 8.6 Add PTY tests for rapid typing, alternate-screen applications, native dialogs, output bounds, missing executables, supervisor snapshots, and concurrent isolated agents.
- [ ] 8.7 Add tests proving terminal text such as `done` or `success` does not create semantic work status.

## 9. Managed Pi RPC Driver

- [ ] 9.1 Create an AddOne-controlled immutable runtime layout and install one exact Pi version without resolving the global `pi` executable.
- [ ] 9.2 Implement strict LF-delimited Pi RPC transport, UTF-8 chunk handling, command correlation, stderr capture, startup deadlines, and process cleanup.
- [ ] 9.3 Implement Managed Pi startup handshake using state and entry queries and publish the normalized capability/readiness snapshot.
- [ ] 9.4 Normalize message streaming and authoritative message completion into AddOne conversation events.
- [ ] 9.5 Normalize correlated tool start, update, completion, result, error, and nested-usage information.
- [ ] 9.6 Normalize queue, agent start/end/settled, compaction, retry, model, thinking, session, and extension-error events.
- [ ] 9.7 Implement immediate prompt, steering, follow-up, abort, acceptance-versus-completion semantics, and adapter-owned operation correlation with invalid-state rejection.
- [ ] 9.8 Implement model listing/selection, thinking levels, queue modes, compaction, retry, extension commands, session tree/entries, fork/clone, and required session switching.
- [ ] 9.9 Persist and reconcile exact Pi session ID, absolute session file, leaf/entry cursor, runtime version, and profile revision.
- [ ] 9.10 Implement exact-session recovery for idle crashes and interrupted-run recovery with identity/file validation and no silent fresh fallback.
- [ ] 9.11 Implement managed-worker replacement under supervisor leases and verify that stale RPC events cannot mutate the replacement generation.
- [ ] 9.12 Add deterministic Managed Pi tests for startup, trust policy, prompt acceptance, streaming, tools, queues, compaction/retry, session entries, worker crash, exact recovery, mismatch, missing file, and continuation.

## 10. Pi Resource Profiles and Extensions

- [ ] 10.1 Implement versioned Managed Pi resource profiles for packages/extensions, skills, prompts, applicable themes/settings, credential references, project trust, and trust policy.
- [ ] 10.2 Implement profile creation, revision, validation, assignment, diagnostics, and immutable binding to active generations.
- [ ] 10.3 Implement Managed engine extension support for tools, events, commands, providers, messages, prompts, skills, and compaction behavior through Pi RPC.
- [ ] 10.4 Map portable extension select, confirm, input, editor, notify, status, widget, title, and editor-text requests into AddOne-owned UI and responses.
- [ ] 10.5 Implement explicit Managed, portable-UI, Native-Pi-only, and unsupported/private compatibility reporting.
- [ ] 10.6 Implement safe-mode worker startup that disables the failed candidate profile while retaining the same conversation session and diagnostics.
- [ ] 10.7 Add representative extension tests for custom tools, permission confirmation, provider registration, extension commands, messages, portable dialogs, startup failure, trust behavior, and native-only classification.

## 11. Runtime Certification and Migration

- [ ] 11.1 Implement side-by-side Pi runtime installation with exact version, installation digest, immutable path, candidate/approved/retired state, and retained diagnostics.
- [ ] 11.2 Implement a compatibility matrix runner for adapter framing, startup, prompt, tool, extension, exact-session recovery, and shutdown scenarios.
- [ ] 11.3 Implement candidate approval that affects new-agent defaults without migrating existing agents automatically.
- [ ] 11.4 Implement idle drain, durable cursor capture, old-writer shutdown, lease transfer, replacement startup, identity verification, and generation commit as one runtime migration workflow.
- [ ] 11.5 Implement failed-migration handling that never marks an unverified worker ready and preserves an explicit rollback path.
- [ ] 11.6 Implement rollback to a previously installed approved runtime/profile under the same one-writer and exact-session checks.
- [ ] 11.7 Add tests proving global Pi updates do not change Managed Pi runtimes and failed candidates do not affect approved or active generations.
- [ ] 11.8 Add migration tests for success, busy-agent deferral, process crash, session mismatch, missing session, profile failure, rollback, and no duplicate writer.

## 12. Independent Evaluator and Regression Gate

- [ ] 12.1 Define evaluator tools for terminal snapshot, controlled input, resize, waits, fault injection, artifact inspection, and structured verdict submission.
- [ ] 12.2 Run the evaluator under a separately pinned known-good runtime with no write access to candidate code or deterministic assertion results.
- [ ] 12.3 Define a verdict schema containing scenario, requirement, pass/fail/flag outcome, observations, referenced frames, and explanation.
- [ ] 12.4 Integrate evaluator execution as a supplement to deterministic assertions so evaluator approval cannot override a deterministic failure.
- [ ] 12.5 Add evaluator scenarios for confusing recovery, broken focus, hidden actions, visual corruption, and a candidate managed agent that cannot operate.
- [ ] 12.6 Add a workflow and fixture convention that converts confirmed evaluator or production regressions into permanent deterministic scenarios.

## 13. Complete Vertical-Slice Acceptance and Documentation

- [ ] 13.1 Add a full-system scenario that creates a workspace and Managed Pi agent, sends a prompt, and renders streaming text and structured tool activity.
- [ ] 13.2 Extend the scenario to combine Managed Pi, Native Pi, and another PTY agent and verify deterministic switching and input routing.
- [ ] 13.3 Restart only the AddOne UI and verify the supervisor, agents, drafts, workspace order, tabs, statuses, and resident terminal surfaces remain available.
- [ ] 13.4 Kill the Managed Pi worker and verify bounded recovery of the exact session, interrupted-state reporting where applicable, and successful continuation.
- [ ] 13.5 Run narrow-terminal, concurrent-scenario, worker-isolation, candidate-failure, and rollback acceptance scenarios and preserve reproducible artifacts.
- [ ] 13.6 Document process topology, storage authority, driver capabilities, Managed-versus-Native Pi behavior, extension compatibility, recovery guarantees, runtime updates, and non-resumable PTY limitations.
- [ ] 13.7 Document the v2 modules intentionally harvested, deferred, and retired so follow-up proposals do not reintroduce private Pi host infrastructure.

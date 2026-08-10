## 1. Foundation and v2 Reference

- [ ] 1.1 Create the standalone AddOne workspace with separate UI, supervisor, domain, protocol, driver, storage, presentation, and test-harness boundaries.
- [ ] 1.2 Select and record the supported Node/platform matrix, SQLite binding, packaging approach, and working AddOne config/runtime directory conventions.
- [ ] 1.3 Add architecture checks that restrict Pi imports to Pi adapter/profile tooling, PTY dependencies to terminal adapters, TUI imports to presentation code, and reject private Pi distribution imports and durable `globalThis` state.
- [ ] 1.4 Catalogue the initial v2 tabs, sidebar, agent-view, status/toast/scrollbar, PTY, UI-restart, and session-recovery flows with stable scenario IDs.
- [ ] 1.5 Capture normalized v2 reference frames, interaction timelines, state expectations, and performance observations for the initial scenario catalogue.
- [ ] 1.6 Classify v2 modules as harvest, redesign, defer, or retire and record the specific pure models/tests intended for the initial slice.

## 2. Driver and Event Contracts

- [ ] 2.1 Define logical workspace, logical agent, process generation, surface, runtime profile, resource profile, session reference, and lifecycle-state contracts without Pi or TUI dependencies.
- [ ] 2.2 Define the capability vocabulary for structured messages, tools, sessions, exact resume, steering, follow-ups, models, extension UI, and terminal surfaces.
- [ ] 2.3 Define the normalized AddOne event union for lifecycle, conversation, tools, queueing, recovery, extension UI, terminal frames, and process exit.
- [ ] 2.4 Define the agent-driver start, recover, input, resize, stop, snapshot, and event interfaces with explicit unsupported-operation results.
- [ ] 2.5 Implement fake structured-conversation and fake terminal drivers covering success, streaming, tool progress, failure, interruption, capability changes, and recovery outcomes.
- [ ] 2.6 Add driver contract tests proving capability rejection, generation correlation, event ordering, and failure containment.

## 3. UI-Supervisor Protocol

- [ ] 3.1 Define the additive local protocol with handshake, protocol negotiation, correlated request IDs, idempotency keys, revisioned snapshots, ordered events, and bounded payload rules.
- [ ] 3.2 Implement platform-local supervisor endpoint discovery with isolated named-pipe or Unix-socket namespaces.
- [ ] 3.3 Implement protocol encoding/decoding, malformed-client isolation, request correlation, and disconnect cleanup.
- [ ] 3.4 Implement command-result deduplication so retried mutating requests cannot apply twice.
- [ ] 3.5 Implement snapshot revision and event-gap detection with explicit client resynchronization.
- [ ] 3.6 Add protocol tests for unknown additive fields/events, stale revisions, duplicate commands, partial frames, oversized payloads, and reconnect.

## 4. Durable Supervisor

- [ ] 4.1 Create versioned SQLite migrations for workspaces, agents, tab bindings, generations, capabilities, runtime profiles, resource profiles, session references, drafts, leases, inbox/outbox records, and lifecycle outcomes.
- [ ] 4.2 Implement transactional repositories and recovery queries for the control-plane model while keeping runtime conversations outside the control database.
- [ ] 4.3 Implement the persistent supervisor process, single-instance ownership, startup recovery, graceful shutdown, and diagnostic logging.
- [ ] 4.4 Implement workspace and agent create, select, rename, reorder, close-presentation, stop, and delete operations with explicit destructive semantics.
- [ ] 4.5 Implement generation creation and stale-generation rejection for every worker event and command result.
- [ ] 4.6 Implement driver registration, capability publication, bounded start/recovery policy, and per-agent failure isolation.
- [ ] 4.7 Implement durable per-agent drafts and verify they survive tab switches, worker replacement, UI restart, and supervisor restart.
- [ ] 4.8 Implement session lease acquisition, canonical identity checks, transfer, denial, and explicit independent-fork handling.
- [ ] 4.9 Implement interruption records that distinguish idle failures from active side-effecting operations and prevent blind automatic replay.
- [ ] 4.10 Implement initial supervisor snapshots and ordered event streaming for newly attached UI clients.
- [ ] 4.11 Add supervisor tests for UI disconnect, UI reconnect, supervisor restart, lease conflict, stale generation, worker crash, sibling isolation, and destructive actions.

## 5. Standalone AddOne Shell

- [ ] 5.1 Create the standalone terminal entry point using an AddOne-pinned TUI dependency independent from all worker Pi installations.
- [ ] 5.2 Implement serializable application state, intent/update handling, explicit effects, supervisor snapshot application, ordered event application, and resynchronization.
- [ ] 5.3 Harvest the v2 tab layout, overflow, always-reachable add action, active decoration, rename, reorder, title/status animation, and narrow-terminal behavior behind AddOne-owned models.
- [ ] 5.4 Harvest the v2 sidebar workspace/agent rows, sorting, selection, rename, reorder, push/overlay behavior, and action contract behind AddOne state selectors and intents.
- [ ] 5.5 Implement the initial structured conversation surface for user messages, assistant text, thinking, tool calls/results, queue state, compaction/retry notices, recovery notices, and errors.
- [ ] 5.6 Implement the initial terminal surface component using bounded cell/cursor snapshots supplied by a terminal driver.
- [ ] 5.7 Implement deterministic input routing through global shortcuts, focused application shortcuts, focused components, structured editor, and unclaimed PTY forwarding.
- [ ] 5.8 Harvest the initial v2 transcript scrolling, text selection, selection painting, submission feedback, scrollbar, status, toast, and clipboard behavior without Pi host APIs.
- [ ] 5.9 Implement capability-aware controls so structured, model, session, and terminal actions appear only when supported.
- [ ] 5.10 Add state/update/render tests for mixed surfaces, working/error decorations, drafts, overflow tabs, narrow terminals, focus, shortcut consumption, and UI reconnection.

## 6. Hermetic Test Harness Foundation

- [ ] 6.1 Implement an isolated scenario context that creates temporary home, AddOne config, supervisor database, runtime store, Pi config, sessions, sockets, workspace, logs, and artifact directories.
- [ ] 6.2 Implement deterministic clocks, IDs, fake/replay model behavior, and fake drivers for release-gating UI and supervisor tests without external model access.
- [ ] 6.3 Implement a real AddOne CLI PTY runner with strict process-tree cleanup, input, resize, normalized cells, cursor capture, deadlines, and parallel scenario isolation.
- [ ] 6.4 Define a declarative scenario format for launch, user input, driver events, resize, faults, waits, deterministic assertions, and artifact retention.
- [ ] 6.5 Implement artifact bundles containing scenario definition, environment/runtime metadata, input timeline, logs, supervisor events, relevant frames, session references, assertions, and failure summary.
- [ ] 6.6 Port the initial v2 reference catalogue into deterministic fake-driver and real-PTY AddOne scenarios.

## 7. Generic PTY Driver

- [ ] 7.1 Implement terminal-agent profiles with explicit executable, arguments, environment, cwd, terminal type, dimensions, runtime identity, and declared resume level.
- [ ] 7.2 Harvest v2 PTY spawn and Windows/Unix process-tree handling without child Pi frame bridges or build-sync behavior.
- [ ] 7.3 Harvest the bounded terminal emulator, cursor model, frame revisions, resize behavior, and resident-surface snapshot support.
- [ ] 7.4 Implement ordered unclaimed input, paste, supported mouse forwarding, PTY resize, output backpressure, and process stop.
- [ ] 7.5 Implement spawn-error, transport-error, signal, exit-code, final-surface, and crash-artifact reporting without affecting sibling agents.
- [ ] 7.6 Implement UI reconnect so resident PTY surfaces are included in supervisor snapshots before subsequent terminal updates.
- [ ] 7.7 Add generic command, Native Pi, Claude Code, and Codex profile templates while keeping provider-specific semantics disabled by default.
- [ ] 7.8 Add PTY tests for interactive input, rapid typing, resize, alternate-screen applications, native dialogs, output bounds, child exit, missing executables, UI restart, and concurrent isolated agents.
- [ ] 7.9 Add tests proving terminal text such as `done` or `success` does not create semantic work status.

## 8. Managed Pi RPC Driver

- [ ] 8.1 Create an AddOne-controlled immutable runtime layout and install one exact Pi version without resolving the global `pi` executable.
- [ ] 8.2 Implement strict LF-delimited Pi RPC transport, UTF-8 chunk handling, command correlation, stderr capture, startup deadlines, and process cleanup.
- [ ] 8.3 Implement Managed Pi startup handshake using state and entry queries and publish the normalized capability/readiness snapshot.
- [ ] 8.4 Normalize message streaming and authoritative message completion into AddOne conversation events.
- [ ] 8.5 Normalize correlated tool start, update, completion, result, error, and nested-usage information.
- [ ] 8.6 Normalize queue, agent start/end/settled, compaction, retry, model, thinking, session, and extension-error events.
- [ ] 8.7 Implement immediate prompt, steering, follow-up, abort, and acceptance-versus-completion semantics with invalid-state rejection.
- [ ] 8.8 Implement model listing/selection, thinking levels, queue modes, compaction, retry, commands, session tree/entries, fork/clone, and session switching required by the initial UI.
- [ ] 8.9 Persist and reconcile exact Pi session ID, absolute session file, leaf/entry cursor, runtime version, and profile revision.
- [ ] 8.10 Implement exact-session recovery for idle crashes and interrupted-run recovery with identity/file validation and no silent fresh fallback.
- [ ] 8.11 Implement managed-worker replacement under supervisor leases and verify that stale RPC events cannot mutate the replacement generation.
- [ ] 8.12 Add deterministic Managed Pi tests for startup, prompt acceptance, streaming, tools, queues, compaction/retry, session entries, worker crash, exact recovery, mismatch, missing file, and conversation continuation.

## 9. Pi Resource Profiles and Extensions

- [ ] 9.1 Implement versioned Managed Pi resource profiles for packages/extensions, skills, prompts, applicable themes/settings, credential references, and trust policy.
- [ ] 9.2 Implement profile creation, revision, validation, assignment, diagnostics, and immutable binding to active generations.
- [ ] 9.3 Implement Managed engine extension support for tools, events, commands, providers, messages, prompts, skills, and compaction behavior through Pi RPC.
- [ ] 9.4 Map portable extension select, confirm, input, editor, notify, status, widget, title, and editor-text requests into AddOne-owned UI and responses.
- [ ] 9.5 Implement explicit Managed, portable-UI, Native-Pi-only, and unsupported/private compatibility reporting.
- [ ] 9.6 Implement safe-mode worker startup that disables the failed candidate profile while retaining the same conversation session and diagnostics.
- [ ] 9.7 Add representative extension tests for custom tools, permission confirmation, provider registration, extension commands, messages, portable dialogs, startup failure, and native-only classification.

## 10. Runtime Certification and Migration

- [ ] 10.1 Implement side-by-side Pi runtime installation with exact version, installation digest, immutable path, candidate/approved/retired state, and retained diagnostics.
- [ ] 10.2 Implement a compatibility matrix runner for adapter framing, startup, prompt, tool, extension, exact-session recovery, and shutdown scenarios.
- [ ] 10.3 Implement candidate approval that affects new-agent defaults without migrating existing agents automatically.
- [ ] 10.4 Implement idle drain, durable cursor capture, old-writer shutdown, lease transfer, replacement startup, identity verification, and generation commit as one runtime migration workflow.
- [ ] 10.5 Implement failed-migration handling that never marks an unverified worker ready and preserves an explicit rollback path.
- [ ] 10.6 Implement rollback to a previously installed approved runtime/profile under the same one-writer and exact-session checks.
- [ ] 10.7 Add tests proving global Pi updates do not change Managed Pi runtimes and failed candidates do not affect approved or active generations.
- [ ] 10.8 Add migration tests for success, busy-agent deferral, process crash, session mismatch, missing session, profile failure, rollback, and no duplicate writer.

## 11. Independent Evaluator and Regression Gate

- [ ] 11.1 Define evaluator tools for terminal snapshot, controlled input, resize, waits, fault injection, artifact inspection, and structured verdict submission.
- [ ] 11.2 Run the evaluator under a separately pinned known-good runtime with no write access to candidate code or deterministic assertion results.
- [ ] 11.3 Define a verdict schema containing scenario, requirement, pass/fail/flag outcome, observations, referenced frames, and explanation.
- [ ] 11.4 Integrate evaluator execution as a supplement to deterministic assertions so evaluator approval cannot override a deterministic failure.
- [ ] 11.5 Add evaluator scenarios for confusing recovery, broken focus, hidden actions, visual corruption, and a candidate managed agent that cannot operate.
- [ ] 11.6 Add a workflow and fixture convention that converts confirmed evaluator or production regressions into permanent deterministic scenarios.

## 12. Vertical-Slice Acceptance and Documentation

- [ ] 12.1 Add a full-system scenario that starts AddOne, creates a workspace, creates a Managed Pi agent, sends a prompt, and renders streaming text and structured tool activity.
- [ ] 12.2 Extend the scenario to add a Native Pi or other PTY agent, switch between structured and terminal surfaces, and verify deterministic input routing.
- [ ] 12.3 Restart only the AddOne UI and verify that the supervisor, agents, drafts, workspace order, tabs, statuses, and resident terminal surface remain available.
- [ ] 12.4 Kill the Managed Pi worker and verify bounded recovery of the exact session, interrupted-state reporting where applicable, and successful conversation continuation.
- [ ] 12.5 Run narrow-terminal, concurrent-scenario, worker-isolation, candidate-failure, and rollback acceptance scenarios and preserve reproducible artifacts.
- [ ] 12.6 Document AddOne process topology, storage authority, driver capabilities, Managed-versus-Native Pi behavior, extension compatibility levels, recovery guarantees, runtime update flow, and known non-resumable PTY limitations.
- [ ] 12.7 Document the v2 modules intentionally harvested, deferred, and retired so follow-up migration proposals do not reintroduce private Pi host infrastructure.

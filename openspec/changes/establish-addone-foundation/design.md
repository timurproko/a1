## Context

See `proposal.md` for motivation and the five capability specs for normative behavior. The v2 prototype is an approximately 100,000-line collection of Pi extensions with especially large investments in multi-agent lifecycle, host composition, terminal rendering, Git UX, and tests. Its most expensive coupling is concentrated in a version-specific Pi host bridge, private TUI frame interception, extension-generation reload state, and a distributed whole-system reload transaction.

The new architecture must preserve selected v2 UX while supporting two fundamentally different agent surfaces:

- a structured Managed Pi conversation rendered entirely by AddOne; and
- an opaque terminal surface for Native Pi, Claude Code, Codex, shells, and arbitrary commands.

Pi's documented RPC mode provides structured session, message, tool, queue, compaction, model, and portable extension-UI behavior. It does not provide the complete interactive Pi TUI or arbitrary `ctx.ui.custom()` components. Native Pi in a PTY is therefore retained as the full interactive compatibility path rather than forcing one integration mode to satisfy incompatible goals.

## Goals / Non-Goals

**Goals:**

- Establish AddOne as an independent terminal application rather than a Pi extension.
- Make UI-process replacement independent from agent-process lifetime.
- Define a durable logical-agent model and a capability-based driver contract.
- Deliver one architectural vertical slice containing basic v2-derived tabs/sidebar UX, a structured Managed Pi agent, a generic PTY agent, exact Managed Pi recovery, and hermetic full-system tests.
- Constrain Pi-specific knowledge to the Managed Pi adapter and PTY-specific knowledge to the terminal adapter.
- Make Pi and extension updates side-by-side, certifiable, reversible process replacements.
- Preserve v2 behavior by harvesting pure models, render calculations, PTY knowledge, and tests rather than importing its host dependency graph.

**Non-Goals:**

- Full visual or feature parity with v2 in the first change.
- Migration of the v2 Git app, plans, answer/refinement, advanced paste/chips, modes, intro/outro, asset store, or specialized project integrations.
- A universal semantic automation layer for arbitrary PTY programs.
- Full Managed-mode support for Pi extensions that require Pi's native TUI.
- Hot-swapping AddOne supervisor code, Pi code, or extensions inside running worker processes.
- Replacing Pi's JSONL session format with an AddOne transcript format.
- Automatically replaying interrupted side-effecting tool operations.

## Decisions

### 1. Use a standalone UI client and persistent supervisor

The initial process topology is:

```text
horde/addone UI process
        │ local additive protocol
        ▼
addone supervisor process
        ├── Managed Pi RPC child per managed agent
        └── PTY child per terminal agent
```

The UI process owns presentation and can be killed, upgraded, or reloaded without stopping agents. The supervisor owns durable state and worker handles. A supervisor restart reconstructs durable control state and recovers runtimes according to driver capability; the initial design does not promise that every non-resumable generic PTY survives supervisor failure.

Alternative considered: keep the shell as a Pi extension. Rejected because it recreates the host-version and reload coupling this change exists to remove.

Alternative considered: put UI and supervisor in one process. Rejected because UI development reloads and rendering crashes would regain authority over agent lifetime.

### 2. Use a capability-based driver boundary rather than a lowest-common-denominator agent API

Drivers advertise capabilities such as structured messages, structured tools, sessions, exact resume, steering, follow-ups, model controls, portable extension UI, and terminal surface. UI actions are enabled from capabilities and unsupported operations fail explicitly.

The supervisor normalizes lifecycle events for all agents but does not pretend that generic PTYs provide semantic model or work state.

Alternative considered: expose only terminal input/output for every agent. Rejected because it discards Pi's structured RPC advantages and makes reliable recovery, orchestration, and testing needlessly fragile.

Alternative considered: force every backend into a rich conversation contract. Rejected because generic terminal agents cannot satisfy that contract without provider-specific and often undocumented parsing.

### 3. Use Pi RPC as the primary Managed Pi boundary

Each Managed Pi agent runs an exactly pinned Pi executable in RPC mode. The adapter uses a strict LF-delimited JSON parser, correlates commands and responses, normalizes events, and treats final message/session records as authoritative over partial streams.

The adapter initially supports prompting, steering, follow-ups, abort, state, entries, model/thinking controls, queues, compaction, retries, session switching/forking where required, extension commands, and portable extension UI requests.

Alternative considered: embed all Pi sessions through the SDK in the supervisor process. Rejected for the initial architecture because one broken extension or Pi runtime could compromise the supervisor, and side-by-side Pi versions would be harder to isolate.

Alternative considered: use interactive Pi PTYs for the managed custom UI. Rejected because screen parsing cannot provide a stable structured conversation model. Native Pi PTY remains a separate driver.

A version-specific SDK sidecar remains an allowed future adapter when a required public operation is absent from RPC, but SDK types must not cross the AddOne driver boundary.

### 4. Treat PTYs as opaque terminal surfaces

The generic PTY adapter owns process spawn, environment, cwd, input bytes, paste, resize, mouse forwarding where supported, terminal emulation, bounded resident frames, process-tree stop, and exit reporting. It never parses visible text to infer tools, models, settled state, or successful work.

Provider-specific PTY drivers may add documented resume or status capabilities, but those capabilities are additive and separately tested. Native Pi PTY is the full compatibility path for Pi's interactive commands, custom TUI extensions, editor replacements, themes, and overlays.

The useful v2 PTY/emulator code is harvested into this adapter. The v2 committed-frame child bridge is not migrated because it depends on private Pi rendering behavior.

### 5. Keep one stable AddOne protocol between UI and supervisor

The local protocol uses correlated request IDs, idempotency keys for mutating commands, revisioned full snapshots, ordered incremental events, explicit capability sets, and additive message evolution. Unknown additive fields and event types are ignored safely; incompatible changes require protocol negotiation rather than reinterpretation.

On connection, the supervisor sends a full snapshot at revision N. The UI applies only events after N in order. A gap causes resynchronization. UI state is derived from the snapshot and events rather than process-global registries.

Large terminal surfaces may use a bounded binary or compressed payload channel, but their metadata remains correlated with the ordered control stream.

### 6. Separate control-plane authority from conversation authority

SQLite in WAL mode is the initial control-plane store. It contains:

- workspaces and ordering;
- logical agents and tab bindings;
- agent process generations;
- driver and capability metadata;
- runtime and extension profile revisions;
- Pi session references and durable cursors;
- drafts;
- leases;
- inbox/outbox records;
- lifecycle and migration outcomes.

Pi JSONL remains authoritative for Managed Pi conversation history. AddOne stores session ID, absolute file, leaf/cursor, and verification metadata rather than maintaining a competing transcript database. Terminal drivers retain their provider-specific session references and bounded terminal artifacts according to capability.

Alternative considered: continue with one mutable daemon JSON file. Rejected because correlated lifecycle, leases, idempotent commands, profile revisions, and concurrent UI/supervisor reads benefit from transactional updates and indexed recovery queries.

### 7. Model a logical agent separately from process generations

A logical agent has stable identity, workspace, driver, cwd/worktree, profiles, session reference, lifecycle policy, and current generation. Every spawn creates a new generation with its own runtime version, process identity, start reason, capabilities, and terminal or RPC connection.

All worker events carry agent ID and generation. Stale generations cannot mutate the current agent. Generation transitions are committed transactionally with lease changes.

Recovery distinguishes:

- idle recoverable failure: bounded restart with exact session;
- active managed failure: resume durable session and mark the active operation interrupted;
- resumable specialized PTY failure: invoke its documented resume path;
- generic non-resumable PTY failure: preserve final evidence and report non-recoverability.

### 8. Enforce one writer per resumable session

Session ownership is a supervisor lease keyed by canonical runtime/session identity. Process replacement follows:

1. Stop accepting new input for the generation.
2. Drain to idle when possible or record interruption.
3. Persist draft, outbox, session ID, file, and durable cursor.
4. Stop the old writer and confirm it no longer owns the session.
5. Release the old generation lease.
6. Start the replacement against the exact session.
7. Verify reported session ID and reconcile entries after the cursor.
8. Commit the replacement generation and resume input.

If verification fails, the replacement never becomes ready. Rollback may restart the old installed runtime only after confirming no competing writer exists.

### 9. Install Pi runtimes and resource profiles side by side

Managed Pi never resolves the global `pi` executable. AddOne maintains immutable runtime directories identified by exact package version and installation digest. Active generations record their runtime.

Resource profiles are versioned separately and include extensions/packages, skills, prompts, relevant settings, credentials reference, and trust policy. Installing or updating a resource creates a candidate profile revision. It does not mutate live workers automatically.

Promotion sequence:

```text
install candidate
  → run adapter contract suite
  → run hermetic recovery/extension scenarios
  → mark approved for new agents
  → migrate idle existing agents explicitly or by policy
```

Rollback selects a previously installed approved runtime/profile; it does not reinstall or downgrade the user's global Pi.

### 10. Classify Pi extension compatibility

Managed Pi profiles classify extension behavior into:

1. **Managed engine**: tools, events, messages, commands, providers, compaction, prompts, and skills.
2. **Managed portable UI**: RPC-supported select, confirm, input, editor, notify, status, simple widget, title, and editor-text requests mapped to AddOne-owned UI.
3. **Native Pi only**: custom Pi TUI components, custom editor/footer/header behavior, direct TUI input, and other interactive-only behavior.
4. **Unsupported/private**: private Pi patches or unverified internal dependencies.

The classification is capability- and test-based, not a guarantee inferred only from package metadata. A profile startup failure can be retried in safe mode without changing its Pi session.

AddOne application plugins and Pi runtime extensions remain separate concepts. Pi extensions do not gain authority over AddOne shell rendering or non-Pi agents.

### 11. Use AddOne-owned state/update/view presentation

The shell has a serializable application state updated by user intents and supervisor events. Rendering is a pure or bounded deterministic projection of that state. Effects such as commands, timers, clipboard operations, and terminal writes are explicit services.

The initial shell has two primary content components:

- `ConversationSurface`, driven by normalized messages/tools/queue/recovery state;
- `TerminalSurface`, driven by terminal cells/cursor and PTY lifecycle.

Tabs and sidebar select these surfaces without knowing Pi or PTY implementation details.

The outer UI initially uses an exactly pinned `@earendil-works/pi-tui` as an independent rendering library to maximize reuse of v2 geometry and components. Its version is owned by AddOne and does not need to match any Managed or Native Pi runtime. Only presentation packages import it.

Alternative considered: rewrite the complete TUI toolkit before starting. Rejected because it adds risk without validating the agent architecture. A later fork or replacement remains possible behind AddOne UI components.

### 12. Harvest v2 behavior instead of moving its dependency graph

V2 remains frozen as a reference during the initial migration. For each migrated feature:

1. Record observable UX scenarios and baseline artifacts.
2. Copy or rewrite tests as implementation-independent requirements.
3. Extract pure model, geometry, parser, or renderer code.
4. Replace Pi host and extension APIs with AddOne state selectors, intents, and services.
5. Run unit, render, and PTY parity scenarios.
6. Remove the v2 implementation only in a later retirement change.

Initial harvesting priorities are:

- tabs: layout, overflow, add action, rename, reorder, title/status animation;
- sidebar: snapshot/view/action shape, workspace and agent rows, sorting and rename;
- agent view: transcript scrolling, selection, user/tool presentation, submission feedback;
- shell chrome: status, toast, scrollbar behavior;
- PTY: spawn, resize, emulator, resident frames, crash capture, Windows process behavior.

The following are explicitly rejected from migration: `core/host/pi`, host profiles, setup gates, shared extension generations, child committed-frame interception, build stamps, child bundles, daemon logic swapping, and Alt+R whole-system reload.

Architecture checks enforce that Pi imports exist only in Pi adapter/profile tooling, PTY dependencies exist only in terminal adapters, domain code imports neither, and durable state does not use `globalThis`.

### 13. Build the test harness with the first shell slice

Testing is not deferred until feature parity. The first UI components run against deterministic fake drivers. The real CLI runs in an isolated PTY with temporary home/config/database/runtime/session/socket/workspace/artifact paths.

Test layers are:

- pure domain state-machine and lease tests;
- UI state/update/render tests;
- driver contract tests using fakes;
- Managed Pi adapter matrix using pinned candidate runtimes and deterministic model fixtures;
- generic and specialized PTY tests;
- full AddOne PTY scenarios;
- independent evaluator-agent scenarios for visual-semantic or usability findings.

Deterministic assertions remain authoritative. The evaluator runs under a separately pinned known-good runtime and produces a structured verdict with frame references. Confirmed regressions become permanent fixtures.

## Risks / Trade-offs

- **[Risk] Rebuilding a structured conversation UI is substantial work.** → Limit the initial surface to messages, thinking, tools, queues, errors, compaction/retry status, and one editor; keep Native Pi PTY as the escape hatch for advanced interactive features.
- **[Risk] RPC changes can still break an adapter.** → Pin runtimes, isolate Pi parsing in one adapter, run a candidate compatibility matrix, and never promote in place.
- **[Risk] Some Pi extensions will not work in Managed mode.** → Publish explicit compatibility classes and provide Native Pi mode instead of emulating arbitrary TUI components.
- **[Risk] A persistent supervisor introduces protocol and storage complexity.** → Keep its protocol additive, state transactional, UI rendering absent, and begin with a narrow vertical slice.
- **[Risk] Supervisor failure may terminate or detach PTYs.** → Guarantee UI-process independence first; use driver-specific recovery and consider reconnectable per-agent hosts only if measured supervisor-upgrade requirements justify the added process layer.
- **[Risk] SQLite/native packaging can complicate distribution.** → Select a maintained binding with prebuilt Windows/Linux/macOS support and test packaged binaries in CI; keep storage behind a port.
- **[Risk] V2 code carries hidden Pi assumptions even in apparently reusable views.** → Migrate only code that passes dependency checks and new fake-state/render tests; prefer rewriting integration seams over compatibility wrappers.
- **[Risk] Visual parity can consume the project.** → Use behavior-oriented UX scenarios and prioritize reachability, focus, continuity, status clarity, and performance over exact cell equality.
- **[Risk] Generic PTY agents offer weak recovery and status.** → Advertise capability honestly, add specialized drivers incrementally, and never convert screen text into semantic guarantees.
- **[Risk] Multiple agents can modify the same repository concurrently.** → Keep cwd/worktree as an explicit agent property and introduce per-agent worktree policy in a follow-up capability before autonomous parallel editing is enabled by default.

## Migration Plan

### Stage 0: Freeze and catalogue v2

- Keep v2 operational as a reference; do not refactor its host bridge into the new codebase.
- Catalogue key flows with stable IDs and capture normalized frames, timings, and expected state transitions.
- Mark each v2 feature as harvest, redesign, defer, or retire.

Rollback: none required; no v2 behavior changes.

### Stage 1: Shell and fake-driver slice

- Establish dependency boundaries and architecture checks.
- Build the AddOne state/update/view shell with basic tabs, sidebar, status, notifications, conversation surface, and terminal surface.
- Drive it entirely from fake supervisor snapshots/events and verify v2-derived UX scenarios.

Rollback: remove the standalone experimental entry point; v2 remains untouched.

### Stage 2: Persistent supervisor

- Add the local protocol, SQLite control store, logical-agent model, generations, leases, snapshots, event revisions, and UI reconnection.
- Continue using fake workers until UI restart and command idempotency scenarios pass.

Rollback: use an isolated development database and retain v2 as the production path.

### Stage 3: Generic PTY slice

- Harvest bounded PTY spawn, terminal emulation, resize, input, resident surface, exit, and crash-artifact behavior.
- Add generic command, Native Pi, Claude Code, and Codex profiles without semantic screen parsing.

Rollback: disable PTY profile creation; no Managed Pi sessions are affected.

### Stage 4: Managed Pi slice

- Install one exact Pi runtime under AddOne control.
- Implement strict RPC framing, normalization, conversation rendering, command correlation, and session-reference persistence.
- Prove prompt/tool display, UI restart, worker crash, exact-session recovery, and continuation.

Rollback: retain the runtime and session artifacts, disable Managed profile creation, and continue using Native Pi PTY or v2.

### Stage 5: Extension profiles and portable UI

- Add profile revisions, package/resource discovery, diagnostics, safe mode, portable extension UI mapping, and compatibility labels.
- Test representative tool, permission, provider, command, and dialog extensions.

Rollback: pin agents to the last approved profile revision.

### Stage 6: Candidate updates and evaluator tests

- Add side-by-side runtime installation, certification, explicit migration, rollback, full PTY artifact bundles, and independent evaluator execution.
- Do not automatically migrate existing agents when a candidate is approved.

Rollback: select the prior approved runtime/profile and recover the same verified sessions under one-writer leases.

### Stage 7: Follow-up UX harvesting

- Propose separate changes for paste/history/editor polish, models/settings, Git, modes/plans/answer, intro/outro, and eventual v2 retirement.
- Each follow-up uses the same behavior-test and dependency-boundary migration method.

## Open Questions

- Which maintained SQLite binding and packaging strategy best satisfies the supported Node and operating-system matrix?
- Whether the product command, package scopes, and config directory should use `addone` immediately or retain a neutral internal identifier while AddOne remains a working name.
- Whether reconnectable per-agent host processes are justified after measuring supervisor-upgrade frequency and PTY recovery limitations; this does not change the initial UI/supervisor/driver boundary.

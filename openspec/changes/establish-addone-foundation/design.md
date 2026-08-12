## Context

See `proposal.md` for motivation and the five capability specs for normative behavior. The v2 prototype is an approximately 100,000-line collection of Pi extensions with especially large investments in multi-agent lifecycle, host composition, terminal rendering, Git UX, and tests. Its most expensive coupling is concentrated in a version-specific Pi host bridge, private TUI frame interception, extension-generation reload state, and a distributed whole-system reload transaction.

The new architecture must preserve selected v2 UX while supporting two fundamentally different agent surfaces:

- a structured Managed Pi conversation rendered entirely by AddOne; and
- an opaque terminal surface for Native Pi, Claude Code, Codex, shells, and arbitrary commands.

Pi's documented RPC mode provides structured session, message, tool, queue, compaction, model, and portable extension-UI behavior. It does not provide the complete interactive Pi TUI or arbitrary `ctx.ui.custom()` components. Native Pi in a PTY is therefore retained as the full interactive compatibility path rather than forcing one integration mode to satisfy incompatible goals.

The first raw-stream implementation exposed a terminal-host boundary error. Pi wrote the expected fullscreen mouse modes internally, but Windows ConPTY consumed those mode changes before AddOne's shadow emulator observed them. AddOne then replayed other child controls onto the physical terminal, allowing child and host input-mode ownership to diverge: physical wheel input became alternate-scroll arrows and Windows console records remained encoded after exit. The v2 reference avoided this because Pi and its extension host directly shared one outer terminal and restored modes synchronously in Pi's own stop path. The Herdr multiplexer demonstrates the appropriate standalone pattern: the foreground client owns the physical terminal, each child writes only into a resident virtual terminal, and host input is decoded semantically then encoded for the focused child. Herdr is AGPL architectural prior art only; AddOne will not copy its implementation.

The first published self-update exposed a separate AddOne-specific lifecycle hazard: npm replaced release 0.1.3 with 0.1.4 while a detached protocol-1 supervisor remained alive, after which the protocol-2 UI connected to its still-live endpoint and received `invalid client message`. Pi's self-update does not face that protocol split because Pi has no persistent supervisor/client cohort: the updating process retains already loaded code and new invocations use the new install. Pi additionally quarantines loaded native shared objects on Windows before invoking the package manager. AddOne must borrow Pi's process and file isolation principles, but it needs an explicit co-versioned release-cohort coordinator rather than an in-place package update.

## Goals / Non-Goals

**Goals:**

- Establish AddOne as an independent terminal application rather than a Pi extension.
- Make UI-process replacement independent from agent-process lifetime.
- Define a durable logical-agent model and a capability-based driver contract.
- Deliver progress through gated vertical increments, beginning with a user-visible walking skeleton that runs from the `addone` command through the real UI/supervisor/terminal-driver boundaries to a chrome-free fullscreen vanilla Native Pi child PTY whose presentation and interaction match direct execution.
- Complete the broader architectural vertical slice with basic v2-derived tabs/sidebar UX, a structured Managed Pi agent, a generic PTY agent, exact Managed Pi recovery, and hermetic full-system tests.
- Constrain Pi-specific knowledge to the Managed Pi adapter and PTY-specific knowledge to the terminal adapter.
- Make AddOne, Pi, and extension updates side-by-side, certifiable, reversible process replacements that never require the user to find and kill a stale supervisor PID.
- Derive release and contract diagnostics from installed manifests and generated artifacts rather than duplicated presentation constants or a manually incremented global protocol number.
- Make packaged real-Pi usability and old-to-new AddOne update transitions executable release gates rather than user acceptance checks.
- Terminate child terminal protocols at a resident virtual-terminal boundary so Native Pi cannot mutate the physical terminal directly.
- Provide separate Windows and Unix host-input/PTY adapters behind one semantic terminal-session contract and release-gate Pi parity on Windows, Linux, and macOS.
- Define fullscreen Native Pi parity as observable equivalence from the first ready Pi frame through exact parent-terminal restoration, including editor, dialogs, extensions, mouse, paste, focus, resize, repeated Ctrl+C, and visible stability.
- Keep AddOne's production, development, build, test, and optional dependency graph free of packages marked deprecated.
- Preserve v2 behavior by harvesting pure models, render calculations, PTY knowledge, and tests rather than importing its host dependency graph.

**Non-Goals:**

- Full visual or feature parity with v2 in the first change; the narrower first gate requires Native Pi terminal parity rather than v2 shell parity.
- Tabs, sidebar, `+` controls, status chrome, or AddOne shortcuts in the first fullscreen Native Pi iteration; those remain later milestones.
- Migration of the v2 Git app, plans, answer/refinement, advanced paste/chips, modes, outro behavior, launch animations, asset store, or specialized project integrations.
- A universal semantic automation layer for arbitrary PTY programs; terminal protocol parsing remains required, but screen content does not become agent semantics.
- Literal equality between host-input bytes and child-input bytes when the host and child negotiate different keyboard or mouse protocols; semantic event and observable behavior parity is required instead.
- Full Managed-mode support for Pi extensions that require Pi's native TUI.
- Hot-swapping AddOne supervisor code, Pi code, or extensions inside running worker processes.
- Replacing Pi's JSONL session format with an AddOne transcript format.
- Automatically replaying interrupted side-effecting tool operations.

## Decisions

### 1. Use a standalone UI client and persistent supervisor

The initial process topology is:

```text
mutable npm bin → minimal AddOne bootstrap/release coordinator
                         │ selects one retained immutable release cohort
                         ▼
                 release-matched AddOne UI process
                         │ negotiated local additive contract
                         ▼
                   release-matched supervisor process
                         ├── Managed Pi RPC child per managed agent
                         └── PTY child per terminal agent
```

The UI process owns presentation and can be killed, upgraded, or reloaded without stopping agents. The supervisor owns durable state and worker handles. A supervisor restart reconstructs durable control state and recovers runtimes according to driver capability; the initial design does not promise that every non-resumable generic PTY survives supervisor failure.

Alternative considered: keep the shell as a Pi extension. Rejected because it recreates the host-version and reload coupling this change exists to remove.

Alternative considered: put UI and supervisor in one process. Rejected because UI development reloads and rendering crashes would regain authority over agent lifetime.

#### AddOne release-cohort selection and activation

The globally mutable npm package is not a safe execution root for detached supervisors or native PTY dependencies. Repository-local `npm start` launches add a per-invocation development-instance identity beneath the checkout/build identity so simultaneous development terminals use independent supervisors, databases, endpoints, and Native Pi generations; an explicit shared development-instance identity is reserved for intentional reconnection and does not change installed cohort selection. The npm bin therefore remains a minimal bootstrap that loads no supervisor, UI, PTY, or native-addon implementation before selecting a release. On first observation of installed payload, it calculates identity from package metadata plus a content digest, materializes that payload under an AddOne-owned immutable release directory, verifies its manifest, and launches entry points only from that directory. Package version is useful display metadata; the digest is the execution identity, so no separately maintained version constant selects code.

Each supervisor publishes additive endpoint metadata containing its immutable release identity and path, PID, per-boot nonce, start identity, and ownership/activation references. The bootstrap does not treat a connectable endpoint as compatibility proof. When a supervisor is healthy, it validates that metadata and launches the UI entry point from the supervisor's retained release. A newly installed candidate is recorded as pending rather than mixing its UI with the old supervisor.

Background activation discovered during ordinary launch remains preservation-first and may defer behind a live non-resumable PTY. Explicit package update commands are different: invoking either stable `update` or preview `update:next` is consent to stop every verified AddOne-owned session and activate immediately. The npm tag is the only distinction: `latest` for `update`, `next` for `update:next`.

The shared stop-install-activate transaction is:

1. Resolve and record the exact npm `next` target plus prior active and installed identities in a durable transaction journal.
2. Probe endpoint, supervisor process start identity, boot nonce, immutable release identity, and actual boot-scoped generation ownership.
3. If the target is already the exact active release, finish without interruption or installation.
4. Otherwise stop new input, request graceful shutdown of every verified AddOne-owned child and supervisor, apply bounded process-tree cleanup only to ownership-proven processes, and verify endpoint and native-module release.
5. Install the exact npm version only after mutable package files are unlocked.
6. Materialize and verify all runtime and native dependency bytes into the immutable release store, certify the candidate, and reconcile all nonterminal generations owned by prior boots as non-live/interrupted.
7. Atomically commit the active release reference, start its supervisor, verify its endpoint/release identity, and report the old and newly active versions.
8. Retain the prior immutable release and transaction evidence for rollback; clear temporary install/pending references only after verified success.

Generation liveness is boot-scoped rather than inferred from a database lifecycle string. Endpoint ownership includes only generations backed by handles owned by that exact verified supervisor boot. Startup transactionally reclassifies nonterminal rows from any prior boot as interrupted/orphaned before activation decisions. A dead owner therefore cannot resurrect an old cohort or accumulate phantom blockers. An unresponsive owner receives bounded cleanup only when ownership is proven; uncertainty fails safely without deleting user state.

Alternative considered: copy Pi's direct global package overwrite. Rejected because Pi has no detached protocol peer while AddOne does. Alternative considered: negotiate every new UI with every historical supervisor. Rejected because it creates an unbounded compatibility matrix; selecting the supervisor's matching retained UI makes cross-release compatibility unnecessary during normal operation. Alternative considered: expose installed/active/pending phases as separate status, shutdown, or restart commands. Rejected because the user selected one destructive update transaction for both stable and preview channels; internal phases remain solely for crash recovery and rollback.

#### Development-preview publication and update channel

Frequent Windows testing uses a first-class development channel rather than manual version edits, tarball paths, lifecycle bypass flags, or npm dist-tag commands. `npm run publish:next` is the project-owned one-command workflow (`npm publish next` cannot be defined by a package because npm interprets that operand itself). It requires clean `develop`, computes the next unpublished immutable `-dev.N` version from package metadata and registry versions, updates and commits `package.json` plus `package-lock.json`, runs the available preview gate exactly once, packs one exact tarball with package lifecycle scripts disabled, publishes that tarball under `next` with npm authentication inherited interactively, verifies that `next` resolves to the candidate, and deletes the tarball only after success. A failed validation leaves the committed candidate version for diagnosis; a failed publication retains the exact validated tarball for retry.

Installed clients select only the npm channel: `addone update` and `a1 update` resolve stable `latest`; `addone update:next` and `a1 update:next` resolve preview `next`. Both execute the identical immediate stop-install-activate transaction. The colon form mirrors `publish:next` while avoiding an extra argument. Each update command is complete: there is no required `status`, `shutdown`, `--restart`, PID lookup, process-kill command, or state-directory deletion.

`addone version` and `a1 version` are equivalent dependency-light read-only commands. They read `Installed` from the invoked package manifest and query exact npm `latest` and `next` versions concurrently for `Release` and `Next`. They do not materialize a release, start/connect/stop a supervisor, or load UI, PTY, TUI, or native-addon modules. Registry failure retains a successful exit with `Installed` and reports the affected remote field as unavailable plus concise diagnostics, because local version inspection remains useful offline.

Alternative considered: move `latest` for every Windows build. Rejected because it would misrepresent uncertified Linux/macOS builds as stable. Alternative considered: rerun `prepublishOnly` and `prepack` after an already successful release gate. Rejected because duplicated long-running PTY scenarios are both wasteful and vulnerable to unrelated timing variance; publication uploads the exact artifact produced after the single authoritative gate.

#### First implementation increment: Native Pi walking skeleton

The first acceptance gate uses the same process and ownership boundaries as the completed architecture. The `addone` command starts the UI and connects to the supervisor; the UI never spawns or owns Pi directly. The UI immediately requests or attaches to exactly one Native Pi terminal-agent generation created and owned by the supervisor. It publishes no AddOne application frame while readiness is pending and performs one handoff directly from the caller's intact normal screen to the first ready fullscreen terminal frame without rendering an intro, blank alternate-screen prelude, or intermediate shell. The revised protocol subset covers handshake and snapshot, ensure-initial-terminal-agent, semantic host input, correlated virtual terminal snapshots and damage, resize, cursor and effective mode metadata, exit, stop, and resynchronization while retaining request, revision, generation, and additive-evolution rules. Raw PTY bytes remain inside the supervisor terminal adapter.

The first terminal profile intentionally resolves the user's `pi` command from `PATH` because it is the Native Pi compatibility path; the rule forbidding global Pi resolution applies to Managed Pi runtimes. The initial persistence subset may cover only the workspace, selected agent, generation, and resident terminal metadata needed by this slice, but it uses the same control-store boundary and additive migrations as later supervisor work. The child always receives the complete outer terminal columns and rows because the first iteration reserves no AddOne chrome.

The launch path has no AddOne presentation state or timer. The foreground UI acquires input ownership but keeps the caller's normal screen intact while Native Pi starts. The first ready virtual Pi frame atomically selects normal or alternate projection, performs any required screen transition and clear inside that frame, and becomes the first application content AddOne publishes. The initial vanilla profile launches the selected Pi executable in its default interactive mode without forcing `--tui-mode fullscreen`; direct parity runs use that exact executable and argument vector. AddOne's projection may occupy its complete outer viewport, but it does not opt Pi into selection, copy, mouse, scrolling, or Ctrl+C behavior absent from plain `pi`. AddOne reserves no shortcut after handoff, but it continues to decode physical host input and encode each accepted event once for Pi's effective terminal modes. Readiness requires recognizable Pi editor/startup or footer content and rejects an empty or cursor-only state with retained diagnostics. When Pi exits, the UI does not depend on Pi's virtual cleanup to repair the host: it restores the exact captured physical input mode, cursor, wrap, mouse, paste, focus, and keyboard state; default-mode Pi retains its native normal-screen output, scrollback, final cursor position, and child-produced line breaks without a synthetic restoration newline, while an explicitly fullscreen alternate projection reveals the untouched pre-launch normal screen once. The UI then exits with Pi's outcome, and the supervisor remains the process-lifecycle authority.

Alternative considered: retain the prototype tab strip and `+` control while fixing terminal rendering underneath it. Rejected for the first gate because reserved rows, shell input interception, and composite repainting prevent a clean direct-versus-hosted parity baseline. Tabs and shell controls remain part of later stages after the protocol-isolated fullscreen terminal host is proven.

Alternative considered: build a temporary single-process demo that directly spawns `pi` from the UI. Rejected because it would demonstrate the desired pixels while invalidating the central process-lifetime and driver boundaries.

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

### 4. Terminate terminal protocols at a cross-platform virtual-session boundary

The generic terminal adapter owns process spawn, explicit environment and `TERM`, cwd, PTY I/O, resize, a bounded resident virtual terminal, terminal-generated replies, process-tree stop, and exit reporting. It parses escape protocols only to emulate terminal behavior; it never interprets the executable name, argument vector, or visible text to select rendering behavior or infer tools, models, settled state, or successful work. A terminal session can root an exact executable, as in the initial Pi gate, or an interactive shell that later launches successive CLIs in the same PTY. Pi-specific readiness and lifecycle policy remain outside the terminal rendering core.

The supervisor is the authority for child PTYs and virtual terminal state. Every child output byte is consumed by the virtual terminal before publication, but PTY transport chunks are not visual frame boundaries. A generic transaction assembler preserves explicit terminal synchronized-output boundaries and combines adjacent same-I/O-turn output plus trailing cursor/mode epilogues; unsynchronized applications use bounded transport-burst coalescing without a CLI-specific rule or fixed visible timer. The terminal publishes at most one correlated render transaction for one source visual commit. Each transaction carries ordered scroll/erase operations, incremental dirty ranges, cursor and effective-mode state, revision and sequence boundaries, and atomicity metadata. Reconnection still paints a bounded snapshot at sequence N and accepts only later transactions; a gap or generation mismatch triggers resynchronization.

#### Accepted flicker-free transport baseline

The manually confirmed Windows ConPTY baseline treats visible atomicity as more important than latency-only optimization. ConPTY may detach synchronized markers and cursor-hide prefixes from their cells, place several explicit source commits in one PTY read, or release a large repaint's remaining text, status/input rows, and cursor restoration in a later burst. Printable text in the first burst is therefore not sufficient evidence that a synchronized source commit is complete.

The accepted generic policy applies measured transport quiescence after every synchronized commit. On the Windows baseline, the adaptive window is capped at 32 milliseconds and uses 1.75 times the observed inter-burst cadence; 0–3 millisecond fragments within one burst do not reduce that estimate. The physical host writer emits synchronization start, payload, and end as one logical balanced transaction, waits for payload write completion, and emits the end boundary on the following I/O turn. This is transport-derived bounded quiescence rather than a fixed application repaint timer, and it contains no executable, argument, environment, or visible-content branch.

#### Native closure-spacing investigation outcome

Instrumented direct and hosted Native Pi runs at the same 123×29 Windows Terminal dimensions established that Pi itself does not guarantee a blank row before its resume hint. When Pi's final TUI included the transient `Only one model in scope` block, both direct Pi and the AddOne child ended with statistics on row 27, `To resume this session:` on row 28, and a blank row 29. Other direct Pi runs with a shorter final TUI left a blank row before the hint. The direct stdout trace, hosted PTY trace, virtual terminal, and host-write replay therefore showed dynamic Pi-owned layout rather than an AddOne scroll or restoration defect.

The closure contract is state-for-state direct equivalence: AddOne preserves a preceding blank when the identical direct child state produces one and preserves adjacency when direct Pi produces adjacency. AddOne never inserts, removes, or relocates whitespace to force one aesthetic. Initial host-cursor anchoring is not adopted as a remedy for this report because the captured conversation had already scrolled thirteen rows before shutdown, consuming any initial origin offset, while hosted virtual and physical final states matched.

The regression signatures are: a cursor/mode-only host transaction before its cells; synchronized close before restorative cells; one source repaint split into text and footer/input transactions; an intermediate blank or mixed old/new frame; fixed status/input rows moving during a content repaint; or a truncated large repaint followed by delayed remainder cells. The permanent baseline workload submits 50 deterministic questions and emits accepted, thinking, generating, and completed commits. Its hosted verdict requires exactly 201 content-bearing transactions, zero cursor/mode-only transactions, stable status/input coordinates in every committed outer frame, balanced host synchronization, no unrelated clear, and direct-equivalent final state. Any scheduling or latency optimization must pass this gate before replacing the baseline.

The foreground UI is the sole authority for the physical terminal. A `HostTerminalAdapter` captures the pre-launch host state, enters AddOne's presentation surface, decodes physical input into semantic key/paste/focus/mouse events, renders terminal cells and cursor state, and restores the exact host state on every exit path. Child alternate-screen, mouse, keyboard, paste, focus, cursor, synchronized-output, title, clipboard, and Win32 input-mode controls remain virtual or pass through an explicit mediated capability. The child's exit from its alternate screen can therefore never leave AddOne's outer screen or overwrite the parent normal buffer.

Input translation is mode-driven. The resident terminal state tracks application cursor/keypad, bracketed paste, focus reporting, Kitty/modifyOtherKeys state, mouse mode and encoding, alternate screen, and alternate-scroll mode. The router preserves event identity and encodes one child event. Wheel precedence is mouse report, then child-requested alternate scroll, then AddOne virtual scrollback; ordinary Up/Down remain keyboard events. Platform backends must account for effective child state even when a PTY transport consumes or represents a mode internally. Terminal queries and parser-generated responses are ordered back through the PTY.

The cross-platform boundary is shared above platform adapters:

```text
physical terminal
  → Windows console/VTI or Unix raw-input adapter
  → semantic host events
  → focused TerminalSession encoder
  → ConPTY or native PTY
  → child output
  → resident virtual terminal
  → correlated cell/cursor updates
  → AddOne host renderer
```

Windows uses system ConPTY for children and a native host-console adapter that captures `GetConsoleMode`, supports `ReadConsoleInputW` records and Win32 input-mode (`CSI ? 9001`) records where available, and restores the exact original mode. Unix uses native PTYs and framed raw input. Both satisfy the same semantic contract, while low-level I/O actors, process trees, signals, and resize calls remain platform-specific. The release matrix is Windows 11 x64, current Ubuntu LTS x64, and current/previous macOS arm64.

Provider-specific terminal drivers may add documented resume or status capabilities, but those capabilities are additive and separately tested. Native Pi remains the full interactive compatibility path for Pi's editor, commands, shortcuts, mouse interaction, custom TUI extensions, editor replacements, themes, overlays, and dialogs. Observable parity begins at launch, with no AddOne application frame before the first recognizable Pi frame, and ends only after the parent terminal is restored. It compares visible state, input effects, behavior, stability, dimensions, and process outcome; literal host/child byte equality is required only when both sides use the same protocol.

Alternative considered: raw child-output relay plus a shadow emulator. Rejected because ConPTY can consume child mode transitions before the shadow sees them, while relayed controls can still mutate the host; it also makes a child responsible for restoring state it does not own. Alternative considered: direct physical-terminal handoff. Rejected as the primary architecture because AddOne could not render panes, retain sessions, reconnect clients, or multiplex CLIs, though a separately declared compatibility diagnostic may use it. Alternative considered: character-only full repaint. Rejected because it loses terminal fidelity and causes flicker; the renderer uses styled cells, cursor state, damage, and terminal transactions. Herdr validates the ownership pattern, but its AGPL code is not an implementation source.

### 5. Keep one stable negotiated AddOne control envelope between UI and supervisor

The local control envelope uses correlated request IDs, idempotency keys for mutating commands, revisioned full snapshots, ordered incremental events, explicit feature sets, and additive message evolution. Unknown optional fields and event types are ignored safely. The handshake exchanges a stable envelope identity, required and optional feature IDs, release identity, and a contract digest generated from canonical protocol artifacts. Compatibility is determined by whether both peers satisfy the other's required features—not by equality with a manually incremented `PROTOCOL_VERSION` constant. Semantic breaking changes introduce a new required feature or message form rather than reinterpreting an old one.

The generated contract digest and package-derived release identity are diagnostic and certification inputs, not hardcoded compatibility switches. During normal startup the release coordinator launches the UI retained for the active supervisor, making the negotiation a safety check rather than a promise that arbitrary historical releases interoperate. If negotiation fails, neither peer accepts application commands; the coordinator selects a matching release or performs safe cohort activation before presenting a user-facing outcome.

On connection, the supervisor sends a full snapshot at revision N after successful negotiation. The UI applies only events after N in order. A gap causes resynchronization. UI state is derived from the snapshot and events rather than process-global registries.

Large terminal surfaces may use a bounded binary or compressed payload channel, but their metadata remains correlated with the ordered control stream.

Alternative considered: continue using one source-level integer on both sides. Rejected because an npm update can replace only one side of a persistent cohort and converts a recoverable release-selection problem into a malformed-message failure. Alternative considered: accept every envelope and discover incompatibility while commands execute. Rejected because partial mutation is less safe than handshake rejection.

### 6. Separate control-plane authority from conversation authority

SQLite in WAL mode through Node's built-in `node:sqlite` `DatabaseSync` API is the initial control-plane store. The storage port contains all `node:sqlite` usage so domain, protocol, UI, and drivers remain independent of the binding. The supported Node floor guarantees this API is available. The store contains:

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

Alternative considered: use `better-sqlite3`. Rejected because the selected release depends transitively on deprecated `prebuild-install`, violating AddOne's dependency policy and adding an avoidable native packaging dependency.

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

The broader shell has a serializable application state updated by user intents and supervisor events. Rendering is a pure or bounded deterministic projection of that state. Effects such as commands, timers, clipboard operations, and terminal writes are explicit services.

The first fullscreen projection deliberately bypasses all startup and composite shell chrome: it has no tabs, sidebar, focus mode, status line, or render timer. The same projection accepts any full-viewport terminal session; it contains no Pi executable, argument, or content condition. The renderer applies the initial styled virtual snapshot and later correlated render transactions while retaining exclusive outer-terminal ownership. One generic source visual commit produces at most one AddOne-owned physical synchronized-output transaction, so scrolling, generated text, fixed rows, and cursor state are revealed together. The host writer honors stdout backpressure and merges only superseded state while preserving ordered scroll, erase, screen, and cursor operations. No child output bypasses the resident terminal model.

The later shell has two primary content components:

- `ConversationSurface`, driven by normalized messages/tools/queue/recovery state;
- `TerminalSurface`, driven by terminal cells/cursor, terminal modes, and PTY lifecycle.

Later tabs and sidebar select these surfaces without knowing Pi or PTY implementation details. The same protocol-isolated terminal session, mode-aware input encoder, styled snapshot/damage model, and host renderer proven by fullscreen mode remain underneath later chrome.

The outer UI retains an exactly pinned `@earendil-works/pi-tui` as an independent rendering library for later AddOne-owned shell geometry; the immediate Native Pi launch path does not render through it. Its version is owned by AddOne and does not need to match any Managed or Native Pi runtime. Only presentation packages import it; the attached live PTY stream does not pass through Pi TUI components.

Alternative considered: rewrite the complete TUI toolkit before starting. Rejected because it adds risk without validating the agent architecture. A later fork or replacement remains possible behind AddOne UI components.

### 12. Validate v2 behavior through an executable extension profile

Historical v2 screenshots and recovered source fragments are supplemental diagnostics, not the normative migration oracle. After vanilla Native Pi fullscreen parity is released, AddOne will pin an exactly identified Pi runtime and v2 extension profile and exercise that profile in real PTYs. For each later v2-derived feature:

1. Define an implementation-independent interaction scenario with stable checkpoints.
2. Launch the same exact Pi executable and v2 extension profile directly and through AddOne's fullscreen PTY path under identical arguments, environment, terminal type, dimensions, and input timeline.
3. Capture normalized cells, styles, cursor, active screen, terminal modes, input effects, timing, and process outcomes from the executable runs.
4. Convert the observed behavior into AddOne-owned state, interaction, render, and performance requirements, explicitly redesigning behavior that depends on private Pi host APIs.
5. Implement the behavior through AddOne selectors, intents, services, and presentation components rather than embedding the v2 extension dependency graph.
6. Run unit, render, fake-driver, and PTY parity scenarios; retire the extension oracle only in a later change after equivalent AddOne behavior is covered permanently.

Initial executable validation priorities are:

- tabs: layout, overflow, add action, rename, reorder, title/status animation;
- sidebar: snapshot/view/action shape, workspace and agent rows, sorting and rename;
- agent view: transcript scrolling, selection, user/tool presentation, submission feedback;
- shell chrome: status, toast, scrollbar behavior;
- PTY: spawn, resize, emulator, resident frames, crash capture, Windows process behavior.

The current vanilla fullscreen release does not load the v2 profile and is not blocked by unavailable historical captures. The following are explicitly rejected from migration: `core/host/pi`, host profiles, setup gates, shared extension generations, child committed-frame interception, build stamps, child bundles, daemon logic swapping, and Alt+R whole-system reload.

Architecture checks enforce that Pi imports exist only in Pi adapter/profile tooling, PTY dependencies exist only in terminal adapters, domain code imports neither, and durable state does not use `globalThis`.

### 13. Build the test harness with the first shell slice

Testing is not deferred until feature parity. The real CLI runs in an isolated outer PTY with temporary home/config/database/runtime/session/socket/workspace/artifact paths. For the walking-skeleton release gate, the supervisor creates a real child PTY and the harness prepends a deterministic fixture executable named `pi` to `PATH`. The harness runs equivalent direct and AddOne-hosted scripts with the same executable, environment, `TERM`, dimensions, host capabilities, and semantic input timeline, producing a parity comparison without credentials, network access, or model nondeterminism.

The fixture paints indexed and truecolor foreground/background combinations, supported attributes, wide Unicode cells, cursor states, alternate-screen transitions, rapid partial updates, idle periods, a scrollable transcript, and editor-message history. It enables and disables application, keyboard, paste, focus, mouse, alternate-scroll, synchronized-output, cursor, and platform input modes; asks terminal queries; and records child input effects, replies, and resize dimensions. Scenario actions originate normal keys, repeated Ctrl+C, Escape, UTF-8, paste, focus, physical-equivalent mouse buttons/motion/wheel, and resize through the host-input adapter. A wheel test is invalid if it injects a pre-encoded child mouse report. Named checkpoints compare cells, styles, cursor, virtual active screen, effective modes, child effects, and host ownership. Output diagnostics reject raw child-control passthrough, unchanged idle repaint, added whole-screen clears, stale frames, and incomplete synchronized frames.

Direct and AddOne-hosted cases begin over known pre-launch terminal content. After every normal, repeated-Ctrl+C, crash, and client-interruption exit, the harness starts a shell through the same outer terminal and proves typing, left/right motion, Backspace, Delete, command submission, and output. On Windows it also retains original/final console mode and decoded Win32 input evidence. Failures retain semantic host input, encoded child input, child PTY output, host renderer output, virtual frames/modes, process logs, and platform identity.

Deterministic simulations are mandatory before packaged-real-Pi or user validation. The flicker-free 50-question conversation baseline is mandatory whenever transaction assembly, terminal-state publication, host-frame serialization, synchronized-output handling, or terminal projection changes; a latency improvement cannot override any visible-stability failure. Packaged real-Pi gates install the candidate under an isolated prefix and launch an exactly identified Pi runtime directly and through packaged AddOne with identical executable, default-mode offline/approved/non-session arguments, environment, terminal capabilities, dimensions, timeline, and isolated Pi configuration. They require recognizable editor readiness, editor input, physical-wheel transcript scrolling distinct from explicit Up/Down history, native dialogs, paste, resize, repeated-Ctrl+C, normal quit, exact parent restoration, and post-exit shell usability without model access. The matrix runs on Windows 11 x64 with Windows Terminal/system ConPTY, current Ubuntu LTS x64, and current/previous macOS arm64; a required parity failure on any platform blocks release.

A separate N−1 AddOne transition matrix covers preservation-first ordinary launch plus destructive explicit updates on both `latest` and `next`. For each update command, it starts an installed old supervisor with native PTY dependencies loaded and multiple active/stale generation records, runs the product command, and asserts verified owned-process shutdown, unlocked npm replacement, boot-scoped stale-generation reconciliation, exact candidate activation, no old intro or retained old UI, no duplicate owner, and no external PID/state-directory cleanup. Fault injection at every durable transaction phase proves rerun convergence or rollback. Candidate process inventories must prove execution, including native modules, from immutable package content rather than the mutable npm install or development checkout.

Test layers are:

- pure domain state-machine and lease tests;
- UI state/update/render tests;
- driver contract tests using fakes;
- Managed Pi adapter matrix using pinned candidate runtimes and deterministic model fixtures;
- generic and specialized PTY tests;
- full AddOne PTY scenarios;
- independent evaluator-agent scenarios for visual-semantic or usability findings.

Deterministic assertions remain authoritative. The evaluator runs under a separately pinned known-good runtime and produces a structured verdict with frame references. Confirmed regressions become permanent fixtures.

### 14. Reject deprecated AddOne-owned dependencies

The exact lockfile is the dependency source of truth for AddOne itself. Before packaging or publishing, an automated release check inspects every reachable production, development, build, test, and optional package and fails if registry metadata marks any direct or transitive package deprecated. A clean vulnerability audit does not substitute for this check because deprecation and known vulnerability are different signals.

There is no allowlist or warning-only exception. Resolving a violation requires removing, replacing, or upgrading the dependency and regenerating the lockfile. User-installed commands launched by terminal profiles and separately certified Managed Pi runtime/resource profiles are external execution inputs rather than dependencies of the AddOne npm package; their compatibility and trust are reported through their respective profile policies.

Alternative considered: permit deprecated transitive packages when the direct package remains maintained. Rejected because users still install and execute the transitive code and the warning makes the release contract ambiguous.

## Risks / Trade-offs

- **[Risk] Rebuilding a structured conversation UI is substantial work.** → Limit the initial surface to messages, thinking, tools, queues, errors, compaction/retry status, and one editor; keep Native Pi PTY as the escape hatch for advanced interactive features.
- **[Risk] RPC changes can still break an adapter.** → Pin runtimes, isolate Pi parsing in one adapter, run a candidate compatibility matrix, and never promote in place.
- **[Risk] Some Pi extensions will not work in Managed mode.** → Publish explicit compatibility classes and provide Native Pi mode instead of emulating arbitrary TUI components.
- **[Risk] A persistent supervisor introduces protocol and storage complexity.** → Keep its control envelope additive and feature-negotiated, state transactional, UI rendering absent, normal peers release-matched, and begin with a narrow vertical slice.
- **[Risk] Immutable AddOne releases consume disk and retain vulnerable old code.** → Retain every release referenced by a live process, rollback record, or durable agent; garbage-collect only unreferenced cohorts under an explicit retention policy and report blocked cleanup.
- **[Risk] A minimal bootstrap becomes a long-lived compatibility boundary.** → Keep it free of native/runtime dependencies, make its metadata parser additive, validate all selected paths and digests beneath the release store, and exercise N−1 transition fixtures before publishing.
- **[Risk] A candidate discovered during ordinary launch can remain pending indefinitely behind a non-resumable PTY.** → Keep implicit launch-time activation preservation-first, while both explicit update commands stop verified blockers and activate immediately.
- **[Risk] Supervisor failure may terminate or detach PTYs.** → Guarantee UI-process independence first; use driver-specific recovery and consider reconnectable per-agent hosts only if measured supervisor-upgrade requirements justify the added process layer.
- **[Risk] The built-in `node:sqlite` API follows the supported Node lifecycle and may evolve.** → Keep it behind the storage port, pin the supported Node matrix, run migration/repository tests on every supported Node line, and raise the Node floor deliberately when necessary.
- **[Risk] Executable v2 behavior can depend on hidden private Pi assumptions.** → Capture behavior through the pinned extension-enabled PTY oracle, classify private-host-dependent behavior for redesign, and admit only AddOne-owned code that passes dependency checks and fake-state/render tests.
- **[Risk] Visual parity can consume the project.** → Use behavior-oriented UX scenarios and prioritize reachability, focus, continuity, status clarity, and performance over exact cell equality.
- **[Risk] Mouse and launch-handoff assertions can become timing- or coordinate-fragile.** → Compare direct and hosted runs under identical dimensions and capabilities, originate mouse actions through the host adapter, record both semantic and encoded events, and retain named checkpoints only for stable compositions.
- **[Risk] Snapshot-to-damage handoff can duplicate or lose terminal changes at the boundary.** → Correlate snapshots and virtual-terminal updates with a monotonic sequence, accept only updates after the snapshot boundary, and resynchronize on every gap or generation mismatch.
- **[Risk] A child PTY or platform transport can hide, synthesize, or consume terminal mode changes.** → Keep host ownership independent, model effective child state in the platform terminal backend, validate with real Pi on every supported platform, and fail certification rather than reverting to raw passthrough.
- **[Risk] Semantic host-input translation can change edge-case keyboard or IME behavior.** → Preserve event kind, modifiers, shifted codepoints, repeat/release, UTF-8 and paste boundaries; maintain platform corpora and compare child-observable behavior with direct runs.
- **[Risk] Rendering virtual cells can differ from direct terminal rendering.** → Preserve graphemes, widths, styles, cursor and synchronized transactions; use damage rendering rather than full repaint and release-gate stable direct-versus-hosted checkpoints.
- **[Risk] Native console handling increases platform-specific code.** → Isolate Windows and Unix adapters behind one contract, keep native APIs out of domain/UI/supervisor code, and test exact acquisition/restoration independently.
- **[Risk] UI-supervisor transport can add latency or unbounded buffering to rapid PTY output.** → Preserve byte order, honor output backpressure, bound queues, batch adjacent chunks without semantic rewriting, and test sustained and burst output against the direct baseline.
- **[Risk] Generic PTY agents offer weak recovery and status.** → Advertise capability honestly, add specialized drivers incrementally, and never convert screen text into semantic guarantees.
- **[Risk] Multiple agents can modify the same repository concurrently.** → Keep cwd/worktree as an explicit agent property and introduce per-agent worktree policy in a follow-up capability before autonomous parallel editing is enabled by default.

## Migration Plan

### Stage 0: Catalogue scenarios and defer the executable v2 oracle

- Keep the stable scenario-ID inventory as planning input; recovered screenshots remain non-normative diagnostics.
- Do not block the vanilla fullscreen release on unavailable v2 source, captures, or extension behavior.
- In a later milestone, pin the exact Pi runtime and v2 extension profile, execute each catalogued flow directly and through AddOne's PTY simulation, and then classify observed behavior as reproduce, redesign, defer, or retire.

Rollback: none required; this stage changes no runtime behavior. The extension-enabled catalogue is explicitly deferred and does not block vanilla Native Pi fullscreen parity.

### Stage 1: Native Pi fullscreen parity walking skeleton

- Establish the package command, dependency boundaries, zero-deprecated-dependency release policy, minimal domain/driver/protocol contracts, separate UI and supervisor processes, and isolated `node:sqlite` control-store path.
- Immediately request or attach to one Native Pi generation and publish no AddOne startup frame or shell chrome before its first ready frame.
- Give the child the complete outer dimensions and establish terminal emulation, input, resize, exit propagation, and reconnect without a direct UI-owned spawn path.
- Remove the prototype tab strip, `+` control, status rows, focus switching, hard-coded mouse modes, Ctrl+C interception, and periodic composite repaint from this first projection.

This stage's raw child-output handoff was implemented but is not an accepted parity baseline; Stage 1B supersedes its terminal transport and reopens the affected completion claims.

Rollback: retain the prior prototype only as test history rather than a user-facing fallback; do not publish the standalone fullscreen path until Stage 1B passes.

### Stage 1B: Cross-platform terminal host and Native Pi parity baseline

- Replace physical-terminal raw child replay with supervisor-resident virtual terminal snapshots and correlated damage updates.
- Add one host-terminal ownership boundary with Unix raw-input and Windows native console/VTI adapters, exact acquisition/restoration, and semantic input events.
- Add mode-aware key, paste, focus, mouse, alternate-scroll, and terminal-response encoding from effective child state.
- Keep the outer alternate screen exclusively AddOne-owned and render child primary/alternate screens virtually with styled damage and synchronized-output transactions.
- Add direct-executable Pi sessions now and shell-backed sessions for later arbitrary CLI panes through the same terminal-session contract.
- Gate deterministic and packaged real-Pi parity, physical-wheel/history separation, native dialogs/extensions, resize, normal and repeated-Ctrl+C exits, and functional post-exit parent-shell editing on Windows, Linux, and macOS.

Rollback: retain immutable prior AddOne cohorts for diagnostics, but do not reactivate the raw relay as a supported compatibility path; direct Pi remains the user fallback until the terminal-host gate passes.

### Stage 1A: AddOne release-cohort and real-Pi release correction

- Replace the globally mutable runtime root with a minimal bootstrap and verified immutable AddOne release store.
- Derive release identity from package metadata and content digest, add active/pending cohort records, and launch the UI matching every live supervisor.
- Replace the global protocol integer with required-feature negotiation and generated contract diagnostics.
- Implement safe idle activation and busy non-resumable deferral for ordinary launch, plus identical immediate ownership-verified stop-install-activate behavior for stable `update` and preview `update:next`, boot-scoped generation reconciliation, transaction recovery, and bounded stale-owner cleanup without shell-specific kill instructions.
- Launch the initial Native Pi profile in Pi's vanilla default interaction mode and require recognizable readiness rather than cursor activity.
- Gate the packaged candidate with direct-versus-hosted real Pi editor/dialog/input/quit parity and N−1 live-supervisor update-transition scenarios.

Rollback: atomically select the retained prior release cohort after proving the candidate owns no live generation; never overwrite or delete the prior cohort during failed activation.

### Stage 2: Shell and fake-driver expansion

- Establish dependency boundaries and architecture checks.
- Build the AddOne state/update/view shell with basic tabs, sidebar, status, notifications, conversation surface, and terminal surface.
- Drive it entirely from fake supervisor snapshots/events and verify scenarios derived from the later pinned v2 extension-enabled PTY runs.

Rollback: remove the standalone experimental entry point; the pinned v2 oracle profile remains unchanged.

### Stage 3: Persistent supervisor

- Add the local protocol, SQLite control store, logical-agent model, generations, leases, snapshots, event revisions, and UI reconnection.
- Continue using fake workers until UI restart and command idempotency scenarios pass.

Rollback: use an isolated development database and retain v2 as the production path.

### Stage 4: Generic PTY expansion

- Harvest bounded PTY spawn, terminal emulation, resize, input, resident surface, exit, and crash-artifact behavior.
- Add generic command, Native Pi, Claude Code, and Codex profiles without semantic screen parsing.

Rollback: disable PTY profile creation; no Managed Pi sessions are affected.

### Stage 5: Managed Pi slice

- Install one exact Pi runtime under AddOne control.
- Implement strict RPC framing, normalization, conversation rendering, command correlation, and session-reference persistence.
- Prove prompt/tool display, UI restart, worker crash, exact-session recovery, and continuation.

Rollback: retain the runtime and session artifacts, disable Managed profile creation, and continue using Native Pi PTY or v2.

### Stage 6: Extension profiles and portable UI

- Add profile revisions, package/resource discovery, diagnostics, safe mode, portable extension UI mapping, and compatibility labels.
- Test representative tool, permission, provider, command, and dialog extensions.

Rollback: pin agents to the last approved profile revision.

### Stage 7: Candidate updates and evaluator tests

- Add side-by-side runtime installation, certification, explicit migration, rollback, full PTY artifact bundles, and independent evaluator execution.
- Do not automatically migrate existing agents when a candidate is approved.

Rollback: select the prior approved runtime/profile and recover the same verified sessions under one-writer leases.

### Stage 8: Follow-up UX harvesting

- Propose separate changes for paste/history/editor polish, models/settings, Git, modes/plans/answer, advanced intro/outro behavior, and eventual v2 retirement.
- Each follow-up uses the same behavior-test and dependency-boundary migration method.

## Open Questions

- Which package scopes and config/runtime directory names should accompany the now-selected `addone` product command.
- Whether reconnectable per-agent host processes are justified after measuring supervisor-upgrade frequency and PTY recovery limitations; this does not change the initial UI/supervisor/driver boundary.

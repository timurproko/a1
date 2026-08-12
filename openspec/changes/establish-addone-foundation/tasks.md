## 1. Milestone 1 — Native Pi Walking Skeleton and Fullscreen Parity Correction

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
- [x] 1.11 Historical: implement deterministic AddOne startup intro state. This behavior and its runtime artifacts are removed by task 1.93.
- [x] 1.12 Implement the prototype AddOne tab strip with an always-reachable `+` control, selected Native Pi tab, keyboard activation, supported mouse activation, and AddOne-first input consumption. This prototype baseline is superseded for the first release by tasks 1.22–1.36.
- [x] 1.13 Implement the prototype character-surface renderer and route unclaimed keyboard, paste, and supported mouse input to the selected Native Pi PTY while preserving AddOne global controls. This composite input/render path is superseded for the first release by tasks 1.22–1.36.
- [x] 1.14 Implement a deterministic fixture executable named `pi` that paints known terminal states, reports received input and dimensions, and exits with scenario-controlled outcomes without model or network access.
- [x] 1.15 Implement the isolated outer AddOne PTY runner with deterministic clocks, temporary home/config/database/socket/workspace/artifact paths, fixture-first `PATH`, keyboard and mouse injection, resize, normalized cells, cursor capture, deadlines, and process-tree cleanup.
- [x] 1.16 Add the prototype walking-skeleton scenario covering `addone` launch, completed intro, visible `+`, keyboard and mouse tab creation, nested fixture surface, input, resize, child exit, retained final surface, and continued shell operation. Retain it as historical coverage while replacing its release-gate role in tasks 1.32–1.35.
- [x] 1.17 Restart only the UI during the walking-skeleton scenario and verify the supervisor retains the Native Pi child and supplies its resident terminal surface before newer updates.
- [x] 1.18 Add a separate non-gating smoke scenario for an actually installed Native Pi using isolated offline configuration and no model request.
- [x] 1.19 Preserve named normalized frames, input timeline, supervisor events, outer and child logs, environment metadata, final surfaces, assertions, and a concise failure summary for every walking-skeleton failure.
- [x] 1.20 Document the prototype workflow for installing or linking AddOne, activating `+`, switching focus, running the deterministic scenario, and inspecting artifacts. Replace the user-facing prototype instructions in task 1.36.
- [x] 1.21 Replace `better-sqlite3` with the built-in `node:sqlite` storage adapter, remove `better-sqlite3` and deprecated `prebuild-install` from the exact dependency graph, add a package/publish gate that reports and rejects every deprecated direct or transitive production, development, build, test, or optional dependency, update the recorded toolchain, and rerun storage, packaging, audit, architecture, and walking-skeleton validation.
- [x] 1.22 Historical: derive the versioned intro from package metadata. The presentation and tests are removed by task 1.93; package-derived release identity remains.
- [x] 1.23 Add an idempotent initial-session command/state transition that automatically creates or attaches to exactly one supervisor-owned Native Pi generation immediately without requiring a tab or `+` activation.
- [x] 1.24 Replace the first-iteration shell projection with a single fullscreen Native Pi projection and remove the prototype tab strip, `+` control, status/separator rows, focus switching, empty-shell frame, and intermediate shell render from startup.
- [x] 1.25 Expand terminal state contracts to preserve indexed, truecolor, and default foreground/background colors, complete supported text attributes, Unicode cell widths, cursor state, active screen, child-requested input modes, and monotonic terminal-output sequence boundaries.
- [x] 1.26 Expand the UI-supervisor protocol with byte-preserving input payloads, ordered raw terminal-output chunks, styled snapshot sequence boundaries, bounded queues, backpressure behavior, generation correlation, and resynchronization on output gaps.
- [x] 1.27 Update the Native Pi terminal driver to publish raw output in order while feeding a shadow emulator that captures styled reconnect snapshots, terminal modes, alternate-screen state, cursor state, resize state, and final evidence without parsing semantic screen content.
- [x] 1.28 Implement the fullscreen terminal sink that paints one styled snapshot at a correlated sequence boundary, applies child terminal modes, streams only later raw chunks, batches without reordering, honors output backpressure, and performs no idle timer repaint or unrelated whole-screen clear.
- [x] 1.29 Route stdin as opaque bytes after handoff and remove AddOne handling of Ctrl+C, Tab, add-agent keys, hard-coded mouse modes, and all other application shortcuts so keyboard, UTF-8, escape, focus, bracketed-paste, mouse button/motion, and wheel sequences reach Pi exactly once.
- [x] 1.30 Resize the Native Pi PTY and shadow emulator to the complete outer terminal columns and rows, eliminate all chrome row subtraction and coordinate offsets, and correlate resize with generation and output sequencing.
- [x] 1.31 On initial Native Pi exit, stop accepting input, flush ordered output, restore every outer terminal mode changed by the intro or child, close the foreground UI with the child's exit outcome, and keep supervisor lifecycle state internally consistent.
- [x] 1.32 Expand the deterministic `pi` fixture to paint color/background/attribute and wide-cell matrices, cursor states, alternate-screen transitions, rapid partial updates, and idle periods; negotiate paste, focus, and mouse modes; and record exact input bytes and resize dimensions.
- [x] 1.33 Add a direct Native Pi fixture runner and a parity comparator that executes identical direct and AddOne-hosted cases with the same executable, environment, `TERM`, dimensions, and input timeline and compares cells, styles, cursor, active screen, modes, child bytes, and resize observations.
- [x] 1.34 Replace the walking-skeleton release gate with automatic fullscreen launch scenarios covering direct first-ready-frame handoff, no startup application frame or chrome, shortcuts including Ctrl+C, UTF-8, bracketed paste, focus, mouse buttons/motion/wheel, full-viewport resize, alternate screen, and child-exit propagation.
- [x] 1.35 Add frame and raw-output stability assertions for rapid updates and idle periods that reject added whole-screen clears, stale snapshot overwrites, duplicate chunks, sequence gaps, and unchanged periodic repaints, while preserving diagnostics for every failure.
- [x] 1.36 Verify reconnect snapshot-to-stream continuity and update the installed-Native-Pi smoke test and user documentation for automatic fullscreen launch, native shortcuts, mouse-wheel scrolling, theme/color parity, resize, exit behavior, and retained failure artifacts. The original smoke assertion is superseded by the release-blocking correction below because output length did not prove real Pi readiness.

Tasks 1.26–1.31 record the completed raw-relay implementation for historical traceability. Milestone 1B supersedes that transport; those tasks are not evidence that the revised terminal-host baseline is complete.

## 1A. Release-Cohort, Protocol, and Real-Pi Validation Correction

- [x] 1.37 Add permanent failing regressions for a newly installed UI encountering an N−1 live supervisor and for a live Native Pi process producing only an empty/cursor-only AddOne surface; preserve the observed protocol error, process metadata, and terminal evidence.
- [x] 1.38 Implement package-derived AddOne release metadata and content-digest identity with no duplicated release or presentation version constant.
- [x] 1.39 Implement verified immutable AddOne release materialization beneath the AddOne-owned data directory and reject traversal, digest mismatch, incomplete candidates, or execution outside the selected release root.
- [x] 1.40 Reduce the globally mutable npm entry point to a bootstrap that loads no UI, supervisor, PTY, or native-addon implementation before selecting and spawning an immutable release entry point.
- [x] 1.41 Persist atomic active, pending, approved, rollback, and retention references and expand endpoint metadata with immutable release identity/path, per-boot nonce, PID start identity, and ownership state.
- [x] 1.42 Make the bootstrap validate live supervisor identity and always launch that supervisor's retained release-matched UI unless a safe cohort replacement completes first.
- [x] 1.43 Replace the global protocol integer gate with stable-envelope handshake negotiation of required/optional feature IDs and generated contract diagnostics; reject incompatible peers before commands and safely ignore unknown additive fields/events.
- [x] 1.44 Implement automatic dead-owner cleanup and bounded graceful/platform-native process-tree cleanup for proven idle stale owners on Windows and Unix, while preserving uncertain live ownership in a diagnosable blocked state without shell-specific kill instructions.
- [x] 1.45 Implement candidate cohort activation with certification, durable pending state, idle drain, recoverable-worker migration, ownership release verification, atomic active-pointer commit, and automatic deferral/completion around live non-resumable PTYs.
- [x] 1.46 Implement rollback and release garbage collection that cannot select an unverified candidate, create duplicate ownership, or remove a release referenced by a process, agent, migration, or rollback record.
- [x] 1.47 Launch the initial Native Pi profile with the exact selected executable and Pi fullscreen TUI argument, use current isolated Pi configuration controls, and fail readiness with diagnostics when only an empty surface or cursor activity appears.
- [x] 1.48 Build a packaged-candidate harness that installs the AddOne tarball into a temporary prefix, injects an exactly identified Pi runtime, launches only immutable packaged content, and records process/release identity for every role.
- [x] 1.49 Add release-gating direct-versus-AddOne real Pi scenarios using identical fullscreen/offline/approved/non-session arguments and environment; assert recognizable editor readiness, typed editor content, native settings-dialog interaction, normalized cells/styles/cursor/active-screen/modes, and normal quit without model access.
- [x] 1.50 Add N−1 update-transition scenarios for a live idle worker, busy non-resumable PTY, dead metadata owner, unresponsive idle owner, failed candidate, rollback, automatic activation after blocker exit, no duplicate supervisor, and no malformed-message or manual-PID-kill outcome.
- [x] 1.51 Make packaged real-Pi and update-transition scenarios mandatory in the validation/publish workflow, emit a machine-readable verdict and retained failure bundle, and document the one-command agent validation procedure.
- [x] 1.52 Add mandatory deterministic direct-versus-AddOne simulation regressions that distinguish Pi-owned wheel-report transcript scrolling from explicit Up/Down editor-history navigation and that exercise repeated Ctrl+C exit over known pre-launch terminal content while rejecting visible control-sequence leakage.
- [x] 1.53 Reopened: replace launch-to-child and child-to-terminal mode propagation with exclusive AddOne host ownership so the outer normal screen and scrollback remain untouched, physical wheel never falls through as ordinary history arrows, and Pi cleanup remains virtual.
- [x] 1.54 Reopened: make the packaged direct-versus-AddOne real-Pi gate pass physical-wheel transcript scrolling, explicit arrow history, repeated-Ctrl+C, prior-content restoration, and a functional post-exit parent-shell probe before packaged or manual validation.

## 1B. Cross-Platform Terminal Host and Native Pi Parity Baseline

- [x] 1.55 Preserve permanent failing evidence for the current Windows real-Pi physical-wheel and post-exit input regressions, including Pi's pre-ConPTY terminal writes, ConPTY output, virtual modes, host console mode, semantic host input, encoded child input, and parent-shell behavior.
- [x] 1.56 Introduce platform-independent terminal-session, host-terminal, semantic input-event, effective child-mode, terminal-response, snapshot, damage, and lifecycle contracts; remove raw child terminal output from the UI-facing contract and architecture checks.
- [x] 1.57 Refactor the supervisor terminal driver so every PTY output byte is consumed by one resident virtual terminal, parser-generated responses are ordered back to the child, and only correlated snapshots/damage/cursor/effective-mode updates leave the terminal boundary.
- [x] 1.58 Replace snapshot-to-raw-stream handoff with snapshot-to-damage sequencing, bounded backpressure and batching, synchronized-output transaction handling, reconnect resynchronization, resize ordering, and idle repaint suppression.
- [x] 1.59 Implement the fullscreen host renderer so AddOne exclusively owns the outer presentation surface, renders styled virtual cells and cursor damage without full-screen flicker, and never applies a child's alternate-screen, mouse, keyboard, paste, focus, cursor, synchronized-output, title, clipboard, or Win32 input-mode controls directly to the host.
- [x] 1.60 Implement the shared host-input router that consumes semantic key, paste, focus, mouse, and resize events exactly once, reserves no AddOne shortcut after fullscreen handoff, and encodes accepted events from the focused terminal session's effective state.
- [x] 1.61 Implement and test the Unix host-terminal adapter for raw-mode acquisition/restoration, framed UTF-8 and escape input, keyboard enhancements, bracketed paste, focus, SGR mouse, resize, outer-screen lifecycle, and normal/error/panic cleanup on Linux and macOS.
- [x] 1.62 Implement and test the Windows host-terminal adapter using native console APIs for exact `GetConsoleMode`/`SetConsoleMode` restoration, `ReadConsoleInputW` key/mouse/focus records, VTI and Win32 input-mode record decoding, resize, outer-screen lifecycle, and normal/error/panic cleanup with a documented fallback.
- [x] 1.63 Implement and test mode-aware key, application-cursor, Kitty/modifyOtherKeys, UTF-8, bracketed-paste, focus, mouse button/motion/wheel, alternate-scroll, and host-scrollback routing; account for effective modes represented or consumed by each platform PTY and keep physical wheel distinct from ordinary Up/Down.
- [x] 1.64 Generalize the terminal process backend across system ConPTY and Unix PTYs, standardize the advertised terminal capabilities, preserve platform-specific process-tree/resize/exit behavior, and support both exact direct commands and interactive shell-backed sessions without nesting an AddOne PTY per shell command.
- [x] 1.65 Add terminal-response coverage for device attributes, cursor position, dimensions, default/palette colors, capability queries, keyboard state, and other supported child-local queries, proving responses return through the PTY in order and do not expose unrelated host state.
- [x] 1.66 Implement terminal exit as an ownership transaction that stops input, commits final virtual state, discards stale child modes, restores the exact captured host screen/input/cursor/wrap/mouse/paste/focus/keyboard state once, and distinguishes initial direct-Pi exit from later shell-backed foreground-command exit.
- [x] 1.67 Expand deterministic fixtures and harnesses to originate physical-equivalent host events rather than pre-encoded child packets; cover all wheel-routing states, explicit arrows, keyboard protocol changes, paste, focus, terminal queries, child mode leaks, rapid/synchronized output, reconnect, resize, crash, repeated Ctrl+C, and post-exit shell typing/editing/execution.
- [x] 1.68 Add packaged direct-versus-AddOne real-Pi gates for recognizable readiness, editor input, physical wheel versus arrow history, paste, focus, resize, built-in dialogs, normal and repeated-Ctrl+C exit, prior-content restoration, and post-exit shell usability on Windows 11 x64, current Ubuntu LTS x64, and current/previous macOS arm64.
- [x] 1.69 Add a hermetic representative Native Pi extension profile using public interactive TUI capabilities and prove its custom component, editor/input, theme, overlay/dialog, mouse, and shutdown behavior matches the same profile launched directly without importing a private Pi host bridge.
- [x] 1.70 Make Milestone 1B deterministic, packaged Pi, representative extension, and supported-platform verdicts mandatory in `test:release`, packaging, and publishing; update toolchain/architecture/user documentation and record Herdr as AGPL architectural prior art with no copied implementation.
- [x] 1.71 Reopen the Windows vanilla-Pi baseline with permanent direct-versus-AddOne evidence for selection painting, absence of a false `Copied!` augmentation, Ctrl+C over selected input, rapid typing latency, one-notch wheel distance, and the parent cursor shape after exit.
- [x] 1.72 Stop forcing Pi's alternate fullscreen interaction mode and make the default Native Pi profile preserve vanilla host selection: selection SHALL use native terminal painting, SHALL NOT trigger an AddOne or Pi selection-copy flash, and Ctrl+C while selected SHALL dismiss the selection without clearing Pi's editor text.
- [x] 1.73 Remove fixed visible input latency from the host renderer and preserve direct-equivalent rapid typing while retaining synchronized-output atomicity and bounded batching.
- [x] 1.74 Match vanilla wheel distance at three rows per notch and restore the parent terminal's default cursor shape as well as its visibility and console mode on every exit path.
- [x] 1.75 Extend deterministic and packaged real-Pi release gates for the reopened selection, no-copy-augmentation, selection-aware Ctrl+C, typing latency, wheel-distance, and exit-cursor regressions before requesting another manual validation.
- [x] 1.76 Preserve permanent direct-versus-AddOne evidence for selection anchoring during generated output, native terminal scrollbar/scrollback availability, and visible repaint flicker when vanilla Pi appends content.
- [x] 1.77 Project default-mode vanilla Pi through an AddOne-owned normal-screen host surface so terminal scrollback and selection remain native, while retaining isolated alternate-screen projection for children that explicitly request fullscreen mouse interaction.
- [x] 1.78 Carry virtual-terminal scroll operations through correlated damage, apply them to resident snapshots, and render physical scrolling before only the newly exposed/changed rows so selected content moves with output and unchanged rows do not flicker.
- [x] 1.79 Extend deterministic and packaged real-Pi gates for normal-screen scrollbar/scrollback, selection anchoring across appended content, and scroll-operation repaint stability before requesting another manual validation.
## 1C. Generic Terminal Native-Parity Release Blocker

No Milestone 2 or later product work SHALL proceed until tasks 1.80–1.92 pass without a CLI-specific production rendering branch.

- [x] 1.80 Reopen visible stability with permanent direct-versus-hosted evidence that records source writes, synchronized commits, cursor epilogues, PTY read bursts, virtual-terminal transactions, supervisor events, host writes, and committed outer frames; prove the current pipeline can turn one source render into multiple delayed host frames.
- [x] 1.81 Remove terminal-core inspection of Native Pi arguments, Pi-named environment variables, executable identity, and visible content; replace `NativePiTerminalDriver` rendering responsibilities with an application-agnostic PTY terminal driver and explicit generic projection/session policy.
- [x] 1.82 Define correlated `TerminalRenderTransaction` contracts for source sequence ranges, atomic boundaries, scroll/erase operations, incremental dirty ranges, cursor, modes, and final state; retain bounded snapshots only for initial handoff, reconnect, resize resynchronization, and exit.
- [x] 1.83 Implement a generic PTY-output transaction assembler that honors DEC synchronized-output boundaries, combines adjacent same-I/O-turn writes and trailing cursor/mode epilogues, applies measured quiescence after every synchronized commit (accepted Windows baseline: 32 ms cap and 1.75× inter-burst cadence, excluding 0–3 ms same-burst fragments), and applies a bounded application-independent fallback for unsynchronized output without a fixed application repaint timer.
- [x] 1.84 Publish at most one terminal render transaction for one source visual commit, suppress unchanged and marker/cursor/mode-only prefixes awaiting restorative cells, preserve ordering across terminal responses and resize, and resynchronize rather than exposing a partial, truncated, or mixed old/new transaction.
- [x] 1.85 Replace per-output full viewport/scrollback capture with incremental dirty-row, dirty-range, cursor, mode, scroll, and bounded scrollback-ring maintenance so sustained output does not block the supervisor event loop or amplify allocations with scrollback depth.
- [x] 1.86 Implement a backpressure-aware host frame writer that emits one balanced AddOne-owned synchronized transaction per render transaction, awaits host drain, bounds queued state, merges only superseded cell/cursor state, and never drops or reorders scroll, erase, screen, or lifecycle operations.
- [x] 1.87 Implement one generic full-viewport native projection for every terminal session and retain a generic clipped/composited damage fallback for future panes and overlays; projection selection SHALL depend only on geometry, host/session policy, and parsed terminal state.
- [x] 1.88 Extend architecture checks to reject CLI-specific rendering/input-mode fallbacks and executable, argument, environment-name, or visible-content inspection inside terminal emulation, damage, projection, frame scheduling, and host rendering modules.
- [x] 1.89 Build an application-agnostic terminal workload corpus covering synchronized and unsynchronized multi-write frames, shell scrolling, generated text, progress/status/footer rows, cursor epilogues, Unicode/styles, alternate screen, resize, sustained output, and backpressure, with identical direct and AddOne-hosted byte/timing timelines.
- [x] 1.90 Compare direct and hosted committed-frame timelines, cells, styles, cursor, modes, scrollback, input-to-frame latency, frame jitter, host-frame count per source commit, output amplification, idle stability, and final restoration; include the confirmed 50-question baseline requiring exactly 201 content-bearing transactions, zero cursor/mode-only transactions, and fixed status/input coordinates; fail on every intermediate blank, shifted, stale, duplicate, mixed, truncated, or partial frame.
- [ ] 1.91 Run packaged real CLI workloads, including but not limited to Native Pi, through the same generic pipeline on Windows 11 x64, Ubuntu LTS x64, and current/previous macOS arm64 without renderer exceptions or workload-specific acceptance thresholds.
- [ ] 1.92 Make the generic deterministic corpus, confirmed 50-question flicker-free baseline, packaged multi-CLI parity, architecture prohibition, and supported-platform machine-readable verdicts mandatory in `test:release`, packaging, and publishing before requesting another manual validation or beginning later features.
- [x] 1.93 Remove the AddOne launch intro, intro timer/configuration, startup alternate-screen frame, logo/version presentation, and intro tests; request Native Pi immediately and make its first ready frame the first published application content without weakening readiness or host ownership.
- [x] 1.94 Preserve Native Pi's final normal-screen cursor and child-produced line breaks exactly and remove AddOne's synthetic restoration newline. Close the spacing investigation after instrumented identical-dimension Windows Terminal runs proved vanilla Pi itself produces both a roomy layout with a preceding blank and a full-frame layout with statistics immediately before `To resume this session:`; require state-for-state direct equivalence for both and no AddOne whitespace adjustment.
- [x] 1.95 Give every default repository-local `npm start` invocation a unique development-instance identity, supervisor endpoint, database, runtime state, and Native Pi generation while preserving an explicit shared-instance selector for intentional reconnection.
- [x] 1.96 Restore mouse modes consumed by Windows ConPTY through an explicit generic terminal-profile fallback limited to alternate-screen sessions, preserve normal-screen host selection by default, and pass the packaged representative-extension mouse parity gate.
- [x] 1.97 Reconcile the packaged real-Pi median input-latency gate with the accepted atomic pipeline budget—32 ms adaptive quiescence, one public xterm parse turn, and ordered process/host serialization—while retaining a 100 ms absolute ceiling and the unchanged zero-flicker baseline.
- [x] 1.98 Pass the complete Windows x64 development-preview gate for the exact `0.1.5-dev.0` candidate, including unit, architecture, dependency, walking-skeleton, 50-question flicker, packaged real-Pi, extension, multi-CLI, and update-transition verdicts, while retaining Linux/macOS stable certification under task 1.91.
- [x] 1.99 Publish the immutable Windows-tested `0.1.5-dev.0` package under npm tag `next`, verify that `next` resolves to the candidate, retain `latest` at stable `0.1.4`, and document explicit preview-channel installation.
- [x] 1.100 Historical preview-channel implementation: add explicit stable/preview self-update channel parsing so `addone update next` and `a1 update next` resolve npm `next`, install its exact newer version, and preserve no-argument `latest` behavior with unit, CLI-isolation, and documentation coverage. Tasks 1.103–1.109 supersede the preview syntax and install-only lifecycle with `update:next` immediate activation.
- [x] 1.101 Add one `npm run publish:next` workflow that requires clean `develop`, selects and commits the next unpublished `-dev.N` version, validates once, packs and publishes one exact lifecycle-disabled tarball under `next`, verifies the tag, retains failed artifacts for immediate retry, and has deterministic workflow tests.
- [x] 1.102 Tolerate npm registry propagation after a successful preview upload with bounded version/tag verification retries, repair `next` only after the immutable version appears, and make a rerun recognize, verify, and clean an already completed publication.
- [x] 1.103 Preserve deterministic failing regressions for the observed Windows preview update failures: mutable-install `conpty.node` locking npm replacement, dead-supervisor nonterminal rows accumulating as live blockers, old-cohort restart after forced owner death, and an installed no-intro candidate remaining pending until manual PID/state-directory cleanup.
- [ ] 1.104 Version process-generation ownership by supervisor boot identity, reconcile every prior-boot nonterminal generation transactionally as interrupted/orphaned before endpoint publication, and derive endpoint liveness only from actual current-boot driver handles so persisted rows cannot resurrect old ownership.
- [ ] 1.105 Implement stable `addone update`/`a1 update` and preview `addone update:next`/`a1 update:next` as one shared durable idempotent stop-install-activate transaction, differing only by npm tag (`latest` or `next`), that treats invocation as consent to stop all verified AddOne-owned sessions, performs bounded graceful/forced owned-process shutdown, verifies native-module/package unlock, installs the exact target, materializes/certifies/activates it, verifies the new endpoint, and retains rollback evidence without requiring separate status, shutdown, restart flags, PID commands, or data deletion.
- [ ] 1.106 Ensure every persistent AddOne process and native module executes only from its verified immutable release root before npm replacement, including migration detection and actionable automatic handling for legacy mutable-install supervisors.
- [ ] 1.107 Add transaction-journal recovery and rollback for interruption after shutdown intent, ownership release, npm installation, materialization, certification, active-reference commit, and new-supervisor startup, proving every rerun converges to exactly one verified active or rollback cohort without mixed ownership.
- [ ] 1.108 Extend packaged Windows N−1 update gates for both stable `latest` and preview `next` with multiple live and stale generations, loaded `conpty.node`, exact npm-prefix replacement, new no-intro launch, preserved control data, owned-process inventory, identical lifecycle semantics across tags, and explicit rejection of external `taskkill`, PID discovery, package surgery, database/release-state deletion, or AddOne-directory removal.
- [ ] 1.109 Publish the completed unified immediate-update correction as the next immutable Windows-tested `-dev.N` candidate, install from npm `next`, manually confirm the preview workflow is only `npm run publish:next`, `a1 update:next`, and `a1`, and verify the same no-manual-cleanup behavior for stable `a1 update` against an isolated `latest` transition.

## 2. Deferred Executable v2 Behavior Oracle

- [x] 2.1 Catalogue the remaining initial v2 tabs, sidebar, agent-view, status/toast/scrollbar, PTY, UI-restart, and session-recovery flows with stable scenario IDs as a non-normative interaction inventory.
- [ ] 2.2 After the vanilla fullscreen release, pin and package an exactly identified Pi runtime and v2 extension profile and define hermetic direct-versus-AddOne PTY timelines for the catalogued interactions without requiring historical screenshots.
- [ ] 2.3 Run the extension-enabled oracle, preserve normalized cells/styles/cursor/modes/input/timing/process observations, and classify each observed behavior as reproduce, redesign, defer, or retire with the AddOne-owned models and tests intended for later increments.

Tasks 2.2–2.3 are intentionally deferred and SHALL NOT block the vanilla Native Pi fullscreen release or unrelated foundation work.

## 3. Driver and Event Contract Expansion

- [ ] 3.1 Expand the domain contracts to cover structured conversation surfaces, runtime and resource profiles, session references, lifecycle policy, and recovery outcomes.
- [ ] 3.2 Expand the capability vocabulary for structured messages, tools, sessions, exact resume, steering, follow-ups, models, extension UI, and specialized terminal behavior.
- [ ] 3.3 Expand the normalized AddOne event union for conversation, tools, queueing, recovery, extension UI, managed process state, and capability changes.
- [ ] 3.4 Expand the driver start, recover, prompt, steering, follow-up, abort, snapshot, session, model, resize, input, and stop interfaces with explicit unsupported-operation results.
- [ ] 3.5 Implement fake structured-conversation and expanded fake terminal drivers covering success, streaming, tool progress, failure, interruption, capability changes, and recovery outcomes.
- [ ] 3.6 Add driver contract tests proving capability rejection, generation correlation, event ordering, stale-event rejection, and failure containment.

## 4. UI-Supervisor Protocol Expansion

- [ ] 4.1 Expand required/optional feature negotiation, generated contract identity, idempotency keys, command-result persistence, bounded payload rules, and incompatible-feature handling without a manually incremented global protocol number.
- [ ] 4.2 Implement malformed-client isolation, strict framing, request correlation, endpoint permissions, and disconnect cleanup across supported platforms.
- [ ] 4.3 Implement command-result deduplication so retried mutating requests cannot apply twice.
- [ ] 4.4 Complete snapshot revision, event-gap detection, resynchronization, and bounded terminal payload correlation.
- [ ] 4.5 Add protocol tests for required-feature negotiation, generated contract diagnostics, unknown additive fields/events, stale revisions, duplicate commands, partial frames, oversized payloads, multiple clients, reconnect, and rejection before mutation.

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
- [ ] 6.2 Reproduce the extension-oracle-validated tab overflow, active decoration, rename, reorder, title/status animation, and narrow-terminal behavior behind AddOne-owned models.
- [ ] 6.3 Reproduce the extension-oracle-validated sidebar workspace/agent rows, sorting, selection, rename, reorder, push/overlay behavior, and action contract behind AddOne selectors and intents.
- [ ] 6.4 Implement the initial structured conversation surface for user messages, assistant text, thinking, tool calls/results, queue state, compaction/retry notices, recovery notices, and errors.
- [ ] 6.5 Expand deterministic input routing through global shortcuts, focused application shortcuts, focused components, structured editor, dialogs, and unclaimed PTY forwarding.
- [ ] 6.6 Reproduce the extension-oracle-validated transcript scrolling, text selection, selection painting, submission feedback, scrollbar, status, toast, and clipboard behavior without Pi host APIs.
- [ ] 6.7 Implement capability-aware controls so structured, model, session, and terminal actions appear only when supported.
- [ ] 6.8 Add state/update/render tests for mixed surfaces, working/error decorations, drafts, overflow tabs, narrow terminals, focus, shortcut consumption, dialogs, and UI reconnection.

## 7. Hermetic Test Harness Expansion

- [ ] 7.1 Add deterministic fake/replay model behavior and expanded fake-driver orchestration for release-gating UI and supervisor tests without external model access.
- [ ] 7.2 Define the declarative scenario format for launch, user input, mouse input, driver events, resize, faults, waits, clock advancement, deterministic assertions, and artifact retention.
- [ ] 7.3 Generalize artifact bundles to include scenario definition, runtime/profile metadata, session references, driver diagnostics, relevant frames, and failure classification.
- [ ] 7.4 Execute the pinned v2 extension profile directly and through AddOne's PTY simulation and convert its normalized interaction checkpoints into deterministic fake-driver and real-PTY AddOne scenarios.
- [ ] 7.5 Add parallel scenario isolation tests proving temporary homes, databases, sockets, sessions, workspaces, process trees, and artifacts cannot interfere.

## 8. Generic PTY Driver Expansion

- [ ] 8.1 Expand terminal-agent profiles with arguments, environment, cwd, terminal type, dimensions, runtime identity, trust settings, and declared resume level.
- [ ] 8.2 Harvest remaining v2 Windows/Unix process-tree handling without child Pi frame bridges or build-sync behavior.
- [ ] 8.3 Expand virtual-terminal bounds, damage revisions, alternate-screen scrollback, backpressure, protocol-aware paste/mouse/focus input, terminal responses, and host isolation without raw child-output replay.
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
- [ ] 13.6 Document bootstrap and release-cohort topology, storage authority, negotiated control features, driver capabilities, Managed-versus-Native Pi behavior, extension compatibility, recovery guarantees, AddOne and runtime updates, pending activation, rollback, and non-resumable PTY limitations.
- [ ] 13.7 Document the v2 behaviors reproduced, redesigned, deferred, and retired from the executable oracle so follow-up proposals do not reintroduce private Pi host infrastructure.

## Context

See `proposal.md` for motivation and the capability specs for normative behavior.

The current terminal path is a composition of independently maintained models rather than one terminal implementation. The visible path currently includes:

```text
Windows Terminal / Unix terminal
  → AddOne host mode changes
  → custom VT or ReadConsoleInputW decoder
  → semantic input objects
  → JSON UI-supervisor protocol
  → custom mode-dependent key/mouse encoder
  → node-pty / ConPTY
  → child

child output
  → PTY reads
  → transport-cadence transaction inference
  → regex mode tracker and query interception
  → @xterm/headless framebuffer
  → inferred scroll and dirty ranges
  → JSON UI-supervisor protocol
  → manually reconstructed VT output
  → host synchronized-output writer
  → physical terminal
```

The implementation is distributed primarily across:

- `src/terminal-input.ts`;
- `src/host-terminal/*`;
- `src/drivers/terminal/pty-terminal-driver.ts`;
- `src/drivers/terminal/output-transaction-assembler.ts`;
- `src/drivers/terminal/resident-terminal-state.ts`;
- `src/drivers/terminal/terminal-responses.ts`;
- `src/presentation/terminal.ts` and `terminal-projection.ts`;
- `src/ui/host-terminal-renderer.ts` and `host-frame-writer.ts`;
- terminal surface, render-transaction, and semantic-input protocol/domain contracts;
- the outer-PTY simulator and terminal-specific scenario/unit suites.

The observed `0.1.5-dev.7` failures are produced by current repository code, not a stale install. Real runs still show contradictory effective state, rendering artifacts, row-origin drift, and physical Ctrl+C producing a Ctrl+P-owned Pi effect. The test harness also synthesizes Win32 input and tracks terminal modes using assumptions similar to production, so a passing simulation does not establish physical Windows Terminal behavior.

There is a fundamental output-boundary constraint: without an application-supplied synchronized-output boundary, an intermediary cannot know whether two writes are one visual commit. Waiting guesses and adds latency; immediate forwarding preserves direct timing but may reveal the same intermediate state as direct execution. The design therefore stops treating low latency, arbitrary-frame atomicity, and full terminal interception as simultaneously guaranteed properties.

The rest of AddOne already has useful architecture-independent foundations: immutable release cohorts, bootstrap selection, update transactions, package/version commands, control storage, logical generation ownership, protocol framing, dependency policy, and associated tests. Those foundations remain valuable and should not be rebuilt with the terminal stack.

## Goals / Non-Goals

**Goals:**

- Remove the retired terminal implementation and its self-confirming tests before building a replacement.
- Keep AddOne a terminal-based application on Windows, macOS, and Linux, using each platform's native terminal and process facilities rather than a browser or desktop rendering substitute.
- Establish transparent Native Pi and generic-command execution whose data path is structurally as close as possible to direct launch.
- Keep AddOne out of ordinary transparent input, output, rendering, terminal-query, and mode handling.
- Validate rendering, character presentation, input, selection, latency, and restoration through independent physical-host evidence.
- Define composition as a separate capability backed by one coherent mature terminal core.
- Evaluate replacement options in a fixed order with explicit pass/fail criteria.
- Keep core release, update, storage, protocol, and lifecycle behavior buildable and tested during the redesign.
- Resume tabs, panes, reconnection, Managed Pi, and later product work only after the applicable terminal capability is certified.

**Non-Goals:**

- Preserving source compatibility with current terminal renderer, mode, damage, input, or simulator contracts.
- Preserving terminal-specific test count or coverage percentages.
- Porting workaround assertions to a new implementation.
- Inferring visual commits for unsynchronized applications.
- Giving transparent sessions resident-screen, pane, or visual-reconnection guarantees.
- Selecting rendering behavior from Pi identity or visible text.
- Shipping an uncertified composed core merely because transparent mode works.
- Copying Herdr's AGPL implementation or depending on private Pi host APIs.

## Decisions

### 1. Freeze the current terminal pipeline and stop incremental correction

Tasks that extend startup-origin accounting, cadence tuning, damage reconstruction, custom keyboard translation, or ConPTY mode fallback are superseded. No new production fix is added to that path except a narrowly required change that makes cleanup possible or prevents damage to user state while the redesign branch exists.

The current `next` preview remains historical evidence, not a production-ready terminal baseline. A further preview is not published from the retired path.

Alternative considered: complete task 1.117 and continue hardening the existing implementation. Rejected because each correction changes one of several non-authoritative models while leaving the translation count and unknowable frame-boundary problem intact.

### 2. Remove legacy terminal code and invalid tests before replacement implementation

Cleanup occurs on a dedicated `milestone/terminal-redesign` branch created from `develop`. Git history is the archive; invalid executable tests are not retained in the active test tree.

#### Remove or reduce the retired production path

The cleanup inventory includes:

- custom VT and Windows key decoding/encoding used to relay ordinary child input;
- PowerShell `ReadConsoleInputW` helper integration used by that semantic relay;
- terminal regex mode tracking and ConPTY mode fallbacks;
- custom terminal-query interception and synthesized replies;
- cadence/quiescence source-frame inference;
- xterm framebuffer capture used for production host repaint;
- framebuffer-derived scroll and dirty-range inference;
- startup physical-row-origin compensation;
- cell/style-to-VT reconstruction;
- host synchronized frame scheduling and supersedable render queues;
- terminal snapshot/damage/render-transaction control messages used only by the retired path;
- readiness inspection based on reconstructed screen content;
- dependencies used solely by removed production behavior.

Shared process launch or cleanup utilities survive only if they have a tested architecture-independent owner. Code is not retained speculatively because a future candidate might use a similar concept.

#### Remove terminal tests that encode the retired design

Delete, rather than port, tests and fixtures whose subject is:

- output transaction assembly, cadence, quiescence, or source-frame counts;
- host cell rendering, terminal projection, damage, scroll inference, row origin, cursor reconstruction, or framebuffer parity;
- custom terminal mode/query responses;
- custom semantic input and Win32/Kitty/modifyOtherKeys encoding;
- simulated physical wheel, selection, focus, paste, or control-key behavior generated by product-like test helpers;
- walking-skeleton, conversation-stability, packaged real-Pi, extension, multi-CLI, or smoke scenarios whose acceptance depends on the retired renderer/input pipeline;
- regression fixtures that prescribe obsolete offsets, mode fallbacks, encoded records, or reconstructed frames.

The former failures remain recoverable from Git history and are summarized in planning artifacts. They do not remain executable constraints on the replacement.

#### Keep architecture-independent coverage

Retain and adapt tests for:

- bootstrap and immutable release selection;
- cohort state, activation, and garbage collection;
- update and update-transaction recovery;
- package version and registry-channel reporting;
- storage migrations/repositories unrelated to terminal surfaces;
- protocol framing, feature negotiation, size bounds, and request correlation after obsolete terminal message forms are removed;
- generation ownership and stale-generation rejection independent of virtual terminal state;
- dependency and architecture policy;
- exact-artifact packaging and publication mechanics independent of retired terminal gates.

Update-transition tests may use a minimal owned-process fixture to represent a live blocker. They must not retain a terminal emulator merely to create that blocker.

#### Keep the repository buildable after cleanup

The interactive `addone` path may temporarily return an explicit `terminal capability unavailable during redesign` result. `version`, update, release materialization, storage, and core test commands remain functional. A broken hidden fallback is not kept to make `addone` appear operational.

Cleanup completion requires:

1. the retired modules and invalid tests are absent;
2. no remaining core module imports them;
3. the reduced package builds and architecture-independent tests pass;
4. the terminal command fails explicitly rather than entering a partial old path;
5. no replacement terminal stack has yet been introduced.

Alternative considered: build the replacement beside the old path, then switch. Rejected because compatibility adapters would preserve old contracts, encourage dual authorities, and make it unclear which tests prove the new architecture.

### 3. Use transparent direct attachment as the first implementation option

The preferred Native Pi topology is:

```text
mutable npm bin
  → release-matched bootstrap/UI broker
      ↔ supervisor: lease and lifecycle messages only
      → child process with inherited physical stdin/stdout/stderr
          ↔ physical terminal
```

The foreground broker, not the detached supervisor, owns the transparent child process. The supervisor remains authoritative for logical identity, generation metadata, release ownership, and policy, but it is not in the terminal byte path.

This is a generic terminal capability, not a Native Pi launcher disguised as one. Exact commands, shells, editors, pagers, alternate-screen programs, multiplexers, and unrelated agent CLIs use the same broker and native platform launch path. Application identity and visible output are unavailable as terminal-routing inputs. If a platform cannot provide required behavior generically, the profile reports unsupported capability rather than enabling a named workaround.

The lifecycle is:

1. UI connects to the release-matched supervisor.
2. UI requests an exclusive foreground-terminal lease and exact launch profile.
3. Supervisor records a `transparent`, non-reconnectable generation intent.
4. Foreground broker launches the exact child with inherited console/terminal handles and no intermediate PTY when the platform permits.
5. Broker reports PID/start identity and lease activation.
6. Broker waits for process completion but does not read or write ordinary terminal data.
7. On exit it reports outcome, releases the lease, and applies bounded abnormal-exit cleanup only when required.

No terminal input event, output frame, cursor, cell, mode, or query response crosses the UI-supervisor protocol. No AddOne terminal control is emitted after child handoff. Direct attachment also means AddOne cannot inspect a reconstructed frame for readiness; readiness becomes successful spawn plus child liveness, while real usability is a packaged acceptance concern.

#### Platform behavior

- **Windows:** launch the child attached to the same console/ConPTY-facing standard handles as the broker. Do not enable `CSI ? 9001`, start a `ReadConsoleInputW` relay, or create a nested ConPTY in the preferred path.
- **Unix:** preserve the controlling TTY and foreground process-group semantics. Transfer foreground interaction to the child process group and restore the broker/parent group after exit.
- **All platforms:** preserve exact executable, arguments, cwd, environment, dimensions, signal/exit outcome, and owned-process identity.

Transparent attachment intentionally gives up visual reconnection, panes, virtual scrollback, and supervisor survival of an attached foreground process unless a later independently certified detach mechanism is added.

Alternative considered: keep supervisor-owned PTY for process longevity. Rejected as the first option because it changes the terminal route and recreates input/output mediation before native parity has been established.

### 4. Measure transparent parity structurally and physically

The strongest structural invariant is that AddOne does not execute on the ordinary input/output path after handoff. Instrumentation verifies:

- no AddOne read of foreground terminal input;
- no AddOne render or mode write after the child starts;
- inherited handle/TTY identity;
- no nested PTY in the direct-attach path;
- no terminal byte payload in the control protocol;
- no AddOne timers associated with input or rendering.

Structural proof is supplemented by independent physical-host comparison.

#### Isolated physical-host execution

Every physical-host driver and every terminal, shell, workload, automation helper, recorder, and cleanup process it creates runs inside a dedicated disposable worker or virtual machine with an exclusive interactive test desktop and no user-owned applications. The developer workstation may submit a non-interactive job and collect artifacts from an already isolated worker, but it does not launch, focus, drive, resize, or close test terminals and does not receive injected desktop input. Before launch, the runner proves the worker and desktop are dedicated; if it cannot, the gate reports a blocked verdict without spawning a terminal. Every process is recorded by PID plus start identity, cleanup is limited to that exact owned tree, and broad process-name, wildcard, or terminal-application termination is prohibited. Resetting the disposable worker is the final containment mechanism after failed cleanup.

#### Windows physical-host driver

Inside the dedicated isolated Windows worker, a separate test tool launches controlled Windows Terminal profiles and originates actions through operating-system automation rather than AddOne's encoder. Its responsibilities are:

- send real key down/up and text input, including Ctrl+A-Z, Ctrl+C, Ctrl+P, modifiers, repeats, arrows, and IME-relevant text where automation permits;
- drive clipboard paste, focus, mouse buttons, wheel, selection, and resize through physical host behavior;
- capture stable-window screenshots and OS/process timing;
- capture console mode, process tree, and standard-handle identity independently;
- run a child recorder workload that reports what the application actually receives without importing AddOne code.

For Native Pi, stable screenshots and behavioral checkpoints cover editor input, dialogs, selection-aware Ctrl+C, Ctrl+P, wheel scrolling, resize, normal/repeated-Ctrl+C exit, and parent shell editing. Pixel comparison uses identical terminal profile, font, scale, dimensions, theme, and rendering backend and masks only documented nondeterminism such as cursor blink phase. Known terminal fixtures cover graphemes, combining marks, emoji sequences, wide cells, colors, attributes, erases, cursor styles, and screens.

Native Pi is not the only certification workload. Every platform corpus also includes an interactive shell, editor or equivalent full-input application, pager/scrollback workload, alternate-screen application, and unrelated interactive/fullscreen CLI. A capability fails when any generic workload exposes an AddOne-specific rendering, character, input, mode, resize, latency, or restoration difference; passing Pi cannot authorize a Pi-specific correction.

#### Latency acceptance

Two measurements are retained:

- OS action to child-observed input for the recorder workload;
- OS action to stable visible effect for Native Pi and representative interactive workloads.

Transparent mode has a zero-buffering structural requirement. Across repeated paired runs, the hosted median and p95 must be statistically non-inferior to direct launch within the physical automation noise envelope. Initial engineering guardrails are no more than 1 ms added median and 2 ms added p95 for child-observed input, and no more than 2 ms added median and 5 ms added p95 for visible effects. If the host automation cannot resolve those bounds reliably, the gate falls back to structural zero-byte-path proof plus confidence intervals that show no AddOne-specific delay; it does not loosen the product path by adding buffering.

#### Cross-platform host validation

Windows 11 x64 with Windows Terminal is implemented first because it exposes the confirmed failures. Equivalent native-host drivers follow for current Ubuntu LTS x64 and current/previous macOS arm64. An outer PTY remains useful for process and byte-level integration but is not called a physical input/rendering oracle.

Alternative considered: continue using `OuterPtyRunner` and xterm snapshots. Rejected as sole acceptance because it validates nested PTYs and software models, not complete host selection, input, font rendering, and console behavior.

### 5. Use raw PTY relay only as a bounded transparent fallback experiment

If direct attachment cannot satisfy a required ownership or packaging constraint, evaluate:

```text
physical terminal ↔ byte-for-byte relay ↔ PTY/ConPTY ↔ child
```

The relay may resize and stop the child but does not parse, delay, group, answer, decode, or re-encode terminal data. A shadow parser may record diagnostics only and has no behavioral authority.

Raw relay is accepted only if the complete physical-host matrix is indistinguishable from direct attachment, including Windows control-key identity, selection, scrollback, wheel, character rendering, modes, latency, exit, and parent restoration. A nested ConPTY difference rejects the option; it is not patched with semantic translation.

Alternative considered: make raw relay the default because it preserves supervisor ownership. Rejected because Windows ConPTY is itself an observable terminal translation boundary.

### 6. Evaluate composed terminal cores only after transparent mode passes

Composition is a separate milestone. Candidate evaluation happens in a standalone conformance spike before any candidate is adapted to AddOne domain or protocol contracts.

The candidate must provide one authoritative implementation for:

- PTY integration and resize;
- escape parsing and terminal-generated replies;
- primary/alternate screen and bounded scrollback;
- graphemes, widths, styles, colors, palette, cursor, and modes;
- keyboard, paste, focus, mouse, and wheel encoding;
- ordered operations/damage or authoritative snapshots;
- backpressure and resynchronization;
- Windows, Linux, and macOS behavior.

A candidate fails if production integration requires reintroducing AddOne regex mode tracking, query interception, keyboard-protocol encoders, framebuffer scroll inference, cadence frame inference, or per-CLI patches. Candidate conformance is evaluated with generic terminal protocols and workloads first; named applications are compatibility consumers, never switches in the implementation.

#### Candidate 1: WezTerm Rust stack

Evaluate a pinned WezTerm source revision first, including `portable-pty`, `wezterm-term`, `termwiz`, and the cell/surface/escape/input crates they use. Reasons for first position:

- coherent terminal, input, PTY, and rendering vocabulary from one mature cross-platform terminal project;
- active Windows and Unix implementation;
- MIT licensing;
- broad Unicode, protocol, and terminal-state behavior.

Known costs:

- `wezterm-term` is currently consumed from the WezTerm workspace rather than a normal published crate;
- Rust is not installed in the current developer environment and must be pinned and bootstrapped reproducibly;
- the dependency graph and enabled features may be large;
- native Windows/Linux/macOS packaging and symbols require release engineering;
- WezTerm's GUI renderer is not embedded; AddOne still needs a host presentation boundary for composed cells/operations.

The spike starts as a standalone Rust executable so conformance can be measured without N-API or AddOne protocol effects. If it passes, compare two integration boundaries:

1. **Batched N-API addon (preferred):** terminal core lives with its owning AddOne process; calls operate on byte/event batches and return batched deltas or snapshots, never one call per cell.
2. **Native sidecar:** terminal core lives in a separately versioned process with a bounded binary protocol; preferred only if crash isolation, update isolation, or build simplicity outweigh added serialization and lifecycle cost.

The boundary decision uses measured input/output latency, sustained throughput, crash containment, upgrade behavior, package size, and cross-platform reproducibility.

#### Candidate 2: libvterm plus native platform layers

Evaluate only if WezTerm fails a mandatory criterion. libvterm offers a mature MIT terminal parser/state engine, but it does not by itself provide one coherent cross-platform PTY, physical input, modern keyboard protocol, query, and packaging solution. The candidate passes only if those additions can be implemented without recreating the fragmented ownership being removed.

#### Candidate 3: public-API-only xterm.js redesign

Evaluate only if native candidates fail. The spike must prove that public APIs expose authoritative effective modes, responses, scroll operations/damage, Unicode state, and input requirements. Private APIs, regex supplements, framebuffer inference, and a second custom input model are disqualifying. The current `@xterm/headless` design is not reused as the starting implementation.

#### Rejected alternatives

- Continue the current xterm-plus-regex pipeline.
- Patch Native Pi or inspect its content to improve rendering.
- Embed private Pi TUI interfaces.
- Delegate correctness to terminal timing heuristics.
- Adopt an AGPL terminal implementation into AddOne production code.

### 7. Define composed frame semantics around known boundaries

A composed core applies explicit synchronized-output regions atomically. For unsynchronized output, it publishes ordered authoritative operations without waiting for transport cadence. AddOne may batch operations already hidden by an explicit synchronization boundary or merge state that is provably superseded under backpressure. It does not claim that an I/O turn or millisecond gap is an application frame.

“Flicker-free” for composed mode means AddOne introduces no extra clear, stale overwrite, duplicate fixed row, reordered operation, unnecessary whole-view repaint, or partial synchronized transaction beyond direct behavior. It does not mean hiding intermediate states that the unsynchronized application also exposes directly.

Alternative considered: retain the 32 ms/1.75× adaptive policy. Rejected because it trades interactive latency for an unprovable frame guess and has already failed to create stable general parity.

### 8. Keep transparent and composed contracts separate through the stack

Profiles advertise terminal capability explicitly. Protocol negotiation uses separate feature IDs for foreground lease/lifecycle and composed surface transport. Transparent profiles never publish terminal cells or ordinary input commands. Composed profiles never silently fall back to transparent mode when a pane or reconnect requires authoritative state.

The AddOne shell enables controls from capability:

| Feature | Transparent | Composed |
|---|---:|---:|
| Native physical rendering/input | Yes | No; mediated |
| Full viewport | Required initially | Supported |
| AddOne panes/overlays | No | Yes after certification |
| Resident screen | No | Yes |
| Visual reconnect | No | Yes |
| Virtual scrollback | No | Yes |
| Exact direct Native Pi baseline | Primary goal | Separate compatibility result |

### 9. Replace terminal code atomically after candidate certification

The composed candidate does not adapt to the retired `TerminalModeTracker`, `TerminalRenderTransaction`, or semantic-input encoder contracts. New domain types are derived from the selected core's authoritative public concepts while remaining library-neutral at AddOne boundaries. The old terminal path is already absent, so integration cannot fall back to it.

Architecture checks reject:

- more than one production terminal-state authority per session;
- terminal behavior selected by executable, arguments, named environment, or content;
- platform adapters that branch by terminal application instead of native platform capability;
- regex parsing of terminal modes/queries outside an approved parser core;
- custom keyboard encoding outside the selected authoritative terminal boundary;
- cadence/frame heuristics;
- production imports of archived test simulators;
- per-cell native boundary calls.

## Risks / Trade-offs

- **[Risk] Cleanup temporarily removes interactive `addone` functionality.** → Work on a milestone branch, keep stable `latest` unchanged, make the temporary failure explicit, and restore functionality only through the new transparent path.
- **[Risk] Direct attachment weakens the original persistent-supervisor promise.** → Advertise transparent sessions as foreground/non-reconnectable; reserve persistent visual sessions for composed mode.
- **[Risk] Foreground broker ownership complicates update shutdown.** → Register exact PID/start identity and lease ownership with the supervisor; reuse verified update cleanup without putting terminal bytes through the supervisor.
- **[Risk] Direct child terminal modes can survive a crash.** → Prefer the child's native cleanup, retain a small bounded platform failsafe, and test abnormal exit against the parent terminal. The failsafe must not become a normal-path emulator.
- **[Risk] Physical UI automation can be flaky or interfere with the user's desktop.** → Run it only on dedicated disposable workers/VMs with exclusive test desktops, refuse execution when isolation is unproven, use ownership-scoped cleanup, fixed terminal profiles, repeated paired trials, stable checkpoints, structural invariants, independent child recorders, retained screenshots/video, and explicitly user-initiated manual acceptance for release candidates.
- **[Risk] Pixel equality is sensitive to font and GPU state.** → Pin font, DPI, scale, theme, dimensions, renderer settings, and terminal version; separate deterministic fixture image gates from behavioral real-Pi checkpoints.
- **[Risk] The WezTerm workspace is large and not all components are published crates.** → Pin one reviewed commit, minimize features, generate lockfiles/SBOM, cache reproducible toolchains, and reject the candidate if package size or maintenance burden is unacceptable.
- **[Risk] Rust/native packaging increases release complexity.** → Prove standalone cross-platform builds before AddOne integration and retain libvterm/public-xterm fallbacks.
- **[Risk] A sidecar adds latency and another protocol.** → Prefer batched N-API unless measured isolation benefits justify the sidecar; never use JSON or per-cell messages on the hot path.
- **[Risk] A mature terminal core still differs from each user's physical terminal.** → Treat composed behavior as its own certified terminal identity, not literal physical-terminal equivalence; use transparent mode for native compatibility.
- **[Risk] Removing old regression tests loses useful bug names.** → Preserve summaries in Git/OpenSpec history and rebuild only independently valid scenarios against the chosen architecture.
- **[Risk] Later feature pressure may cause transparent/composed mixing.** → Enforce explicit capability checks and architecture rules; fail unsupported operations rather than introducing hidden interception.

## Migration Plan

### Stage 0: Planning and release freeze

- Revise proposal, specs, design, and tasks.
- Mark old terminal correction/publication tasks superseded.
- Do not publish another terminal preview from the old pipeline.

Rollback: planning-only; current Git history remains available.

### Stage 1: Legacy cleanup

- Create `milestone/terminal-redesign` from `develop`.
- Remove retired terminal production modules, protocol forms, dependencies, tests, scenarios, and fixtures.
- Adapt only architecture-independent core tests.
- Make interactive terminal launch fail explicitly during the temporary gap.
- Run build, typecheck, architecture, dependency, core unit, storage, release, update, and packaging-mechanics gates.
- Commit cleanup in coherent deletion/refactor tasks.

Rollback: revert cleanup commits on the milestone branch; do not publish the reverted old path as production-ready.

### Stage 2: Oracle foundations and automation containment

- Build the standalone child input/output recorder without importing AddOne terminal code.
- Implement and enforce isolation preflight, exact process/start-identity tracking, ownership-scoped cleanup, and blocked verdicts when isolation is unavailable; never run physical-host automation on the user's active workstation.
- Retain the selected Windows automation driver contract, but defer automated terminal launch, focus, input, capture, and cleanup development until the manual-first transparent checkpoint passes.

Rollback: oracle foundations and containment tooling do not alter runtime behavior.

### Stage 3: Transparent direct attachment

- Add foreground-terminal lease and lifecycle messages.
- Implement platform direct attachment with inherited terminal handles.
- Add bounded abnormal cleanup and exact outcome reporting.
- Prove structural absence from input/output paths with non-desktop unit and integration tests.
- Do not run or expand automated physical-host actions in this stage.

Rollback: interactive launch returns to explicit unavailable status; users continue using direct Pi or stable `latest`.

### Stage 4: Manual-first transparent checkpoint

- Pack one exact local candidate after Stage 3 checks pass.
- Provide exact build/install/launch steps and a checklist for rendering, characters, rapid input, control keys, selection, clipboard, mouse/wheel, dialogs, resize, exit, and parent shell.
- The user launches, interacts with, and closes the candidate manually; AddOne tooling performs no automated focus, input injection, window management, application closure, or process cleanup on the active desktop.
- Preserve findings, correct regressions, and repeat structural and manual checks until the user explicitly accepts the candidate.

Rollback: the user returns to direct Pi or stable `latest`; no automation owns desktop state.

### Stage 5: Isolated automated physical-host certification

- Only after manual acceptance, provision dedicated disposable per-platform workers or VMs with exclusive interactive test desktops.
- Implement and run the Windows Terminal OS-level action, screenshot, input, rendering, latency, Native Pi, and generic-corpus gates inside the isolated Windows worker.
- Add equivalent Linux and macOS host drivers and corpus gates after Windows criteria stabilize.
- Pack and certify exact candidate bytes on those workers; automated certification remains mandatory and manual acceptance does not substitute for it.
- Publish `next` only after automated and manual transparent acceptance.

Rollback: discard isolated workers and retain stable `latest`; never fall back to the user's desktop.

### Stage 6: Raw-relay fallback, only if direct attachment fails a required constraint

- Implement a minimal byte relay in an isolated spike.
- Run the complete physical matrix.
- Accept only if indistinguishable; otherwise delete the spike and retain direct attachment limitations.

Rollback: remove the spike; no production contract depends on it.

### Stage 7: Composed-core candidate evaluation

- Bootstrap a pinned Rust toolchain and WezTerm source revision.
- Build a standalone conformance runner.
- Evaluate WezTerm against the generic corpus and platform matrix.
- If it fails, document the failed criterion and evaluate libvterm; then public-API-only xterm.js.
- Select no candidate if none meets the authority and behavior requirements.

Rollback: transparent mode remains supported; composed features remain unavailable.

### Stage 8: Composed integration

- Select batched N-API or sidecar from measured evidence.
- Introduce new library-neutral composed contracts and protocol features.
- Add panes/reconnection only after authoritative snapshots, ordered operations, input, backpressure, and restoration pass.
- Run generic, packaged multi-CLI, and supported-platform composed verdicts.

Rollback: disable composed profile creation; transparent sessions remain unaffected.

### Stage 9: Resume later product work

- Re-plan v2 oracle, tabs/sidebar, Managed Pi, and multi-agent work against the certified capability model.
- Never make later features silently move a transparent session into composed mode.

## Open Questions

- Which Windows UI automation implementation offers the most reliable OS-level key/mouse injection and stable screenshot capture; the oracle task will compare maintained options without changing the physical-host requirement.
- Whether batched N-API or a native sidecar gives the better composed integration boundary; this is decided only after the standalone WezTerm candidate passes conformance.
- Whether a future platform-supported detach mechanism can preserve a transparent process without claiming visual reconnection; transparent v1 does not depend on it.

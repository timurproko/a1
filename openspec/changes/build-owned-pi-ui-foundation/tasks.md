## 1. Establish Contracts and Research Boundaries

- [x] 1.0 Create or switch to `milestone/owned-pi-ui-foundation` before implementation and verify the working tree contains only this change's implementation edits.
- [x] 1.1 Define dependency-free AddOne owned-UI contracts for commands, session events, view models, transcript blocks, editor state, status, dialogs, overlays, themes, component slots, diagnostics, and lifecycle; pass valid, malformed, oversized, and compatibility fixtures.
- [x] 1.2 Add architecture governance that confines Pi SDK and public Pi component types to adapter modules and rejects `InteractiveMode` mutation, prototype patching, private-field inspection, deep Pi imports, distribution-hash gating, Bun-only dependencies, oh-my-pi package dependencies, terminal-host coupling, and stock-Pi extension UI assumptions.
- [x] 1.3 Record the local research baseline for `v2` fragility and `D:\Git\oh-my-pi` architecture: adopted patterns, explicitly rejected scope, source revisions, licenses, and provenance requirements for any future port; pass policy tests.

## 2. Build the Pi Engine Adapter

- [x] 2.1 Implement the public-SDK engine adapter over `createAgentSessionRuntime()` for session construction, service ownership, prompt, abort, retry, compaction, model, thinking, session resume, diagnostics, and shutdown; pass synthetic engine conformance fixtures.
- [x] 2.2 Map Pi events, state snapshots, and commands into versioned AddOne-owned view models without exposing Pi types above the adapter; pass event sequencing, malformed-event, snapshot, command-correlation, cancellation, and cleanup tests.
- [x] 2.3 Implement bounded event queues, backpressure, error mapping, restart reconciliation, and terminal cleanup so one engine failure cannot corrupt AddOne UI state; pass high-rate and failure-isolation tests.
- [x] 2.4 Add Pi-upgrade conformance suites for SDK construction, service creation, event shape, command behavior, public component constructor/render contracts, and adapter mapping; prove failures remain contained at adapters.

## 3. Build the AddOne Terminal UI Runtime

- [x] 3.1 Implement the AddOne-owned fullscreen terminal runtime with raw input normalization, focus routing, component invalidation, coalesced rendering, width-safe sanitized output, overlays, terminal resize, synchronized updates where supported, and restoration on exit; pass focused terminal-runtime tests.
- [x] 3.2 Implement append-only transcript history with explicit live and finalized block boundaries, render caching, resize-safe repainting, selection-safe output, and bounded frame scheduling; pass streaming, long-output, Unicode, alternate-content, resize, and regression fixtures.
- [x] 3.3 Implement the owned prompt editor with text and IME input, queued submissions, paste, selection, clipboard, keyboard bindings, focus, cancellation, and terminal-restoration behavior; pass editor property and interaction tests.
- [x] 3.4 Implement status, header/footer, notifications, dialogs, selectors, command surface, and diagnostics as AddOne-owned components connected through view models; pass rendering and state-transition fixtures.

## 4. Deliver the Vanilla-Style Fullscreen Session

- [x] 4.1 Implement transcript and streaming presentation for user, assistant, thinking, tool-call, tool-result, retry, compaction, error, and system blocks using AddOne view models; pass deterministic streaming and resize fixtures.
- [x] 4.2 Adapt documented public Pi components where their contracts are independently usable and add provenance-recorded MIT-licensed ports only for surfaces that require AddOne ownership; pass component conformance and attribution/provenance policy tests.
- [x] 4.3 Wire prompt, abort, retry, compaction, model, thinking, session creation, session resume, settings, and shutdown workflows through the engine adapter; pass command/state integration fixtures with a synthetic engine.
- [x] 4.4 Make bare `a1` and `addone` launch the owned UI, preserve untouched upstream transparent attachment at `a1 pi` and `addone pi`, preserve sandbox routing, and remove `a1 ui` and `addone ui`; pass CLI routing, alias rejection, startup, exit, and fallback-isolation tests.

## 5. Add Customization, Extension, and Diagnostics Foundations

- [x] 5.1 Implement versioned AddOne slots for themes, transcript blocks, tool cards, editor, status surfaces, commands, selectors, overlays, and future layout composition; pass registration, precedence, isolation, and invalid-slot tests.
- [x] 5.2 Add a vanilla-style preset and prove customizations resolve without mutating installed Pi code or depending on Pi's stock extension UI context; pass preset replacement and rollback fixtures.
- [x] 5.3 Extend the public-SDK resource adapter with complete AddOne-owned contracts for pinned visible extension UI callbacks while retaining non-visual resource discovery; pass exhaustive callback-shape, unsupported-path, diagnostics, malformed-extension, and no-private-context architecture tests.
- [x] 5.4 Add bounded logging, redaction, diagnostics capture, CPU/memory/frame observations, and terminal-restoration failure reporting without exporting raw engine payloads through UI controls; pass diagnostics policy tests.

## 6. Record the Custom Renderer Spike

- [x] 6.1 Run complete automated gates for the initial hand-written runtime spike: build, typecheck, tests, architecture, adapter conformance, terminal runtime, transcript, editor, input, clipboard, resize, lifecycle, resource, packaging, audit, and strict OpenSpec validation; preserve machine-readable evidence and mark the spike unsuitable for production acceptance.

## 7. Mechanically Port the Complete Pinned Pi Interactive UI

- [x] 7.1 Add the exact pinned public `@earendil-works/pi-tui` dependency and implement `PiTuiRuntimeAdapter` over public TUI, terminal lifecycle, input, focus, overlays, differential rendering, resize, and restoration; pass runtime conformance and architecture-boundary tests without private fields or patches.
- [ ] 7.2 Regenerate an exhaustive inventory of every interactive source module and relevant behavior at Pi commit `53fa77ccd8a279eb87e92294ef3687b03ff80112`; classify each as public reuse, owned source port, or host adapter, and record upstream path, local destination, attribution, tests, modifications, and approved deviations in a machine-readable ledger.
- [ ] 7.3 Add repository-governance validation for the source ledger, pinned identities, MIT attribution, local destinations, forbidden deep imports, stale mappings, and undocumented deviations; prove the gate fails when any pinned source unit or required field is removed.
- [ ] 7.4 Port pinned theme loading, color resolution, ANSI styles, spacing constants, layout primitives, and terminal-dependent style behavior without AddOne redesign; pass independent fixed-width style and row comparisons against pinned Pi.
- [ ] 7.5 Port user, assistant, thinking, system, custom, bash, tool-call, tool-result, retry, compaction, and error presentation as stateful pinned components; pass lifecycle, streaming, replacement, wrapping, Unicode, and resize comparisons.
- [ ] 7.6 Port the pinned editor, autocomplete providers, slash/template/skill/extension completion, keybindings, paste, selection, clipboard, queue submission, and cancellation behavior; pass upstream-versus-AddOne input sequence and editor-frame comparisons.
- [ ] 7.7 Port pinned root composition, header and startup notices, transcript spacing, footer/status surfaces, working indicators, focus transitions, invalidation, and resize behavior; pass independent startup, busy, idle, narrow, wide, and resized frame comparisons.
- [ ] 7.8 Port pinned selectors and dialogs for models, settings, sessions, resume, tree/fork, authentication, import/export/share, help surfaces, and confirmation flows; pass open, navigation, selection, cancellation, failure, focus-restoration, and resize parity tests.
- [ ] 7.9 Port the complete pinned built-in command and input controllers while preserving dispatch order, side effects, hidden routes, prompt-template/skill/extension fallthrough, bash inclusion rules, clipboard, queue behavior, and shutdown; pass exhaustive success, cancellation, and failure conformance against independently recorded upstream outcomes.
- [ ] 7.10 Port ordinary prompt orchestration from editor submission through visible user turn, public session prompt execution, ordered streaming assistant/tool updates, turn settlement, abort, and recoverable failures; pass synthetic edge cases plus a real SDK-backed prompt proving visible submission and completion.
- [ ] 7.11 Port queued messages, steering/follow-up behavior, retries, compaction, transcript rebuilding, session switches, terminal progress, diagnostics, malformed events, and error recovery; pass high-rate ordering, state replacement, cancellation, and failure-isolation tests against pinned outcomes.
- [ ] 7.12 Bind the complete pinned public extension lifecycle through the AddOne-owned extension UI bridge, including registration, session switch, cancellation, disposal, and failure isolation; pass callback-coverage and no-private-context architecture tests.
- [ ] 7.13 Port extension widgets, status/footer contributions, working messages, terminal input hooks, and focus/invalidation behavior; pass independent rendering, input-consumption, replacement, cancellation, and cleanup parity tests.
- [ ] 7.14 Port extension custom editors and inputs, selectors, dialogs, notifications, and overlay/focus behavior; pass independent open, update, resolve, cancel, throw, resize, and restoration parity tests.
- [ ] 7.15 Port extension custom message and tool renderers, partial-result updates, detail expansion, malformed-output handling, and renderer failure isolation; pass streaming, replacement, error, fallback, and cleanup parity tests.
- [ ] 7.16 Remove superseded approximate shell controllers, shallow active-render reconstruction, duplicate command paths, obsolete `a1 ui` routing, and invalidated parity fixtures only after their ported replacements pass focused and containing suites; retain historical evidence with explicit invalidation metadata.
- [ ] 7.17 Prove exhaustive source-to-port coverage with zero unmapped interactive modules, zero unapproved deviations, complete attribution, and tests linked for every ledger entry; preserve the machine-readable report and intentional-failure fixtures.
- [ ] 7.18 Run independent two-producer built-in and extension component/composition parity at fixed widths and states, preserving raw ANSI outputs and failing on row, style, color, spacing, wrapping, focus, editor, selector, dialog, status, footer, renderer, error, or resize divergence outside named terminal-only tolerances.
- [ ] 7.19 Run independent exhaustive command, keybinding, input, prompt, queue, tool, model, settings, session, authentication, clipboard, extension, and shutdown workflow parity; preserve both producers' raw outcomes and prove the harness fails when a path or transition is intentionally removed.
- [ ] 7.20 Run real public-SDK-backed prompt and extension integration with streaming text, thinking, tool calls/results, retries, errors, extension surfaces, and settlement; prove the owned UI remains interactive and restores focus after success, cancellation, and failure.
- [ ] 7.21 Run terminal lifecycle parity for startup, suspend/resume where supported, resize storms, hardware cursor, progress, selection-safe output, graceful shutdown, abnormal failure, and terminal restoration; pass focused Windows checks and preserve deferred platform-certification status.
- [ ] 7.22 Correct every remaining source, workflow, frame, extension, prompt, or lifecycle divergence; rerun focused and containing gates and record exact commit, package versions, exclusions, tolerances, raw artifact hashes, and machine-readable evidence before fresh manual acceptance.

## 8. Accept the 1:1 Default Owned UI

- [ ] 8.1 Run complete automated gates after the source port: build, typecheck, tests, architecture, source coverage, SDK/runtime/component conformance, independent built-in and extension frame/workflow parity, real prompt/extension integration, lifecycle, packaging, audit, and strict OpenSpec validation; preserve machine-readable evidence and reject all invalidated approximation-era parity records.
- [ ] 8.2 Run user-controlled manual smoke acceptance from bare `a1` against `a1 pi`: startup visuals, prompt and streaming, tools, editor and queued input, commands, abort/retry/compaction, model and thinking controls, sessions, settings, clipboard, selection, extension UI, resize, errors, and shutdown; record exact commit, package, terminal, and extension identities.
- [ ] 8.3 Correct every manual finding, reopen every contradicted task, and rerun focused, containing, source-coverage, real-integration, and parity gates; mark the base accepted only when all built-in and visible extension workflows pass.
- [ ] 8.4 Update CLI help, user documentation, development instructions, and recovery guidance to state that bare `a1` launches the owned UI, `a1 pi` is the untouched upstream fallback/oracle, sandbox is unchanged, and `a1 ui` is removed; pass documentation and CLI-help consistency checks.
- [ ] 8.5 Merge the accepted slice through `develop` and publish a unique `-dev.N` package under npm `next` with the owned UI as the bare default, AddOne-specific visual customization and structured tabs still disabled, no stable support claim, `latest` unchanged, and registry/package integrity verified.

## 9. Handoff to Multi-Agent Workspace

- [ ] 9.1 Record evidence that the parity-safe AddOne shell contracts are composable for future structured tabs without initializing the terminal host or creating PTYs.
- [ ] 9.2 Update the existing multi-agent milestone evidence to identify this change as satisfying its owned-UI prerequisite only after all source-port, extension, parity, and base gates pass; do not begin structured tabs or section 6 of that milestone before this acceptance.

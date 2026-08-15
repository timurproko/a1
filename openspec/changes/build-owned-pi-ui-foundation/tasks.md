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
- [x] 4.4 Add the explicitly selected owned-UI development launch path without changing bare transparent AddOne, `a1 pi`, or `a1 sandbox`; pass CLI routing, alias, profile, startup, and rollback tests.

## 5. Add Customization and Diagnostics Foundation

- [x] 5.1 Implement versioned AddOne slots for themes, transcript blocks, tool cards, editor, status surfaces, commands, selectors, overlays, and future layout composition; pass registration, precedence, isolation, and invalid-slot tests.
- [x] 5.2 Add a vanilla-style preset and prove customizations resolve without mutating installed Pi code or depending on Pi's stock extension UI context; pass preset replacement and rollback fixtures.
- [x] 5.3 Support public-SDK non-visual Pi resources through the adapter where available and define unavailable visual-extension behavior; pass resource-discovery, diagnostics, and no-partial-capability fixtures.
- [x] 5.4 Add bounded logging, redaction, diagnostics capture, CPU/memory/frame observations, and terminal-restoration failure reporting without exporting raw engine payloads through UI controls; pass diagnostics policy tests.

## 6. Record the Custom Renderer Spike

- [x] 6.1 Run complete automated gates for the initial hand-written runtime spike: build, typecheck, tests, architecture, adapter conformance, terminal runtime, transcript, editor, input, clipboard, resize, lifecycle, resource, packaging, audit, and strict OpenSpec validation; preserve machine-readable evidence and mark the spike unsuitable for production acceptance.

## 7. Build the Public Pi Shell and Prove Current-Version Parity

- [x] 7.1 Add the exact pinned public `@earendil-works/pi-tui` dependency and implement `PiTuiRuntimeAdapter` over public TUI, terminal lifecycle, input, focus, overlays, differential rendering, resize, and restoration; pass runtime conformance and architecture-boundary tests without private fields or patches.
- [x] 7.2 Implement `PiSessionShell` from public Pi editor, transcript, tool, selector, dialog, and status components plus provenance-recorded orchestration ports; remove the hand-written runtime/editor/chrome from the `a1 ui` production path while preserving explicit transparent modes.
- [x] 7.3 Build static component parity fixtures comparing the owned shell and pinned Pi components at fixed widths and states for transcript, streaming, tools, editor, queued input, dialogs, selectors, status, errors, and resize; fail on row divergence outside documented tolerance.
- [x] 7.4 Build scripted event-sequence and terminal-frame parity fixtures for the pinned Pi version: drive equivalent session events through Pi and AddOne, render emitted ANSI into a virtual terminal or captured frame, and compare resulting screens.
- [x] 7.5 Correct every parity divergence, rerun focused and containing gates, and record the exact source commit, package version, fixture coverage, tolerances, and machine-readable parity evidence before manual acceptance.

## 8. Accept the Parity-Safe Base UI

- [ ] 8.1 Run complete automated gates after the Pi shell migration: build, typecheck, tests, architecture, SDK/runtime/component conformance, parity fixtures, lifecycle, resource, packaging, audit, and strict OpenSpec validation; preserve machine-readable evidence.
- [ ] 8.2 Run user-controlled manual smoke acceptance for the exact parity-passing artifact: prompt and streaming, tools, editor and queued input, abort/retry/compaction, model and thinking controls, session resume, settings, clipboard, selection, resize, shutdown, and comparison against `a1 pi`; record exact commit and package identity.
- [ ] 8.3 Correct every manual finding, rerun focused, containing, and parity gates, and mark the base UI accepted only when all baseline workflows pass.
- [ ] 8.4 Merge the accepted slice through `develop` and publish a unique `-dev.N` package under npm `next` as an explicitly selected owned-UI development path, with structured tabs, additional customization, and composed terminal behavior disabled and no stable support claim; keep `latest` unchanged and verify registry/package integrity.

## 9. Handoff to Multi-Agent Workspace

- [ ] 9.1 Record evidence that the parity-safe AddOne shell contracts are composable for future structured tabs without initializing the terminal host or creating PTYs.
- [ ] 9.2 Update the existing multi-agent milestone evidence to identify this change as satisfying its owned-UI prerequisite only after all parity and base gates pass; do not begin structured tabs or section 6 of that milestone before this acceptance.

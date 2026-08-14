## 1. Establish Contracts and Research Boundaries

- [ ] 1.1 Define dependency-free AddOne owned-UI contracts for commands, session events, view models, transcript blocks, editor state, status, dialogs, overlays, themes, component slots, diagnostics, and lifecycle; pass valid, malformed, oversized, and compatibility fixtures.
- [ ] 1.2 Add architecture governance that confines Pi SDK and public Pi component types to adapter modules and rejects `InteractiveMode` mutation, prototype patching, private-field inspection, deep Pi imports, distribution-hash gating, Bun-only dependencies, oh-my-pi package dependencies, terminal-host coupling, and stock-Pi extension UI assumptions.
- [ ] 1.3 Record the local research baseline for `v2` fragility and `D:\Git\oh-my-pi` architecture: adopted patterns, explicitly rejected scope, source revisions, licenses, and provenance requirements for any future port; pass policy tests.

## 2. Build the Pi Engine Adapter

- [ ] 2.1 Implement the public-SDK engine adapter over `createAgentSessionRuntime()` for session construction, service ownership, prompt, abort, retry, compaction, model, thinking, session resume, diagnostics, and shutdown; pass synthetic engine conformance fixtures.
- [ ] 2.2 Map Pi events, state snapshots, and commands into versioned AddOne-owned view models without exposing Pi types above the adapter; pass event sequencing, malformed-event, snapshot, command-correlation, cancellation, and cleanup tests.
- [ ] 2.3 Implement bounded event queues, backpressure, error mapping, restart reconciliation, and terminal cleanup so one engine failure cannot corrupt AddOne UI state; pass high-rate and failure-isolation tests.
- [ ] 2.4 Add Pi-upgrade conformance suites for SDK construction, service creation, event shape, command behavior, public component constructor/render contracts, and adapter mapping; prove failures remain contained at adapters.

## 3. Build the AddOne Terminal UI Runtime

- [ ] 3.1 Implement the AddOne-owned fullscreen terminal runtime with raw input normalization, focus routing, component invalidation, coalesced rendering, width-safe sanitized output, overlays, terminal resize, synchronized updates where supported, and restoration on exit; pass focused terminal-runtime tests.
- [ ] 3.2 Implement append-only transcript history with explicit live and finalized block boundaries, render caching, resize-safe repainting, selection-safe output, and bounded frame scheduling; pass streaming, long-output, Unicode, alternate-content, resize, and regression fixtures.
- [ ] 3.3 Implement the owned prompt editor with text and IME input, queued submissions, paste, selection, clipboard, keyboard bindings, focus, cancellation, and terminal-restoration behavior; pass editor property and interaction tests.
- [ ] 3.4 Implement status, header/footer, notifications, dialogs, selectors, command surface, and diagnostics as AddOne-owned components connected through view models; pass rendering and state-transition fixtures.

## 4. Deliver the Vanilla-Style Fullscreen Session

- [ ] 4.1 Implement transcript and streaming presentation for user, assistant, thinking, tool-call, tool-result, retry, compaction, error, and system blocks using AddOne view models; pass deterministic streaming and resize fixtures.
- [ ] 4.2 Adapt documented public Pi components where their contracts are independently usable and add provenance-recorded MIT-licensed ports only for surfaces that require AddOne ownership; pass component conformance and attribution/provenance policy tests.
- [ ] 4.3 Wire prompt, abort, retry, compaction, model, thinking, session creation, session resume, settings, and shutdown workflows through the engine adapter; pass command/state integration fixtures with a synthetic engine.
- [ ] 4.4 Add the explicitly selected owned-UI development launch path without changing bare transparent AddOne, `a1 pi`, or `a1 sandbox`; pass CLI routing, alias, profile, startup, and rollback tests.

## 5. Add Customization and Diagnostics Foundation

- [ ] 5.1 Implement versioned AddOne slots for themes, transcript blocks, tool cards, editor, status surfaces, commands, selectors, overlays, and future layout composition; pass registration, precedence, isolation, and invalid-slot tests.
- [ ] 5.2 Add a vanilla-style preset and prove customizations resolve without mutating installed Pi code or depending on Pi's stock extension UI context; pass preset replacement and rollback fixtures.
- [ ] 5.3 Support public-SDK non-visual Pi resources through the adapter where available and define unavailable visual-extension behavior; pass resource-discovery, diagnostics, and no-partial-capability fixtures.
- [ ] 5.4 Add bounded logging, redaction, diagnostics capture, CPU/memory/frame observations, and terminal-restoration failure reporting without exporting raw engine payloads through UI controls; pass diagnostics policy tests.

## 6. Accept the Base UI Before Multi-Agent Tabs

- [ ] 6.1 Run complete automated gates: build, typecheck, tests, architecture, adapter conformance, terminal runtime, transcript, editor, input, clipboard, resize, lifecycle, resource, packaging, audit, and strict OpenSpec validation; preserve machine-readable evidence.
- [ ] 6.2 Run user-controlled manual base-UX acceptance for the exact development artifact: prompt and streaming, tools, editor and queued input, abort/retry/compaction, model and thinking controls, session resume, settings, clipboard, selection, resize, shutdown, and comparison against `a1 pi`; record exact commit and package identity.
- [ ] 6.3 Correct every manual finding, rerun focused and containing gates, and mark the base UI accepted only when all baseline workflows pass.
- [ ] 6.4 Merge the accepted slice through `develop` and publish a unique `-dev.N` package under npm `next` as an explicitly selected owned-UI development path, with structured tabs and composed terminal behavior disabled and no stable support claim; keep `latest` unchanged and verify registry/package integrity.

## 7. Handoff to Multi-Agent Workspace

- [ ] 7.1 Record evidence that the AddOne-owned UI contracts are composable for future structured tabs without initializing the terminal host or creating PTYs.
- [ ] 7.2 Update the existing multi-agent milestone evidence to identify this change as satisfying its task 5.4 prerequisite only after all base gates pass; do not begin structured tabs or section 6 of that milestone before this acceptance.

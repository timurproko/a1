## 1. Establish the Milestone and Contracts

- [ ] 1.1 Create `milestone/multi-agent-workspace` from clean `develop`, record exact baseline package/tag/profile evidence, and pass build, architecture, release, and strict OpenSpec gates without desktop automation.
- [ ] 1.2 Define dependency-free workspace identity, lifecycle, capability, command, event, snapshot, terminal-tab, and recovery contracts; pass compatibility and invalid-contract fixtures.
- [ ] 1.3 Extend architecture governance with owners and dependency directions for workspace, structured adapters, terminal core, platform PTYs, rendering/input, and certification; reject terminal-to-structured inference and foundation-to-feature imports.
- [ ] 1.4 Design versioned control-store migrations for workspace/agent/tab identity, lifecycle, capability negotiation, bounded recovery references, and rollback metadata; pass forward, restart, rollback, and interrupted-migration tests.
- [ ] 1.5 Add resource-budget and data-classification policy for events, snapshots, attachments, terminal models, scrollback, environment credentials, authentication, logs, and diagnostics; pass repository policy tests.

## 2. Build the Structured Agent Runtime

- [ ] 2.1 Implement protocol handshake and capability negotiation with version, identity, commands, event types, snapshot/resume, cancellation, attachments, and flow-control limits; pass valid/incompatible adapter tests.
- [ ] 2.2 Implement validated ordered event reduction and authoritative snapshot replacement without terminal parsing; pass duplicate, gap, malformed, oversized, and resynchronization tests.
- [ ] 2.3 Implement correlated command lifecycle, cancellation races, timeout, idempotent terminal outcomes, and per-agent concurrency limits; pass deterministic state-machine/property tests.
- [ ] 2.4 Implement bounded backpressure for events, commands, snapshots, attachments, and reconnect replay so one adapter cannot block or exhaust others; pass high-rate and memory-budget fixtures.
- [ ] 2.5 Implement ownership-proven structured reconnection and non-reconnectable termination semantics; pass stale token, process mismatch, version mismatch, replay, and snapshot recovery tests.
- [ ] 2.6 Add a synthetic structured adapter and hermetic integration harness covering two concurrent agents, independent commands/state, crash isolation, restart, reconnection, and cleanup.

## 3. Build the Multi-Agent Workspace

- [ ] 3.1 Implement durable create, unique label, select, rename, stop, restart, remove, unread activity, attention, and failure state over stable agent identities; pass reducer and storage integration tests.
- [ ] 3.2 Implement capability-gated workspace actions that keep structured/RPC and terminal-backed semantics disjoint; prove no structured feature derives from ANSI text, timing, or terminal content.
- [ ] 3.3 Implement a single ordered selection/input/command router so switching cannot cross-route interaction; pass race/property tests with concurrent activity and agent removal.
- [ ] 3.4 Implement workspace process restart reconciliation, verified ownership cleanup, degraded/discontinuous states, and rollback-readable records; pass abnormal-exit and N-1 update-transition tests.
- [ ] 3.5 Build the initial AddOne-owned workspace presentation for multiple synthetic structured agents with bounded rendering and no physical-terminal automation; pass snapshot/model and accessibility-oriented interaction tests.

## 4. Build the Composed Terminal Core

- [ ] 4.1 Select and document standards/dependency compatibility levels for parser, Unicode width, terminal queries, renderer, and platform PTYs; add only root-pinned dependencies and pass package/deprecation/license gates.
- [ ] 4.2 Implement deterministic incremental terminal parsing and retained models for cells, cursor, attributes, Unicode graphemes, alternate screen, scroll regions, modes, hyperlinks, synchronized output, and damage tracking; pass fragmentation, corpus, fuzz, and differential fixtures.
- [ ] 4.3 Implement bounded scrollback/model compaction and inactive-tab output processing with explicit backpressure/pause/termination outcomes; pass noisy-background and global-budget tests.
- [ ] 4.4 Implement terminal query responses and mode-aware keyboard, text, paste, focus, mouse, wheel, and resize encoding without executable-specific branches; pass protocol and application-independent fixtures.
- [ ] 4.5 Implement AddOne-owned viewport clipping, overlays, selection, clipboard transfer, damage rendering, and selected/inactive surface switching; pass deterministic model-render and cross-tab isolation tests.
- [ ] 4.6 Prove parser/model/input failures remain scoped by tab identity and that malformed or adversarial streams cannot mutate other tabs; pass fuzz, resource-exhaustion, and isolation suites.

## 5. Build Platform PTY and Lifecycle Adapters

- [ ] 5.1 Implement the Windows ConPTY adapter for exact command launch, environment/cwd, process-tree identity, ordered I/O, resize, stop, and handle cleanup; pass hermetic native fixtures without desktop input.
- [ ] 5.2 Implement Unix PTY adapters for Linux and macOS with controlling-terminal/session semantics, exact process ownership, resize, signals, wait status, and cleanup; pass platform-native fixtures on isolated runners.
- [ ] 5.3 Integrate platform adapters with one application-agnostic composed-tab lifecycle and reject unavailable capabilities rather than adding executable-specific fallbacks; pass shells/editors/pagers/fullscreen fixture matrices.
- [ ] 5.4 Implement authoritative composed reconnection requiring process, PTY channel, stream position, parser state, dimensions, and retained model; pass success, partial-authority refusal, replay, and cleanup tests.
- [ ] 5.5 Integrate composed tabs into workspace identity, switching, status, stop/remove, resource budgets, and diagnostics behind a development-only capability flag; pass concurrent structured-plus-terminal integration tests.

## 6. Preserve Explicit Transparent Modes and Cut Over Bare AddOne

- [ ] 6.1 Add regression gates proving `a1 pi` remains vanilla `~/.pi/agent`, `a1 sandbox` remains `~/.a1/sandbox` with project resources untrusted, and both retain transparent direct attachment without composed interception.
- [ ] 6.2 Keep transparent direct attachment available as an explicit fallback/comparison capability and prove its control protocol carries no terminal bytes or retained display state.
- [ ] 6.3 Cut bare `a1`/`addone` over to workspace startup and reconciliation while maintenance commands and unknown-command behavior remain unchanged; pass both-alias CLI, bootstrap, cohort, update, and rollback gates.
- [ ] 6.4 Add bounded migration/rollback behavior that restores the accepted bare transparent profile if workspace cutover fails while preserving versioned records for retry; pass interrupted activation and N-1 package transitions.
- [ ] 6.5 Rewrite user and architecture documentation for workspace operations, structured versus terminal-backed agents, explicit modes, resource limits, reconnection discontinuity, sandbox terminology, and support/certification status.

## 7. Certify and Release

- [ ] 7.1 Run complete clean automated gates: build, typecheck, ownership/hygiene, dependencies, protocol/state properties, parser corpus/fuzz/differential tests, workspace integration, PTY fixtures, updates, package contents, audit, and strict OpenSpec validation; preserve machine-readable evidence.
- [ ] 7.2 Define generic physical workloads and signed evidence schemas for rendering, Unicode, cursor/modes, rapid input, paste, mouse, selection/clipboard, resize, inactive output, switching, exit, reconnection, and parent recovery without naming a target CLI.
- [ ] 7.3 Run physical automation only on attested isolated disposable Windows, Linux, and macOS workers with exact packaged bytes; record per-platform verdicts and never launch/focus/drive/resize/close terminals on an active workstation.
- [ ] 7.4 Provide user-controlled manual commands for bare workspace, concurrent structured agents, arbitrary CLI tabs, `a1 pi`, and `a1 sandbox`; correct every finding with focused and containing regression gates and bind acceptance to exact candidate bytes.
- [ ] 7.5 Publish an accepted unique development candidate to npm `next` only under uncertified-preview policy, keep `latest` unchanged, and state per-platform composed certification precisely.
- [ ] 7.6 Promote stable composed support only after all mandatory exact-package platform certifications pass, sync specs, archive the change, merge through `develop` to `master`, tag the matching version, publish `latest`, and verify registry integrity.

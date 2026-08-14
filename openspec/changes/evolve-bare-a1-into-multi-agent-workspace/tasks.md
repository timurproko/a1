## 1. Establish the Milestone and Contracts

- [x] 1.1 Create `milestone/multi-agent-workspace` from clean `develop`, record exact baseline package/tag/profile evidence, and pass build, architecture, release, and strict OpenSpec gates without desktop automation.
- [x] 1.2 Define dependency-free workspace identity, lifecycle, capability, command, event, snapshot, terminal window/tab/pane/session, topology-revision, native-host, and recovery contracts; pass compatibility and invalid-contract fixtures.
- [x] 1.3 Extend architecture governance with owners and dependency directions for workspace, structured adapters, native-host protocol, native packaging, certification, and transparent terminal; reject terminal-to-structured inference, terminal-byte transport through Node, foundation-to-feature imports, and explicit-mode imports of composed infrastructure.
- [x] 1.4 Design versioned control-store migrations for workspace/agent/tab/pane/session identity, lifecycle, capability negotiation, host/topology revisions, bounded recovery references, and rollback metadata; pass forward, restart, rollback, and interrupted-migration tests.
- [x] 1.5 Add resource-budget and data-classification policy for events, snapshots, attachments, native-host messages, terminal metadata, environment credentials, authentication, logs, diagnostics, and proof evidence; pass repository policy tests.

## 2. Build the Structured Agent Runtime Independently

- [x] 2.1 Implement protocol handshake and capability negotiation with version, identity, commands, event types, snapshot/resume, cancellation, attachments, and flow-control limits; pass valid/incompatible adapter tests.
- [x] 2.2 Implement validated ordered event reduction and authoritative snapshot replacement without terminal parsing; pass duplicate, gap, malformed, oversized, and resynchronization tests.
- [x] 2.3 Implement correlated command lifecycle, cancellation races, timeout, idempotent terminal outcomes, and per-agent concurrency limits; pass deterministic state-machine/property tests.
- [x] 2.4 Implement bounded backpressure for events, commands, snapshots, attachments, and reconnect replay so one adapter cannot block or exhaust others; pass high-rate and memory-budget fixtures.
- [x] 2.5 Implement ownership-proven structured reconnection and non-reconnectable termination semantics; pass stale-token, process-mismatch, version-mismatch, replay, and snapshot-recovery tests.
- [x] 2.6 Add a synthetic structured adapter and hermetic integration harness covering two concurrent agents, independent commands/state, crash isolation, restart, reconnection, and cleanup.

## 3. Build the Structured Multi-Agent Workspace Slice

- [x] 3.1 Implement durable create, unique label, select, rename, stop, restart, remove, unread activity, attention, and failure state over stable agent identities; pass reducer and storage integration tests.
- [x] 3.2 Implement capability-gated workspace actions that keep structured and composed-terminal semantics disjoint; prove no structured feature derives from ANSI text, timing, terminal content, or native-host availability.
- [x] 3.3 Implement a single ordered structured selection/command router so switching cannot cross-route commands; pass race/property tests with concurrent activity and agent removal.
- [ ] 3.4 Implement workspace process restart reconciliation, verified ownership cleanup, degraded/discontinuous states, and rollback-readable records; pass abnormal-exit and N-1 update-transition tests.
- [ ] 3.5 Build a bounded initial workspace presentation for multiple synthetic structured agents with no composed dependency or physical-terminal automation; pass snapshot/model and accessibility-oriented interaction tests.

## 4. Prepare the Native-Host Proof

- [ ] 4.1 Record the exact Winghostty and Ghostty revisions selected for the Windows proof, their MIT licensing/notices, retained versus adapted components, patch policy, build prerequisites, and reproducible artifact manifest; pass license, provenance, and clean-build checks.
- [ ] 4.2 Define a minimal versioned local proof protocol for host handshake/build identity, durable IDs, fixed 2×2 creation, exact argv/cwd/environment launch, focus, topology snapshot, process exit, shutdown, diagnostics, and bounded failure outcomes; pass codec, version, size, timeout, stale-revision, and malformed-message tests.
- [ ] 4.3 Add executable architecture checks proving pseudoterminal bytes, per-event child input, and rendered cells cannot enter AddOne's Node protocol and proving `a1 pi` and `a1 sandbox` cannot import, initialize, launch, or connect to the native host.
- [ ] 4.4 Define objective Windows spike workloads and evidence schema for four concurrent sessions, input routing, Unicode/cursor/modes, alternate screen, paste, mouse, IME, live resize, DPI, high-rate output, abnormal exits, host cleanup, latency observations, paint diagnostics, and CPU/GPU/memory observations; validate the evidence schema with incomplete and contradictory fixtures.
- [ ] 4.5 Define the proof's stop/go policy and acceptance record: technical gates plus exact-artifact user-controlled manual or isolated-worker physical verdict are mandatory, failed criteria cannot be waived for merge, and structured work remains independently usable; pass repository policy tests.

## 5. Implement the Isolated Windows 2×2 Spike

- [ ] 5.1 Build a minimal AddOne-owned Windows native-host executable from pinned Winghostty/Ghostty sources that opens one native window and owns its Win32 event, renderer, and lifecycle loops; pass a non-interactive build, version/provenance inspection, and process start/clean-shutdown harness on an isolated worker.
- [ ] 5.2 Implement one tab with a fixed revisioned 2×2 split tree, four durable AddOne pane mappings, and four independently ConPTY-backed Ghostty terminal surfaces; pass topology, exact-command, environment/cwd, independent-process, resize, and cleanup integration fixtures.
- [ ] 5.3 Preserve Winghostty/Ghostty native hot paths for PTY output, retained terminal state, OpenGL presentation, keyboard/text/mouse/IME encoding, clipboard, and selection without Node relay; pass static boundary checks and native instrumentation showing four isolated stream/input identities.
- [ ] 5.4 Exercise simultaneous high-rate output, rapid focus/input switching, alternate-screen applications, Unicode, cursor/modes, paste, mouse reporting, IME, live resize, per-monitor DPI, one-pane abnormal exit, and native-host abnormal exit; record all required machine-readable measurements and diagnostics against the exact artifact.
- [ ] 5.5 Run automated spike workloads only on an isolated worker and obtain a user-controlled manual verdict or attested disposable-worker physical verdict for the exact artifact; never launch, focus, drive, resize, or close terminal applications on the active workstation through automation.
- [ ] 5.6 Apply the stop/go gate: if every mandatory result is accepted, record permission to begin production composed integration; otherwise record the failed evidence, stop that integration path for redesign, and keep the milestone unmergeable without weakening criteria.

## 6. Finalize the Native-Host Architecture After Proof

- [ ] 6.1 After proof acceptance only, finalize and document source-ingestion/fork synchronization, platform-host boundaries, protocol ownership, optional platform-package layout, signing, license notices, compatibility policy, and update rollback; pass package-policy and provenance review gates.
- [ ] 6.2 Expand the proof protocol into the production bounded local protocol with authenticated endpoint ownership, correlation IDs, expected revisions, idempotent outcomes, atomic topology mutations, event subscriptions, complete snapshots, and host capability negotiation; pass concurrency, stale-request, disconnect, malformed-client, and incompatible-host tests.
- [ ] 6.3 Implement authoritative Windows window/tab/split/pane/session lifecycle over the proven native runtime, including arbitrary valid layouts and exact command launch without shell interpretation; pass topology property tests and generic shell/editor/pager/fullscreen fixtures.
- [ ] 6.4 Implement pane-scoped resource budgets, visible-grid rendering, hidden-tab retention policy, diagnostics, and failure isolation without executable-specific branches; pass noisy-background, malformed-stream, renderer-failure, and global-budget tests.
- [ ] 6.5 Implement native-host reconnection requiring compatible build/protocol identity, durable mappings, topology revision, PTY/process ownership, dimensions, and retained terminal state; pass successful reconnect, stale host, partial-authority refusal, host loss, and cleanup tests.
- [ ] 6.6 Package and verify the Windows host as an integrity-bound platform artifact selected by AddOne without loading native graphics or PTY code into Node; pass install, missing-host, tampered-host, incompatible-host, update, rollback, and package-content gates.

## 7. Integrate Accepted Composed Panes with the Workspace

- [ ] 7.1 Integrate composed tab/pane/session identities, topology snapshots, selection, status, stop/remove, resource outcomes, and diagnostics behind a development-only capability flag; pass concurrent structured-plus-composed integration tests.
- [ ] 7.2 Route composed pane focus and control intents through revisioned host commands while leaving native terminal input in the host; pass focus/removal/topology races and prove no cross-pane command or input delivery.
- [ ] 7.3 Isolate native-host crash, incompatibility, and discontinuity from structured agents and workspace storage; pass host-kill, restart, downgrade, corrupted-snapshot, and bounded-cleanup tests.
- [ ] 7.4 Build the composed workspace presentation over authoritative host snapshots without painting terminal cells in Node; pass deterministic topology/status rendering, accessibility semantics, and unavailable-capability behavior.
- [ ] 7.5 Add user-facing diagnostics and recovery choices that distinguish host reconnect, visual discontinuity, process exit, unsupported platform, and transparent fallback without claiming screen reconstruction.

## 8. Preserve Explicit Transparent Modes and Cut Over Bare AddOne

- [ ] 8.1 Add regression gates proving `a1 pi` remains vanilla `~/.pi/agent`, `a1 sandbox` remains `~/.a1/sandbox` with project resources untrusted, and both retain transparent direct attachment without starting, connecting to, importing, or initializing composed native-host code.
- [ ] 8.2 Keep transparent direct attachment available as an explicit fallback/comparison capability and prove its control protocol carries no terminal bytes, retained display state, host topology, or native-host dependency.
- [ ] 8.3 Cut bare `a1`/`addone` over to workspace startup and reconciliation only after structured workspace and accepted composed-host recovery gates pass; keep maintenance commands and unknown-command behavior unchanged and pass both-alias CLI, bootstrap, cohort, update, and rollback gates.
- [ ] 8.4 Add bounded migration/rollback behavior that disables composed capability independently and restores the accepted bare transparent profile if workspace cutover fails while preserving versioned records for retry; pass interrupted activation and N-1 package transitions.
- [ ] 8.5 Rewrite user and architecture documentation for workspace operations, structured versus terminal-backed agents, native-host authority, tabs versus panes, explicit modes, resource limits, reconnection discontinuity, sandbox terminology, proof evidence, and support/certification status.

## 9. Add macOS and Linux Native Hosts

- [ ] 9.1 Derive a macOS AddOne native host from the pinned upstream Ghostty AppKit/Metal runtime while preserving the platform-neutral protocol and native hot-path invariant; pass isolated native build, topology, PTY, input, rendering, lifecycle, and package gates.
- [ ] 9.2 Derive a Linux AddOne native host from the pinned upstream Ghostty GTK/native renderer runtime while preserving the platform-neutral protocol and native hot-path invariant; pass isolated native build, topology, PTY, input, rendering, lifecycle, and package gates.
- [ ] 9.3 Run equivalent isolated 2×2 technical and physical proof gates for each platform before enabling its composed capability or support claim; record exact artifacts and do not infer parity from Windows acceptance.
- [ ] 9.4 Verify protocol conformance and observable workspace semantics across Windows, macOS, and Linux while permitting native platform rendering/input implementations; reject platform-specific semantic drift at the AddOne protocol boundary.

## 10. Certify and Release

- [ ] 10.1 Run complete clean automated gates: build, typecheck, ownership/hygiene, dependencies, structured protocol/state properties, native-host protocol/topology/isolation, workspace integration, updates, package contents, audit, and strict OpenSpec validation; preserve machine-readable evidence.
- [ ] 10.2 Define final generic physical workloads and signed evidence schemas for rendering, Unicode, cursor/modes, rapid input, paste, mouse, selection/clipboard, IME, resize/DPI, concurrent visible output, hidden-tab output, switching, exit, reconnection, and parent recovery without naming a target CLI.
- [ ] 10.3 Run physical automation only on attested isolated disposable Windows, Linux, and macOS workers with exact packaged bytes; record per-platform verdicts and never launch, focus, drive, resize, or close terminals on an active workstation.
- [ ] 10.4 Provide user-controlled manual commands for bare workspace, concurrent structured agents, a native 2×2 tab, arbitrary CLI panes, `a1 pi`, and `a1 sandbox`; correct every finding with focused and containing regression gates and bind acceptance to exact candidate bytes.
- [ ] 10.5 Merge the milestone into `develop` only after the mandatory Windows proof, automated milestone gates, explicit-mode regressions, and accepted exact-candidate verdict pass; retain unmerged evidence and structured work for redesign if composed proof fails.
- [ ] 10.6 Publish an accepted unique development candidate to npm `next` only under uncertified-preview policy, keep `latest` unchanged, and state per-platform composed certification precisely.
- [ ] 10.7 Promote stable composed support only after all mandatory exact-package platform certifications pass, sync specs, archive the change, merge through `develop` to `master`, tag the matching version, publish `latest`, and verify registry integrity.

## Context

See `proposal.md` for motivation. The accepted baseline routes one foreground Pi process directly to the physical terminal and intentionally owns no screen model. Bare `a1` is reserved for the product workspace; `a1 pi` and `a1 sandbox` are stable explicit transparent modes.

The product requirement is a multi-agent workspace inside terminals the user already owns, such as Windows Terminal, macOS terminals, WezTerm, and similar emulators. A separate native desktop application is not required and is postponed. The first presentation proof must therefore run as a console/fullscreen terminal program inside an existing terminal, not as a Win32/OpenGL window.

Ghostty's application runtimes are not the right first stack for that requirement. The useful Ghostty component is `libghostty-vt`: a portable terminal parser, retained state model, and input-semantics library. It does not provide windows, GPU rendering, tabs, or PTYs. Winghostty's Win32/OpenGL application stack and upstream Ghostty's AppKit/GTK stacks are deferred desktop-app references only.

## Goals / Non-Goals

**Goals:**

- Establish one A1 workspace model that can host structured/RPC agents and terminal-backed panes without conflating their semantics.
- Prove fullscreen and side-by-side terminal presentation inside an existing terminal before investing in any desktop application shell.
- Keep the latency-sensitive terminal byte, input, rendering, and presentation path inside an A1-owned terminal host.
- Reuse mature terminal parsing/state/input components instead of recreating VT semantics.
- Give A1 typed, revisioned control over durable identity, requested topology, lifecycle, status, and recovery without making Node a terminal relay.
- Validate four-pane latency, flicker, resize, input, resource use, and cleanup before product integration.
- Preserve transparent direct attachment unchanged for explicit Pi modes and fallback comparison.
- Dispose of the fixed multipane proof presentation after its verdict and restore a one-session fullscreen checkpoint before any product composition work.
- Require a separately accepted A1-owned Pi UI foundation, using Pi as a public-SDK engine, before structured multi-agent tabs; separately require the isolated composed proof before arbitrary terminal panes, split layouts, or multiplexer presentation.
- Produce exact-artifact evidence tied to source revisions, platform, measurements, diagnostics, and physical/manual verdicts.

**Non-Goals:**

- Building or requiring a native Windows, macOS, or Linux desktop application for the initial composed workspace.
- Using Ghostty's GUI application or Winghostty's Win32/OpenGL runtime for the in-terminal proof.
- Integrating Herdr or another external multiplexer as A1's product architecture.
- Screen-scraping Pi or another CLI to manufacture structured semantics.
- Building a new lightweight ANSI parser, terminal-state tracker, or native-input translator.
- Routing pseudoterminal bytes, individual child input events, or rendered cells through Node or A1's control protocol.
- Treating profile isolation, terminal-host process separation, or panes as an OS security sandbox.
- Running desktop automation on a developer's active workstation.
- Claiming composed support on any platform before its exact packaged artifact passes required certification.
- Replacing `a1 pi` or `a1 sandbox` with workspace aliases or composed-host paths.
- Treating Pi's stock `InteractiveMode`, extension surfaces, prototypes, private renderer state, deep imports, or distribution hashes as the customizable A1 root UI.
- Requiring automatic source-level synchronization with every upstream Pi UI change; exact current upstream behavior remains available through `a1 pi`.

## Decisions

### 1. One workspace domain, two disjoint runtime capabilities

The workspace owns durable identity, selection, status, commands, and lifecycle presentation. Each managed agent binds to exactly one primary runtime contract: structured/RPC or composed terminal. Capability negotiation controls available operations.

This prevents a terminal parser from becoming a de facto agent protocol and lets structured adapters expose semantic state without a terminal. A universal stream abstraction was rejected because byte streams cannot safely express correlated commands, snapshots, tool calls, or resumable event positions.

### 2. Structured adapters use versioned messages and snapshots

Adapters communicate through dependency-free versioned contracts with bounded typed envelopes, monotonic event positions, correlation IDs, explicit cancellation, negotiated flow control, and snapshot/resume semantics. Transport identity must bind to the durable agent and verified process ownership.

A log-only event stream was rejected because compaction, restart, and event gaps require an authoritative recovery boundary. Unbounded event retention was rejected for availability reasons.

### 3. Composed panes use an A1-owned terminal-hosted runtime

A1 owns a console terminal-host process that runs inside the user's existing terminal. It uses the current terminal's alternate screen and presents a fullscreen composed workspace. It is not a desktop window and does not create a separate application surface.

The host owns:

- platform PTY/ConPTY sessions;
- child process trees;
- retained terminal models;
- host keyboard, text, paste, mouse, focus, and resize input;
- workspace shortcut arbitration;
- pane layout and final frame composition;
- writes to the outer terminal;
- clean terminal restoration.

The preferred reusable terminal-core stack is deliberately small:

- `libghostty-vt` for terminal parsing, retained state, and input encoding semantics;
- `portable-pty` or an equivalently proven PTY implementation for process sessions;
- Crossterm or an equivalently proven terminal input/raw-mode layer;
- a buffered A1-owned frame composer, with Ratatui evaluated only if it reduces risk without adding unnecessary behavior.

The full Ghostty GUI application, Winghostty Win32 runtime, Metal, GTK, and OpenGL are excluded from this proof. Herdr is not a dependency or product host.

### 4. The terminal host owns the terminal hot path

For composed panes, the host directly owns:

```text
outer terminal input -> host arbitration -> terminal encoding -> pane PTY
pane PTY output -> terminal model -> frame composer -> outer terminal
```

A1's Node control plane never transports terminal output, per-keystroke child input, or rendered cells. It exchanges only bounded typed control messages and receives semantic host events. This invariant is enforced by contracts, module boundaries, and repository tests.

Transparent direct attachment is an entirely separate path and never initializes or connects to the terminal host.

### 5. Presentation ownership is split by semantic authority

A1's Node workspace remains authoritative for durable agent identity, requested workspace state, persistence, and recovery policy. The terminal host is authoritative for live window/tab/split topology, focus, pane resources, frame scheduling, and terminal presentation.

The host may draw pane borders, titles, focus indicators, and status from typed workspace snapshots. It does not send child cells back to Node. The existing bounded workspace presentation model remains useful for state and accessibility semantics, but final composed presentation is rendered by the host.

### 6. Tabs, panes, and terminal sessions are distinct

A workspace window contains tabs. A tab contains a revisioned split tree. Each leaf pane references one terminal session, and each terminal session owns one PTY/process tree and retained terminal state. A 2×2 tab therefore has four pane identities and four terminal sessions.

Durable A1 IDs are provided during creation and echoed by the host. Native surface, PTY, parser, and renderer identifiers remain host implementation details.

### 7. Live topology has one revisioned authority

The terminal host is authoritative for live tabs, split trees, focus, panes, and terminal sessions. A1 persists desired workspace identity and recovery metadata but does not concurrently mutate a shadow live tree.

Mutations use an expected-revision protocol:

```text
ApplyMutation(expected revision, durable IDs, intent)
                       |
                       v
        atomic host commit or stale rejection
                       |
                       v
       TopologyChanged(new revision, snapshot)
```

Partial mutation and polling-based reconciliation are rejected.

### 8. The local control protocol is typed, bounded, and reconnectable

The versioned local protocol includes:

- handshake, host build identity, protocol compatibility, and capabilities;
- create session, attach pane, apply layout, focus, close, and shutdown commands;
- expected revisions, correlation IDs, durable A1 IDs, exact argv, cwd, and selected environment entries;
- authoritative topology snapshots;
- pane-ready, focus, layout, title, working-directory, process-exit, pane-close, resource, and host-degraded events;
- bounded payloads, timeouts, idempotent outcomes, and authenticated local endpoint ownership.

Terminal-session launch accepts executable and argument vectors without shell interpretation. Reconnection requires compatible host identity, authoritative mappings, retained terminal state, and verified PTY/process ownership. Logs are never used to reconstruct a screen.

### 9. The in-terminal 2×2 proof is the mandatory stop/go gate

Before product composed integration, the milestone implements only enough terminal host to prove:

- one fullscreen composed surface inside an existing terminal;
- one tab with a fixed 2×2 split tree;
- four independent PTY/process trees and terminal models;
- concurrent high-rate output;
- rapid focus/input switching with no cross-routing;
- resize and terminal-size changes;
- text, paste, IME where supported, mouse reporting, alternate screen, Unicode, and cursor behavior;
- independent abnormal pane exit and complete host cleanup;
- no terminal-byte or input relay through A1.

The proof records pinned source revisions, exact artifact hashes, build provenance, input-to-process and output-to-present measurements, frame diagnostics, CPU/memory observations, cleanup outcomes, and workload results.

Technical success alone is insufficient. The exact artifact also needs a user-controlled manual verdict or isolated disposable-worker physical verdict. No terminal is launched or automated on the active workstation by the agent. If acceptance fails, composed integration stops; criteria are not weakened to permit merge, and this change does not continue investing in custom rendering/input remediation or a desktop-app fallback. Structured work may continue independently.

### 10. Rendering must be frame-scheduled and damage-aware

The host uses one frame scheduler. Child output updates retained models immediately, while visible presentation is coalesced into bounded frames. The composer prefers incremental damage, preserves cursor and alternate-screen state, uses synchronized terminal updates when available, and avoids full-screen repaints unless layout or terminal state requires one.

Resize first recalculates the complete layout, then resizes PTYs and models in a documented order, then performs a settle repaint. The host must record paint gaps and missed frames rather than relying only on visual judgment.

### 11. Inactive surfaces remain authoritative but bounded

Visible non-focused grid panes continue rendering independently. Panes hidden in inactive tabs remain live and parsed without painting unless their explicit policy says otherwise. Per-pane byte, terminal-state, scrollback, CPU-observation, and queued-control budgets drive documented compaction, backpressure, pause, or termination outcomes.

Stopping every hidden process was rejected because it breaks arbitrary CLIs. Unlimited retention was rejected because one noisy pane could exhaust the workspace.

### 12. Storage records metadata, not accidental secrets or terminal streams

The root control store records workspace/agent/tab/pane identities, negotiated versions, lifecycle transitions, topology revisions, bounded recovery references, and evidence. Authentication remains owned by the selected agent/profile. Raw terminal history, PTY streams, environment credentials, and arbitrary structured attachments are not persisted unless a separately typed policy permits bounded encrypted storage.

### 13. Packaging pins and isolates console host provenance

Terminal hosts are distributed as platform-specific, integrity-verified console executables. The root manifest remains dependency authority. Every host artifact records its A1 protocol version and pinned component/source revisions. Licenses and notices are included, and updates reject incompatible or unverified hosts.

A separate desktop-native host can be reconsidered only after the in-terminal architecture is accepted. It is not required for macOS, Linux, Windows Terminal, WezTerm, or other user-owned terminal workflows.

### 14. Delivery is split, capability-flagged, and reversible

Structured contracts, adapters, and workspace behavior may proceed independently. Composed work remains a development-only capability through the in-terminal proof and subsequent per-platform integration. Bare `a1` changes only after workspace recovery and explicit-mode regression gates pass. Composed failure cannot remove transparent fallback.

Rollback disables workspace cutover or composed capability as applicable, restores the accepted bare transparent profile when necessary, and preserves backward-readable versioned records. `a1 pi` and `a1 sandbox` remain unchanged throughout.

### 15. The fixed 2×2 presentation is preserved only as a postponed proof artifact

The 2×2 split tree, fixed geometry, and dashed pane chrome exist only to expose four simultaneous terminal sessions to the exact-artifact proof gates. They are not an initial product layout and SHALL NOT become the basis of structured agent tabs, product splits, or customization.

After task 5.3 establishes native hot-path isolation, remaining automated stress and physical acceptance may be postponed while the owned fullscreen UI and structured-agent tabs are implemented. During that interval the proof path remains development-only, composed capability remains disabled in normal A1 use, and no arbitrary CLI pane, split, composed merge, or composed release claim is permitted. An independently accepted owned-UI and structured-tab slice may still merge through `develop` and publish under npm `next` because it does not package, launch, or connect to the terminal host.

After task 5.10 records the resumed isolated-worker verdict, the proof presentation is removed from the shipping path and the terminal host returns to one fullscreen session. Accepted evidence remains immutable and refers to the exact historical artifact. Production multiplexer integration then continues separately only if the proof passes.

### 16. A1 owns the customizable Pi UI while Pi remains the agent engine

The production bare-`a1` interface uses this boundary:

```text
A1-owned fullscreen UI
  -> A1 view state, reducers, input, focus, composition, and customization slots
  -> PiEngineAdapter using documented public SDK entry points
  -> Pi AgentSessionRuntime and services
```

The A1 root SHALL NOT instantiate or patch Pi's stock `InteractiveMode`. Pi SDK and UI types remain inside narrow adapters; A1-owned dependency-free commands, events, snapshots, and view models cross into the workspace and presentation layers. Engine upgrades therefore require adapter conformance work rather than workspace-wide architectural refactoring.

Vanilla-first delivery does not require redrawing every Pi component. A1 may wrap documented root-package exports such as message, tool, editor, footer, and selector components behind A1-owned component adapters. Components too coupled to Pi's stock root may be ported from Pi's MIT-licensed source into an A1-owned module with source revision, license, attribution, and local conformance coverage recorded. A1 never patches installed package code, reads private fields, relies on deep imports, or hashes distribution internals to authorize UI behavior.

Exact current upstream Pi remains `a1 pi`. The A1 UI may provide a vanilla-style preset, but that preset is an A1-owned composition and does not claim byte-for-byte identity with upstream Pi.

### 17. Fullscreen vanilla-first acceptance precedes customization and composition

The separate owned-UI change first proves one high-quality fullscreen Pi session: transcript and streaming, tool presentation, editor and queued input, abort/retry/compaction, model and thinking controls, session creation/resume, settings, clipboard, resize, diagnostics, and clean shutdown. A vanilla-style preset is the baseline acceptance oracle, and Pi's stock explicit mode remains the comparison path.

Customization is exposed through stable A1 component, theme, command, and layout slots rather than host mutation. Non-visual Pi extensions and resources may be adapted where the public SDK supports them. Visual extension compatibility requires an explicit A1 bridge and SHALL NOT receive implicit access to Pi's absent stock UI context.

The owned UI must first pass fullscreen base-UX and Pi-upgrade conformance with one session. It may then expose multiple structured SDK-backed agents as A1-owned tabs. Those tabs switch semantic agent views; they do not create PTYs, invoke the terminal host, display arbitrary CLI surfaces, or satisfy the composed-terminal proof.

Arbitrary terminal panes, split layouts, and multiplexer integration remain blocked until the postponed isolated-worker 2×2 gate passes. The owned UI is designed as composable views from the start so structured tabs can later coexist with separately certified composed panes without sharing terminal authority.

## Risks / Trade-offs

- **[A terminal-hosted composer still has serious rendering complexity]** → Reuse mature terminal state and input components, keep the frame composer narrow, and prove flicker/latency before product integration.
- **[`libghostty-vt` APIs may evolve]** → Pin exact revisions, isolate integration, record patches, and budget controlled upstream synchronization.
- **[Crossterm/Ratatui choices may not meet input or rendering requirements]** → Evaluate them in the proof and allow a narrow replacement composer without changing workspace contracts.
- **[Four visible PTY-backed panes may contend]** → Make concurrent 2×2 output, resize, frame tracing, latency, and physical acceptance mandatory.
- **[A native sidecar increases build and packaging complexity]** → Keep it console-only, isolate platform artifacts, pin provenance, sign/verify exact bytes, and keep Node free of PTY/VT ABI coupling.
- **[Control and live topology could diverge]** → Make the host authoritative, use expected revisions and complete snapshots, and reject stale mutations atomically.
- **[Input races can target the wrong pane]** → Keep focus and input arbitration in one host ordering domain; never route per-key input through Node.
- **[Background panes consume resources]** → Enforce per-pane and global budgets with explicit visible outcomes.
- **[A malformed stream or renderer failure attacks host availability]** → Scope terminal resources per pane, preserve host diagnostics, isolate the Node control plane, and report discontinuity rather than fabricate recovery.
- **[Physical quality cannot be established hermetically]** → Require exact-artifact manual or isolated-worker acceptance and prohibit active-workstation automation.
- **[The proof may fail]** → Treat failure as useful evidence, stop composed integration, preserve transparent and structured paths, and avoid both custom rendering/input remediation and desktop-app investment.
- **[Owning the UI increases initial implementation scope]** → Start from public Pi components and narrow provenance-recorded ports, establish vanilla-first parity, and replace components incrementally behind stable slots.
- **[Public Pi SDK or component APIs may change]** → Pin release inputs, confine Pi types to adapters, run engine and component conformance suites against upgrade candidates, and keep `a1 pi` as the exact upstream recovery path.
- **[A port can become an accidental permanent fork]** → Port only tightly coupled components, preserve attribution and provenance, accept deliberate local ownership, and synchronize upstream UI changes only when they provide chosen product value.
- **[Extension compatibility could recreate host coupling]** → Support only explicitly mapped public runtime/resource behavior and require an A1-owned bridge for visual extension surfaces.
- **[Postponing the VM gate could let proof code drift while UI work proceeds]** → Freeze composed behavior behind a development-only path, prohibit production dependencies on the fixed grid, and rerun every exact-artifact workload after structured tabs are accepted and before multiplexer work begins.

## Migration Plan

1. Create `milestone/multi-agent-workspace` from clean `develop` and record baseline package/profile/transparent evidence.
2. Add dormant workspace, structured capability, terminal-host protocol, topology, storage, and architecture contracts without changing launch behavior.
3. Build and gate the structured adapter runtime with a synthetic adapter independently of composed work.
4. Record provenance for the narrow terminal-core stack and build a minimal one-pane in-terminal host without a desktop window.
5. Expand to side-by-side panes and then the fixed 2×2 proof inside an existing terminal; establish native hot-path isolation and preserve that development artifact without promoting its presentation.
6. Complete a separate OpenSpec change for the A1-owned Pi UI foundation over the documented public SDK. Reach accepted fullscreen vanilla-first base UX and upgrade conformance with one Pi session.
7. Integrate the existing structured workspace into A1-owned tabs for multiple SDK-backed Pi agents. Prove switching, background activity, lifecycle, failure isolation, recovery, and resource bounds without initializing the terminal host.
8. Cut bare `a1` over to the accepted structured workspace, then merge the independently accepted owned-UI/structured-tab slice through `develop` and publish a clean development checkpoint under npm `next` with composed multipane behavior disabled and no composed support claim.
9. Resume the fixed 2×2 proof on an isolated Windows worker. Record every technical measurement and obtain an accepted user-controlled manual or isolated-worker physical verdict against exact bytes. Do not merge composed work or begin production multiplexer integration if this gate fails.
10. Remove the fixed 2×2 geometry and dashed proof chrome, restore the one-session fullscreen terminal-host path, preserve exact-artifact evidence, and rerun fullscreen and explicit-mode regressions.
11. Finalize component ingestion, protocol, packaging, and platform support for the console host, then implement arbitrary terminal layouts, generic CLI fixtures, bounded reconnection, and exact-package certification through the accepted owned-UI composition boundary.
12. Enable composed surfaces inside the already shipped bare workspace only after composed recovery and capability-disable rollback gates pass.
13. Publish composed previews and stable support only under existing per-platform exact-package policy.
14. Reconsider a separate desktop-native application only as a later optional follow-up after the terminal-hosted product is accepted.

Rollback disables composed capability and workspace cutover independently, restores the accepted transparent bare launch if needed, preserves explicit modes, and leaves versioned records available for a later compatible retry.

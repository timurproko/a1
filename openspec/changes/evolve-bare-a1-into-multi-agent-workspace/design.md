## Context

See `proposal.md` for motivation. The accepted baseline routes one foreground Pi process directly to the physical terminal and intentionally owns no screen model. Bare `a1` is reserved for the product workspace; `a1 pi` and `a1 sandbox` are stable explicit transparent modes.

Repository inspection established that Winghostty provides the closest proven Windows implementation for the desired terminal experience: ConPTY ownership, Ghostty's retained terminal engine and OpenGL renderer, native Win32 input/IME/clipboard handling, tabs, split trees, visibility-aware rendering, and explicit repaint scheduling. Upstream Ghostty provides corresponding native macOS and Linux application runtimes. Both repositories are MIT licensed. Stock Winghostty/Ghostty automation is not sufficient for AddOne because it lacks atomic exact-command pane creation, caller-owned durable identities, complete revisioned topology, lifecycle event subscriptions, and authoritative reconnection. `libghostty-vt` alone does not provide PTYs, GPU rendering, native input, windows, tabs, or panes, while Ghostty's complete embedder API is internal and primarily tailored to macOS.

The composed direction therefore requires proof before product integration. The first mandatory proof is one isolated Windows window containing one tab and four simultaneously visible, independently ConPTY-backed Ghostty surfaces in a 2×2 layout. No composed implementation may merge into `develop` until that exact proof meets technical and physical acceptance. Structured-agent work does not depend on that proof.

## Goals / Non-Goals

**Goals:**

- Establish one AddOne workspace model that can host structured/RPC agents and, only after proof, native terminal-backed panes without conflating their semantics.
- Reuse pinned Ghostty/Winghostty terminal, rendering, input, and PTY implementations rather than rebuilding terminal emulation.
- Keep the latency-sensitive terminal byte, input, rendering, and presentation path entirely native.
- Give AddOne typed, revisioned control over durable identity, requested topology, lifecycle, status, and recovery without making Node a terminal relay.
- Validate four-pane latency, flicker, resize, input, resource use, and cleanup before committing to composed product integration.
- Preserve transparent direct attachment unchanged for explicit Pi modes and fallback comparison.
- Produce exact-artifact evidence tied to source revisions, platform, measurements, diagnostics, and physical verdicts.

**Non-Goals:**

- Screen-scraping Pi or another CLI to manufacture structured semantics.
- Controlling an installed stock Ghostty or Winghostty application as the final product architecture.
- Building a new lightweight ANSI parser, cell renderer, PTY relay, or native-input translator.
- Routing pseudoterminal bytes, individual child input events, or rendered cells through Node or AddOne's control protocol.
- Treating profile isolation, native-host process separation, or terminal tabs as an OS security sandbox.
- Running desktop automation on a developer's active workstation.
- Claiming composed support on any platform before its exact packaged artifact passes required certification.
- Replacing `a1 pi` or `a1 sandbox` with workspace aliases or native-host paths.

## Decisions

### 1. One workspace domain, two disjoint runtime capabilities

The workspace owns durable identity, selection, status, commands, and lifecycle presentation. Each managed agent binds to exactly one primary runtime contract: structured/RPC or composed terminal. Capability negotiation controls available operations.

This prevents a terminal parser from becoming a de facto agent protocol and lets structured adapters expose semantic state without a terminal. A universal stream abstraction was rejected because byte streams cannot safely express correlated commands, snapshots, tool calls, or resumable event positions.

### 2. Structured adapters use versioned messages and snapshots

Adapters communicate through dependency-free versioned contracts with bounded typed envelopes, monotonic event positions, correlation IDs, explicit cancellation, negotiated flow control, and snapshot/resume semantics. Transport identity must bind to the durable agent and verified process ownership.

A log-only event stream was rejected because compaction, restart, and event gaps require an authoritative recovery boundary. Unbounded event retention was rejected for availability reasons.

### 3. Composed terminals use an AddOne-owned native host

AddOne will own and package a separate native terminal-host executable. The host will reuse pinned MIT-licensed Ghostty/Winghostty source implementations:

- Windows: Winghostty-derived Win32 shell, ConPTY lifecycle, Ghostty terminal engine, WGL/OpenGL renderer, and native input/IME/clipboard behavior.
- macOS: Ghostty-derived AppKit/Metal runtime integration.
- Linux: Ghostty-derived GTK/native renderer runtime integration.

The host is AddOne-owned because product requirements need a stable protocol, durable caller identities, exact-command creation, revisioned topology, lifecycle events, and recovery semantics. Automating stock applications was rejected because their existing IPC is too limited and race-prone. `libghostty-vt` plus a new AddOne renderer was rejected because it recreates the most compatibility-sensitive layers.

The separate executable is preferred over a Node native addon because native GUI and renderer event loops retain platform thread affinity, crashes are isolated from the control plane, artifacts can be independently signed and verified, and host restart/reconnection remains possible.

### 4. The native host owns the terminal hot path

For composed panes, the native host directly owns:

```text
OS input -> native arbitration -> Ghostty input encoding -> PTY
PTY output -> Ghostty termio/model -> native renderer -> GPU presentation
```

AddOne's Node control plane never transports terminal output, per-keystroke child input, or rendered cell frames. It exchanges only bounded typed control messages and receives semantic host events. This invariant is enforced by contracts, module boundaries, and repository tests.

Transparent direct attachment is an entirely separate path and never initializes or connects to the native host.

### 5. Tabs, panes, and terminal sessions are distinct

A workspace window contains tabs. A tab contains a revisioned split tree. Each leaf pane references one terminal session, and each terminal session owns one PTY/process tree and retained Ghostty surface. A 2×2 tab therefore has four pane identities and four terminal sessions.

Durable AddOne IDs are provided during creation and echoed by the host. Native surface, HWND, view, renderer, and PTY identifiers remain host implementation details.

This replaces the earlier one-tab/one-PTY assumption, which could not represent a grid correctly.

### 6. Live topology has one revisioned authority

The native host is authoritative for live windows, tabs, split trees, focus, native surfaces, and terminal sessions. AddOne persists desired workspace identity and recovery metadata but does not concurrently mutate a shadow live tree.

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

This adopts Winghostty's strongest topology property—typed deterministic transitions with stale-revision protection—while exposing an AddOne-specific protocol. Partial mutation and polling-based reconciliation are rejected.

### 7. The local control protocol is typed, bounded, and reconnectable

The versioned local protocol includes at least:

- handshake, host build identity, protocol compatibility, and capabilities;
- create window/tab/session, attach pane, apply layout, focus, close, and shutdown commands;
- expected revisions, correlation IDs, durable AddOne IDs, exact argv, cwd, and selected environment entries;
- authoritative topology snapshots;
- pane-ready, focus, layout, title, working-directory, process-exit, pane-close, resource, and host-degraded events;
- bounded payloads, timeouts, idempotent outcomes, and authenticated local endpoint ownership.

Terminal-session launch accepts executable and argument vectors without shell interpretation. Reconnection requires compatible host identity, authoritative mappings, retained terminal state, and verified PTY/process ownership. Logs are never used to reconstruct a screen.

### 8. The Windows 2×2 spike is a mandatory stop/go gate

Before product composed integration, the milestone branch implements only enough native host and test control surface to prove:

- one native window and one tab with a fixed 2×2 split tree;
- four independent ConPTY/process trees and Ghostty surfaces;
- concurrent high-rate output;
- rapid native focus/input switching with no cross-routing;
- resize, live resize, and per-monitor DPI behavior;
- text, paste, IME, mouse reporting, alternate screen, Unicode, and cursor behavior;
- independent abnormal pane exit and complete host cleanup;
- no terminal-byte or input relay through AddOne.

The spike records pinned source commits, exact artifact hashes, build provenance, input-to-PTY and output-to-present measurements where instrumentation permits, frame/paint diagnostics, CPU/GPU/memory observations, cleanup outcomes, and workload results. Winghostty's existing render tracing is reused or extended rather than inferred visually.

Technical success alone is insufficient. The exact artifact also needs a user-controlled manual verdict or isolated disposable-worker physical verdict. No terminal is launched or automated on the active workstation by the agent. If acceptance fails, composed integration stops for redesign; criteria are not weakened to permit merge. Structured work may continue independently.

### 9. Inactive surfaces remain authoritative but bounded

Visible non-focused grid panes continue rendering independently. Panes hidden in inactive tabs remain live and parsed without painting unless their explicit policy says otherwise. Per-pane byte, terminal-state, scrollback, CPU-observation, and queued-control budgets drive documented compaction, backpressure, pause, or termination outcomes.

Stopping every hidden process was rejected because it breaks arbitrary CLIs. Unlimited retention was rejected because one noisy pane could exhaust the workspace.

### 10. Storage records metadata, not accidental secrets or terminal streams

The root control store records workspace/agent/tab/pane identities, negotiated versions, lifecycle transitions, topology revisions, bounded recovery references, and evidence. Authentication remains owned by the selected agent/profile. Raw terminal history, PTY streams, environment credentials, and arbitrary structured attachments are not persisted unless a separately typed policy permits bounded encrypted storage.

### 11. Packaging pins and isolates native provenance

Native hosts are distributed as platform-specific, integrity-verified executables, likely through optional platform npm packages selected by the JavaScript control package. The root manifest remains dependency authority. Every host artifact records its AddOne protocol version and pinned upstream/fork source revisions. Licenses and notices are included, and updates reject incompatible or unverified hosts.

Source ingestion, fork synchronization, signing, and package format are finalized only after the Windows proof passes; the spike must not prematurely establish a permanent vendoring strategy.

### 12. Delivery is split, capability-flagged, and reversible

Structured contracts, adapters, and workspace behavior may proceed independently. Composed work remains a development-only capability through the proof and subsequent per-platform integration. Bare `a1` changes only after workspace recovery and explicit-mode regression gates pass. Composed failure cannot remove transparent fallback.

Rollback disables workspace cutover or composed capability as applicable, restores the accepted bare transparent profile when necessary, and preserves backward-readable versioned records. `a1 pi` and `a1 sandbox` remain unchanged throughout.

## Risks / Trade-offs

- **[Ghostty/Winghostty application internals are not stable external APIs]** → Pin exact revisions, own an explicit integration layer, record patches, run differential/conformance gates, and budget controlled upstream synchronization.
- **[Winghostty is Windows-only and maintained independently]** → Use it as the Windows runtime source, preserve platform-neutral AddOne protocol semantics, and derive macOS/Linux hosts from their proven upstream Ghostty runtimes rather than forcing one GUI toolkit everywhere.
- **[Four visible WGL surfaces may contend or flicker]** → Make concurrent 2×2 output, resize, paint tracing, latency, and physical acceptance mandatory before integration.
- **[A native sidecar increases build and packaging complexity]** → Isolate platform artifacts, pin provenance, sign/verify exact bytes, and keep Node free of graphics and PTY ABI coupling.
- **[Control and native topology could diverge]** → Make the host authoritative, use expected revisions and complete snapshots, and reject stale mutations atomically.
- **[Input races can target the wrong pane]** → Keep native focus and input arbitration in one host ordering domain; never route per-key input through Node.
- **[Background panes consume resources]** → Enforce per-pane and global budgets with explicit visible outcomes.
- **[A malformed stream or renderer failure attacks host availability]** → Scope terminal resources per pane, preserve host diagnostics, isolate the Node control plane, and report discontinuity rather than fabricate recovery.
- **[Physical quality cannot be established hermetically]** → Require exact-artifact manual or isolated-worker acceptance and prohibit active-workstation automation.
- **[The spike may fail]** → Treat failure as useful evidence, stop composed integration, preserve transparent and structured paths, and redesign without merging speculative infrastructure.

## Migration Plan

1. Create `milestone/multi-agent-workspace` from clean `develop` and record baseline package/profile/transparent evidence.
2. Add dormant workspace, structured capability, native-host protocol, topology, storage, and architecture contracts without changing launch behavior.
3. Build and gate the structured adapter runtime with a synthetic adapter independently of composed work.
4. Produce the isolated Windows 2×2 native-host spike from pinned Winghostty/Ghostty sources without routing terminal data through Node.
5. Record exact technical evidence and obtain an accepted manual or isolated-worker physical verdict. Do not merge the milestone or begin production composed integration if this gate fails.
6. After proof acceptance, finalize native source-ingestion, protocol, packaging, and synchronization strategy; then integrate Windows composed panes behind a development capability.
7. Derive and certify macOS and Linux native hosts from their corresponding upstream Ghostty runtimes without broadening claims prematurely.
8. Add workspace UI/lifecycle integration, generic native-host fixtures, bounded reconnection, and exact-package certification.
9. Cut bare `a1` over only after workspace recovery and explicit `pi`/`sandbox` regression gates pass.
10. Publish previews and stable support only under existing per-platform exact-package policy.

Rollback disables composed capability and workspace cutover independently, restores the accepted transparent bare launch if needed, preserves explicit modes, and leaves versioned records available for a later compatible retry.

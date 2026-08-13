## Context

See `proposal.md` for motivation. The accepted baseline routes one foreground Pi process directly to the physical terminal and intentionally owns no screen model. Bare `a1` is reserved for the product workspace; `a1 pi` and `a1 sandbox` are stable explicit transparent modes. Current lifecycle, ownership, immutable-release, and storage foundations can be reused, but neither lifecycle metadata nor a shadow parser can provide terminal continuity.

The implementation spans workspace state, adapter protocols, process supervision, storage, terminal emulation, platform pseudoterminals, rendering/input, packaging, and isolated certification. It therefore proceeds on a milestone branch in independently gated slices.

## Goals / Non-Goals

**Goals:**

- Establish one AddOne workspace model that can host both structured/RPC agents and arbitrary terminal-backed CLIs without conflating their semantics.
- Make identity, authority, routing, failure containment, retention, and reconnection mechanically testable.
- Preserve transparent direct attachment unchanged for explicit Pi modes and fallback comparison.
- Bound memory, output, command, process, and reconnection resources per agent/tab.
- Produce certification evidence tied to platform and exact package integrity.

**Non-Goals:**

- Screen-scraping Pi or another CLI to manufacture structured agent semantics.
- Treating profile isolation or terminal tabs as an OS security sandbox.
- Running desktop automation on a developer's active workstation.
- Claiming stable cross-platform composed-terminal support before every claimed platform passes its own exact-package gates.
- Replacing `a1 pi` or `a1 sandbox` with workspace aliases.

## Decisions

### 1. One workspace domain, two disjoint runtime capabilities

The workspace owns durable identity, selection, status, commands, and lifecycle presentation. Each agent binds to exactly one primary runtime contract: structured/RPC or composed terminal. Capability negotiation controls available operations.

This prevents a terminal parser from becoming a de facto agent protocol and lets structured adapters expose semantic state without a terminal. The alternative—one universal stream abstraction—was rejected because byte streams cannot safely express correlated commands, snapshots, tool calls, or resumable event positions.

### 2. Structured adapters use versioned messages and snapshots

Adapters communicate through dependency-free versioned contracts with bounded typed envelopes, monotonic event positions, correlation IDs, explicit cancellation, negotiated flow control, and snapshot/resume semantics. The control transport can vary by platform or adapter, but transport identity must bind to the durable agent and verified process ownership.

A log-only event stream was rejected because compaction, restart, and event gaps require an authoritative recovery boundary. Unbounded event retention was rejected for availability reasons.

### 3. Composed terminal owns the complete terminal stack

Each terminal tab owns a platform pseudoterminal, process tree, ordered byte channel, parser state, retained terminal model, dimensions, input mode state, selection, and lifecycle record. The selected surface is rendered from that model; inactive models continue or pause according to explicit policy.

A lightweight relay plus shadow parser was rejected: once AddOne switches or overlays surfaces, it must be authoritative for parser state, terminal queries, input encoding, clipping, and repaint. Transparent direct attachment remains separate rather than sharing partial composed machinery.

### 4. Terminal core and platform adapters have strict boundaries

The terminal core owns deterministic parsing, Unicode cells, modes, scrollback policy, damage tracking, selection coordinates, and input encoding. Platform adapters own pseudoterminal creation, native process identity, resize, signal/termination, and handle cleanup. The workspace renderer consumes damage/snapshot interfaces and does not inspect child identity or output content.

Platform branches inside parser/render policy and executable-specific fixes are prohibited. Unsupported generic behavior is reported at capability negotiation.

### 5. Inactive surfaces remain authoritative but bounded

Default composed tabs remain live while inactive; AddOne continues parsing their output without painting it. Per-tab byte, cell, scrollback, event, CPU-observation, and queued-input budgets drive documented backpressure, compaction, pause, or termination outcomes. Input is accepted through a single ordered workspace router keyed by selected identity.

Stopping every inactive process was rejected because it breaks arbitrary CLIs. Unlimited retention was rejected because one noisy tab could exhaust the workspace.

### 6. Reconnection requires all authorities

Structured reconnection requires verified adapter identity plus a valid resume boundary or snapshot. Composed reconnection requires verified process and pseudoterminal ownership plus retained parser/model state and stream position. If any authority is absent, the workspace reports discontinuity and offers bounded cleanup; it never reconstructs a screen from logs.

### 7. Storage records metadata, not accidental secrets or unbounded streams

The root control store records workspace/agent identities, negotiated capability versions, lifecycle transitions, bounded recovery references, and evidence. Authentication remains owned by the selected agent/profile. Raw terminal history, environment credentials, and arbitrary structured attachments are not persisted unless a separately typed policy explicitly permits bounded encrypted storage.

### 8. Testing advances from model to isolated physical certification

Hermetic suites cover protocol compatibility, reducer/state-machine properties, parser fragmentation, Unicode width, mode/query fixtures, input routing races, resize ordering, backpressure, process ownership, update transitions, and package content. Generic CLI fixtures cover shells, editors, pagers, mouse/alternate-screen programs, high-rate output, abnormal exit, and reconnection.

Physical automation runs only on attested disposable workers/VMs with no active user session. Certification records OS/runtime/terminal versions, exact package integrity, workload, artifacts, and verdict. Manual developer checks may inform fixes but cannot certify a platform.

### 9. Delivery is capability-flagged and reversible

Implementation first lands dormant contracts and hermetic engines, then structured workspace slices, then composed terminal behind an explicit development flag. Bare `a1` changes only after workspace recovery and explicit-mode regression gates pass. Rollback restores bare `a1` to the accepted transparent profile while leaving `a1 pi` and `a1 sandbox` unchanged; durable records use versioned migrations with backward-readable rollback metadata.

## Risks / Trade-offs

- **[Terminal compatibility surface is large]** → Define compatibility levels, use standards-derived fixtures and differential tests, reject app-specific patches, and certify generic workloads per platform.
- **[Native PTY dependencies complicate packaging]** → Isolate platform adapters, pin root dependencies, verify prebuild/source-build provenance, and test exact package contents on every target.
- **[Background tabs consume resources]** → Enforce per-tab and global budgets with visible outcomes and no silent data crossover.
- **[Input races can target the wrong tab]** → Serialize selection and input acceptance in one router with identity-tagged events and property tests.
- **[Reconnection can imply false continuity]** → Require all capability-specific authorities and report discontinuity whenever proof is incomplete.
- **[A malformed adapter or terminal stream attacks the workspace]** → Validate bounded envelopes, fuzz parsers/protocols, isolate state by identity, and keep cleanup ownership-safe.
- **[Workspace migration disrupts the accepted baseline]** → Keep explicit transparent modes intact, gate bare-mode cutover, and retain a rollback path.

## Migration Plan

1. Create a milestone branch from `develop` and record baseline package/profile/transparent evidence.
2. Add dormant workspace identities, capability contracts, storage migrations, and architecture rules.
3. Implement and gate the structured adapter runtime with a synthetic adapter before integrating real agents.
4. Implement parser/model/input engines and platform PTY adapters behind a development-only composed capability.
5. Add workspace UI and lifecycle, then generic composed-tab fixtures and bounded reconnection.
6. Certify exact packages on isolated workers per platform; do not broaden claims for uncertified platforms.
7. Cut bare `a1` over to the workspace only after explicit `pi`/`sandbox`, update, rollback, and recovery gates pass.
8. Publish an uncertified `next` preview only under existing preview policy; promote stable support only after all mandatory certification.

Rollback disables the workspace cutover, restores the accepted bare transparent launch, preserves explicit modes, and leaves versioned workspace records available for a later compatible retry.

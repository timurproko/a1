## Why

Bare `a1` is reserved as the AddOne agent product surface, but the accepted baseline exposes only one foreground Pi process. AddOne now needs a deliberate multi-agent workspace that can manage structured agents safely while treating arbitrary interactive CLI tabs as a separate composed-terminal capability with explicit ownership and certification.

## What Changes

- Replace bare `a1`'s initial single-agent presentation with an AddOne-owned workspace for creating, naming, observing, switching, stopping, and reconnecting managed agents.
- Preserve `a1 pi` as vanilla Pi using `~/.pi/agent` and `a1 sandbox` as the isolated `~/.a1/sandbox` profile.
- Introduce a structured/RPC agent adapter contract for lifecycle, events, snapshots, commands, backpressure, failure isolation, and reconnection without screen scraping.
- Introduce a composed-terminal contract in which each workspace tab owns a split layout and each terminal pane owns one PTY-backed terminal session.
- Build composed terminals through an AddOne-owned terminal-hosted runtime that runs inside the user's existing terminal. It owns PTYs, retained terminal models, input arbitration, and fullscreen/side-by-side rendering; no separate native desktop application is required for the initial product.
- Reuse only the terminal-core portions of the Ghostty ecosystem that fit a CLI host, such as `libghostty-vt`, plus a mature PTY layer. Ghostty's GUI application, Winghostty's Win32/OpenGL runtime, Metal, GTK, and other desktop application stacks are postponed and are not part of the proof.
- Keep terminal bytes, native input, and rendering inside the terminal host while AddOne's control plane exchanges only typed identity, topology, lifecycle, and recovery messages.
- Require capability negotiation so structured agents do not become terminal panes accidentally and terminal-backed CLIs do not claim structured semantics.
- Require a successful in-terminal 2×2 proof, measured and manually or isolated-worker accepted, before composed-terminal production integration or milestone merge. The fixed 2×2 layout and dashed pane chrome are disposable proof scaffolding, not product UI. A failed proof stops composed-terminal work without blocking structured-agent work; it does not trigger custom rendering/input remediation or a desktop-app fallback.
- After native hot-path isolation is established, preserve the terminal-host proof and postpone its remaining automated stress and physical gates until the AddOne-owned fullscreen UI and structured multi-agent tabs are implemented. This postponement does not permit composed-terminal integration, support claims, or milestone merge.
- Build the separately planned AddOne-owned Pi UI foundation first. It uses Pi's documented public SDK as the agent engine behind an AddOne-owned fullscreen interface; it does not patch, inspect, or deep-import Pi interactive-TUI internals. It reaches vanilla-first parity by adapting documented public Pi UI components where suitable and provenance-recorded MIT-licensed ports where ownership is needed, while exact upstream Pi remains available through `a1 pi`.
- After fullscreen base-UX acceptance, add AddOne-owned tabs for multiple structured SDK-backed agents. These tabs switch semantic agent views and SHALL NOT initialize the terminal host, create PTYs, or imply arbitrary terminal-pane support.
- Permit that independently accepted fullscreen UI and structured-tab slice to merge through `develop` and publish as an uncertified `-dev.N` preview under npm `next` while composed multipane behavior remains disabled and no composed-terminal support is claimed.
- Then resume the exact terminal-host spike on an isolated Windows worker. After the proof verdict, remove the fixed multipane presentation and restore the single fullscreen terminal path before production multiplexer work begins.
- Gate arbitrary CLI panes, split layouts, and production multiplexer work on the accepted isolated-worker composed-terminal proof. Structured agent tabs do not satisfy or bypass that gate.
- Require hermetic automated gates plus isolated disposable-worker certification before composed-terminal support claims; no desktop automation may run on an active workstation.
- Keep transparent direct attachment as the fallback and comparison baseline rather than silently routing it through the terminal host.

## Capabilities

### New Capabilities

- `multi-agent-workspace`: Bare-`a1` workspace behavior, agent identity/lifecycle, switching, failure isolation, persistence, and stable explicit-mode compatibility.
- `structured-agent-runtime`: Structured/RPC adapter semantics, event/state ownership, command routing, flow control, recovery, and capability negotiation.
- `composed-terminal-runtime`: Arbitrary interactive CLI tab semantics, PTY/render/input authority, inactive-surface lifecycle, reconnection, isolation, and certification.

### Modified Capabilities

- `addone-shell`: Bare `a1` changes from one directly attached foreground agent to the AddOne multi-agent workspace while explicit `pi` and `sandbox` modes remain stable.
- `terminal-agent-runtime`: Transparent direct attachment remains the single-foreground baseline and becomes an explicit fallback/comparison capability alongside, not inside, composed terminal tabs.

## Impact

The change affects CLI launch routing, workspace/application state, supervision and storage, structured-agent adapters, a versioned local terminal-host protocol, pinned terminal-core/PTY source integration, terminal process ownership, in-terminal rendering/input, test infrastructure, platform-specific console executable packaging, documentation, and cross-platform release policy. Composed-terminal work requires a milestone branch that SHALL NOT merge into `develop` until the postponed in-terminal proof gate passes. The independently accepted fullscreen owned-UI and structured-agent-tab slice may merge through `develop` and publish under npm `next` while that gate is pending because it neither packages nor activates composed terminal authority. Arbitrary CLI panes, splits, multiplexer integration, and composed support claims remain blocked until the isolated proof passes and the fixed proof presentation is removed. The accepted meanings and transparent execution paths of `a1 pi` and `a1 sandbox` must not change.

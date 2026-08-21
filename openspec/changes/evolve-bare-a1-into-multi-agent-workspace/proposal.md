## Why

> **Status: ON HOLD by user direction.** Do not implement, continue, publish, or resume any remaining multi-agent or composed-terminal scope until the user explicitly authorizes this change to resume. Completion of parity or customization work does not lift this hold.

Bare `a1` is reserved as the A1 agent product surface, but the current baseline exposes only one A1-owned Pi experience. A1 ultimately needs a deliberate multi-agent workspace that can manage structured agents safely while treating arbitrary interactive CLI tabs as a separate composed-terminal capability with explicit ownership and certification.

User-controlled comparison has reopened the claimed vanilla-parity prerequisite: A1 can expose models from persisted A1 credentials while `/login` reports the same providers as unconfigured. That finding is owned by the separate `repair-owned-pi-parity` change. A subsequent `customize-owned-pi-experience` change may establish the first accepted A1-specific Pi experience, but neither change automatically resumes this held multi-agent plan.

## What Changes

- Replace bare `a1`'s initial single-agent presentation with an A1-owned workspace for creating, naming, observing, switching, stopping, and reconnecting managed agents.
- Preserve `a1 pi` as vanilla Pi using `~/.pi/agent` and `a1 sandbox` as the isolated `~/.a1/sandbox` profile.
- Introduce a structured/RPC agent adapter contract for lifecycle, events, snapshots, commands, backpressure, failure isolation, and reconnection without screen scraping.
- Introduce a composed-terminal contract in which each workspace tab owns a split layout and each terminal pane owns one PTY-backed terminal session.
- Build composed terminals through an A1-owned terminal-hosted runtime that runs inside the user's existing terminal. It owns PTYs, retained terminal models, input arbitration, and fullscreen/side-by-side rendering; no separate native desktop application is required for the initial product.
- Reuse only the terminal-core portions of the Ghostty ecosystem that fit a CLI host, such as `libghostty-vt`, plus a mature PTY layer. Ghostty's GUI application, Winghostty's Win32/OpenGL runtime, Metal, GTK, and other desktop application stacks are postponed and are not part of the proof.
- Keep terminal bytes, native input, and rendering inside the terminal host while A1's control plane exchanges only typed identity, topology, lifecycle, and recovery messages.
- Require capability negotiation so structured agents do not become terminal panes accidentally and terminal-backed CLIs do not claim structured semantics.
- Require a successful in-terminal 2×2 proof, measured and manually or isolated-worker accepted, before composed-terminal production integration into `develop`. The fixed 2×2 layout and dashed pane chrome are disposable proof scaffolding, not product UI. A failed proof stops composed-terminal work without blocking later structured-agent work; it does not trigger custom rendering/input remediation or a desktop-app fallback.
- After native hot-path isolation is established, preserve the terminal-host proof and postpone its remaining automated stress and physical gates until the single-agent owned Pi experience has renewed parity acceptance, its first A1 customization is accepted, and structured multi-agent tabs are implemented. This postponement does not permit composed-terminal integration or support claims.
- Reopen the A1-owned Pi UI prerequisite through `repair-owned-pi-parity`. It uses Pi's documented public SDK as the agent engine behind an A1-owned interface; it does not patch, inspect, or deep-import Pi interactive-TUI internals. It SHALL match vanilla authentication, provider, model-catalog, selection, workflow, and presentation behavior for equivalent profile state while exact upstream Pi remains available through `a1 pi`.
- After renewed 1:1 acceptance, complete a separate `customize-owned-pi-experience` change for the first A1-specific single-agent Pi experience through owned slots. Do not use multi-agent tabs as the first customization vehicle.
- Only after both single-agent changes are accepted, add A1-owned tabs for multiple structured SDK-backed agents. These tabs switch semantic agent views and SHALL NOT initialize the terminal host, create PTYs, or imply arbitrary terminal-pane support.
- Permit the subsequently accepted custom single-agent UI and structured-tab slice to integrate through `develop` and publish as uncertified `-dev.N` previews under npm `next` while composed multipane behavior remains disabled and no composed-terminal support is claimed.
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

- `a1-shell`: Bare `a1` changes from one directly attached foreground agent to the A1 multi-agent workspace while explicit `pi` and `sandbox` modes remain stable.
- `terminal-agent-runtime`: Transparent direct attachment remains the single-foreground baseline and becomes an explicit fallback/comparison capability alongside, not inside, composed terminal tabs.

## Impact

The change affects CLI launch routing, workspace/application state, supervision and storage, structured-agent adapters, a versioned local terminal-host protocol, pinned terminal-core/PTY source integration, terminal process ownership, in-terminal rendering/input, test infrastructure, platform-specific console executable packaging, documentation, and cross-platform release policy. All future work uses detached task worktrees under `D:/Git/a1/.worktrees` and integrates only validated commits into `develop`; no milestone or topic branch is required. The previous owned-UI acceptance and preview remain historical evidence but do not override the new contradictory user finding. Further structured-tab implementation and publication are blocked until `repair-owned-pi-parity` and `customize-owned-pi-experience` are accepted **and** the user explicitly lifts this hold. Arbitrary CLI panes, splits, multiplexer integration, and composed support claims additionally remain blocked until the isolated proof passes and the fixed proof presentation is removed. The accepted meanings and transparent execution paths of `a1 pi` and `a1 sandbox` must not change.

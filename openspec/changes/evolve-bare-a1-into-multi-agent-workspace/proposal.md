## Why

Bare `a1` is reserved as the AddOne agent product surface, but the accepted baseline exposes only one foreground Pi process. AddOne now needs a deliberate multi-agent workspace that can manage structured agents safely while treating arbitrary interactive CLI tabs as a separate composed-terminal capability with explicit ownership and certification.

## What Changes

- Replace bare `a1`'s initial single-agent presentation with an AddOne-owned workspace for creating, naming, observing, switching, stopping, and reconnecting managed agents.
- Preserve `a1 pi` as vanilla Pi using `~/.pi/agent` and `a1 sandbox` as the isolated `~/.a1/sandbox` profile.
- Introduce a structured/RPC agent adapter contract for lifecycle, events, snapshots, commands, backpressure, failure isolation, and reconnection without screen scraping.
- Introduce a composed-terminal contract for arbitrary interactive CLI tabs covering PTY ownership, retained terminal state, rendering, input routing, resize, clipboard/selection, inactive surfaces, switching, exit, and reconnection.
- Require capability negotiation so structured agents do not become terminal tabs accidentally and terminal-backed CLIs do not claim structured semantics.
- Require hermetic automated gates plus isolated disposable-worker certification before composed-terminal support claims; no desktop automation may run on an active workstation.
- Keep transparent direct attachment as the fallback and comparison baseline rather than silently routing it through the composed terminal.

## Capabilities

### New Capabilities

- `multi-agent-workspace`: Bare-`a1` workspace behavior, agent identity/lifecycle, switching, failure isolation, persistence, and stable explicit-mode compatibility.
- `structured-agent-runtime`: Structured/RPC adapter semantics, event/state ownership, command routing, flow control, recovery, and capability negotiation.
- `composed-terminal-runtime`: Arbitrary interactive CLI tab semantics, PTY/render/input authority, inactive-surface lifecycle, reconnection, isolation, and certification.

### Modified Capabilities

- `addone-shell`: Bare `a1` changes from one directly attached foreground agent to the AddOne multi-agent workspace while explicit `pi` and `sandbox` modes remain stable.
- `terminal-agent-runtime`: Transparent direct attachment remains the single-foreground baseline and becomes an explicit fallback/comparison capability alongside, not inside, composed terminal tabs.

## Impact

The change affects CLI launch routing, workspace/application state, supervision and storage, structured-agent adapters, terminal process ownership, rendering/input dependencies, test infrastructure, packaging, documentation, and cross-platform release policy. It may introduce platform-native PTY dependencies and a terminal emulator core, but all dependencies remain governed by the root manifest and lockfile. Implementation requires a milestone branch and must not modify the accepted meanings of `a1 pi` or `a1 sandbox`.

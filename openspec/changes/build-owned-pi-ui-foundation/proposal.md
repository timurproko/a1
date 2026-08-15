## Why

AddOne's planned multi-agent workspace requires a terminal UI it can own and customize, while preserving Pi as the agent engine. The prior prototype proved that patching Pi's interactive root creates an upgrade-bound architecture, and the first owned-renderer spike proved that recreating Pi's terminal behavior by hand is not a viable path to parity.

## What Changes

- Introduce an AddOne-owned fullscreen Pi shell using Pi only through documented public APIs: the public SDK for the agent engine, public root-package UI components, and the public `pi-tui` runtime for terminal input, focus, differential rendering, overlays, and restoration.
- Treat the initial hand-written terminal runtime, prompt editor, transcript renderer, and custom chrome as spike evidence only. They SHALL NOT become the production owned-UI path.
- Build a provenance-recorded Pi session shell that reuses or ports Pi's interactive orchestration without instantiating, patching, or inspecting Pi's stock `InteractiveMode`.
- Require current-Pi-version parity before customization, structured tabs, or multi-agent UX: equivalent component snapshots, scripted event sequences, and terminal frames must match the pinned Pi version for all covered fixtures.
- Keep `a1 pi` as exact upstream vanilla Pi and `a1 sandbox` unchanged for comparison and recovery.
- Use `D:\Git\oh-my-pi` only as an architecture and testing reference. Do not adopt its fork-wide engine rewrite, Bun-only runtime, or broad batteries-included scope.
- Keep AddOne customization slots above the parity-safe shell so future customization does not mutate Pi code. Structured tabs, arbitrary terminal panes, and composed terminal authority remain out of scope for this change.

## Capabilities

### New Capabilities

- `owned-pi-ui-foundation`: AddOne-owned fullscreen Pi shell, public-SDK engine boundary, public `pi-tui` runtime/component reuse, current-version parity, customization slots, diagnostics, and upgrade-conformance policy.

### Modified Capabilities

- `addone-shell`: Explicit `a1 pi` remains the exact upstream vanilla Pi path; the new AddOne-owned UI must not intercept or alter it.
- `terminal-agent-runtime`: Transparent direct attachment remains independent from the owned UI and terminal-host paths.

## Impact

The change adds an AddOne-owned terminal presentation layer and narrow Pi engine/runtime/component adapter boundaries. It affects CLI routing only when the new owned UI is selected or when bare AddOne is deliberately cut over in a later task; explicit `a1 pi` and `a1 sandbox` must remain unchanged. Implementation SHALL occur on the dedicated `milestone/owned-pi-ui-foundation` branch, not on `milestone/multi-agent-workspace`; the UI branch may base on the multi-agent milestone only to inherit its planning and structured-runtime prerequisites. Dependencies must stay public and version-pinned, with Pi and any provenance-recorded adaptations isolated behind AddOne-owned contracts. Current-version parity and manual base-UX acceptance are required before structured multi-agent tabs or further customization resume.

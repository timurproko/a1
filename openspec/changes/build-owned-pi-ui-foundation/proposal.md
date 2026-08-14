## Why

AddOne's planned multi-agent workspace requires a terminal UI it can own and customize, while preserving Pi as the agent engine. The prior prototype proved that patching Pi's interactive root creates an upgrade-bound architecture, and `D:\Git\oh-my-pi` demonstrates both useful UI architecture patterns and the maintenance cost of becoming a full fork.

## What Changes

- Introduce an AddOne-owned fullscreen terminal UI for one Pi agent session, using Pi only through its documented public SDK engine and root-package component exports or explicitly provenance-recorded MIT-licensed ports.
- Build the vanilla-style Pi experience first: transcript and streaming, tool presentation, editor and queued input, abort/retry/compaction, model and thinking controls, session resume, settings, clipboard, resize, diagnostics, and clean shutdown.
- Introduce AddOne-owned UI state, reducers, focus/input routing, component slots, theme slots, and command surfaces so customization does not depend on Pi's `InteractiveMode`, prototypes, private fields, deep imports, or distribution hashes.
- Use `D:\Git\oh-my-pi` as an architecture reference for controller/component separation, append-only transcript commit semantics, stdin reassembly, sanitized width-safe rendering, input/paste behavior, status composition, and SDK-backed custom UI. Do not adopt its fork-wide engine rewrite, Bun-only runtime, or broad batteries-included scope.
- Keep `a1 pi` as exact upstream vanilla Pi and `a1 sandbox` unchanged for comparison and recovery.
- Prepare the UI as composable views that can host structured multi-agent tabs later; tabs, arbitrary terminal panes, and composed terminal authority remain out of scope for this change.

## Capabilities

### New Capabilities

- `owned-pi-ui-foundation`: AddOne-owned fullscreen Pi UI, public-SDK engine boundary, vanilla-style session experience, customization slots, diagnostics, and upgrade-conformance policy.

### Modified Capabilities

- `addone-shell`: Explicit `a1 pi` remains the exact upstream vanilla Pi path; the new AddOne-owned UI must not intercept or alter it.
- `terminal-agent-runtime`: Transparent direct attachment remains independent from the owned UI and terminal-host paths.

## Impact

The change adds an AddOne-owned terminal presentation layer and a narrow Pi engine/component adapter boundary. It affects CLI routing only when the new owned UI is selected or when bare AddOne is deliberately cut over in a later task; explicit `a1 pi` and `a1 sandbox` must remain unchanged. Dependencies must stay public and version-pinned, with Pi and any oh-my-pi-inspired adaptations isolated behind AddOne-owned contracts. Automated Pi-upgrade conformance and manual base-UX acceptance are required before structured multi-agent tabs resume.

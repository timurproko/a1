## Why

The completed release-layer, payload, restart-certification, compile-cache, and update-warmup work removed payload-wide launch costs, but exact-package Windows startup still takes about 2.0–2.6 seconds and spends most of that time linking and evaluating the owned UI and broad Pi package-root module graph in every new UI process. Further release cleanup or payload filtering will not materially lower this floor; A1 now needs to reduce the code evaluated before the first input-ready frame while preserving the accepted runtime, extension, and terminal contracts.

## What Changes

- Add module-level startup evidence that attributes the input-ready path by entry point, loaded module/file count, evaluated bytes, and time, while remaining opt-in and redacted.
- Replace broad A1 barrel imports reachable from interactive launch with direct leaf imports and enforce a deterministic hot-path import boundary.
- Consume documented narrow Pi runtime, component, and theme exports where available; otherwise permit an A1-owned build-time startup bundle or facade only after proving public-API provenance, side-effect preservation, provider registration, extension compatibility, licenses, and one shared Pi TUI module identity.
- Defer settings, selectors, package-update support, rich rendering helpers, clipboard/image support, and other optional features until first use or until after the first input-ready frame when doing so does not make the editor operational before its engine, resources, tools, and extensions are ready.
- Make update warmup load the exact optimized startup artifact and verify that its compile-cache and immutable-content identities match the subsequent interactive process.
- Reduce unnecessary CLI, bootstrap, and guardian module loading after the UI graph is bounded, without weakening immutable release selection, containment, or process ownership.
- Tighten accepted Windows exact-package startup targets to 2 seconds for post-update and warm launches and 2.5 seconds when a replacement supervisor must be started, on every supported Node lane, with one attempt and phase/module diagnostics on failure.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `a1-shell`: Require the installed interactive path to evaluate only the bounded startup graph needed for a genuinely input-ready frame and meet tighter startup budgets.
- `pi-api-boundary`: Permit only documented narrow Pi exports or a compatibility-certified A1-owned startup artifact, while preserving public API provenance and one terminal module identity.
- `cli-self-update`: Require post-activation warmup to target the exact optimized startup artifact and compatible compile-cache identity.
- `isolated-regression-testing`: Add exact-package module-graph evidence and first-attempt performance gates that detect eager-import and evaluated-byte regressions.

## Impact

- Affects interactive entry points, composition imports, Pi adapters and component boundaries, optional-feature loading, warmup, runtime payload inventory, build outputs, and startup evidence.
- May require a compatible pinned Pi release with new documented subpath exports, or a generated A1 startup artifact with explicit provenance and license evidence.
- Preserves command syntax, profiles, first-input-ready semantics, immutable releases, rollback, supervisor and guardian ownership, extension behavior, provider registration, and terminal module identity.
- Depends on the accepted release-layer, restart-certification, compile-cache, and warmup foundation from `reduce-post-update-cold-start`; it does not replace or weaken those controls.

## Why

Bare A1 presents Pi settings as writable after proving only that their values reach `SettingsManager`; many values never reach the active agent, owned transcript, terminal, startup, or shutdown path. This makes `/settings` misleading, leaves `fullscreenExitOutput` as a confirmed no-op, drops renderable image content, and bypasses the configured project-trust decision before project resources load. Physical comparison after the behavioral implementation also shows that setting-controlled A1 surfaces can preserve text while losing pinned Pi's colors, emphasis, borders, spacing, geometry, compact resume form, and startup-selector lifecycle, so behavioral reachability alone is not final parity. Subsequent review rejects treating pinned Pi's description-heavy, type-to-search settings interaction as the product UX: the owned settings screen must retain its explicit search invocation, ruled input, shortcut-derived status bar, and user-configured scroll rate while keeping the shared component architecture. Physical review of the resulting screen also rejects scalar menus that blend into the rows behind them: the shared value menu must retain A1's distinct floating-panel treatment.

## What Changes

- Establish one authoritative Pi-setting application path for the A1-owned settings app and the pinned comparison selector, covering validation, persistence, active-runtime effects, redraw, and lifecycle timing.
- Require every Pi setting that A1 presents to produce its documented observable behavior. A setting that cannot apply in the current product mode or environment is omitted from the active settings UI; a supported deferred setting remains visible and states its exact application boundary.
- Apply session settings to the active agent where Pi supports a live change, including thinking, steering, follow-up, transport, skill-command discovery, image processing, provider timeout configuration, and warnings.
- Apply owned-shell settings to live components, including editor and output padding, autocomplete height, thinking visibility, Mermaid mode, cursor visibility, shrink clearing, terminal progress, cache notices, and affected transcript reconstruction.
- Preserve validated user and tool-result image attachments through a bounded asset boundary, honor image visibility and width, render inline only when the terminal advertises a supported protocol, and show a truthful fallback otherwise.
- Implement fullscreen shutdown output after terminal restoration: print the transcript plus an actionable resume hint for `transcript`, and only the hint for `resume-hint`.
- Resolve project trust before loading project settings, context, skills, prompts, extensions, or themes, honoring saved decisions and the configured default.
- Honor Pi lifecycle settings that A1 exposes, including changelog collapse and install telemetry, and omit them from the active settings UI when the corresponding lifecycle is not active.
- Add behavioral conformance coverage for every exposed Pi setting and visibility coverage for unavailable inventory entries rather than accepting descriptor reachability and persistence as proof of functionality.
- Require visible setting-controlled runtime surfaces to preserve pinned Pi's semantic ANSI styles, borders, padding, row order, wrapping, geometry, cursor behavior, and terminal lifecycle, with declared product/data and owned-settings interaction substitutions.
- Preserve the owned settings interaction contract on the shared component layer: `/` alone invokes a ruled search input, ordinary typing outside that input does not search, the status bar is derived from active shortcut declarations, selected-entry descriptions remain model metadata rather than rendered rows, wheel movement uses the effective live `scrollbarSpeed` policy instead of a settings-screen literal, and scalar choices open in a distinct floating panel with a lighter active row and a check mark on the effective value.
- Replace the plain pre-project trust prompt with a bounded pinned-style startup selector that still loads no project-derived resource before the decision.
- Make fullscreen exit reproduce the styled pinned transcript and dim compact resume hint after terminal restoration, using the session id and `--session-dir` only when required rather than exposing the full default session-file path.
- Replace text-only or self-referential parity evidence with independent pinned/A1 producers and a complete setting-to-surface visual parity matrix.

**BREAKING**: none. Values already exposed as writable gain their promised effects; unsupported inventory entries remain explicit internally while being omitted from the active settings UI.

## Capabilities

### New Capabilities

- `pi-settings-runtime`: defines the end-to-end application, capability reporting, image handling, trust ordering, fullscreen-exit behavior, behavioral conformance, and setting-controlled visual parity contract for Pi settings exposed through A1.

### Modified Capabilities

- `owned-ui-settings`: agent settings gain declared application timing and availability, the screen reports applied or deferred outcomes while omitting unavailable options, and its rows, values, notices, and controls retain reviewed shared styling while search invocation, ruled input, status hints, description visibility, wheel cadence, and visually distinct scalar menus follow the owned settings UX.
- `owned-pi-ui-foundation`: the owned shell must preserve every setting-controlled pinned behavior and visual state it exposes, including transcript images and styling, live presentation changes, terminal effects, startup trust, and fullscreen shutdown output.

## Impact

The later implementation will affect the Pi settings adapter and metadata, engine/session façades, owned settings model and app, launch trust ordering and startup selector, resource loading, session-shell configuration and shutdown, transcript payload contracts and presenters, terminal runtime operations, resume-command formatting, startup lifecycle integration, raw terminal-frame parity fixtures, provenance ledgers, and table-driven conformance tests. The settings correction reuses the existing shortcut, line-input, list, menu, dialog, and scrollbar components rather than replacing or bypassing their architecture. Image payloads will require a bounded asset resolver rather than embedding base64 data in the size-limited owned-UI view. No dependency or private Pi import is planned; any unavailable public behavior must be implemented as a minimal attributed owned port behind the existing Pi boundary.

## Why

Bare A1 presents Pi settings as writable after proving only that their values reach `SettingsManager`; many values never reach the active agent, owned transcript, terminal, startup, or shutdown path. This makes `/settings` misleading, leaves `fullscreenExitOutput` as a confirmed no-op, drops renderable image content, and bypasses the configured project-trust decision before project resources load.

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

**BREAKING**: none. Values already exposed as writable gain their promised effects; unsupported inventory entries remain explicit internally while being omitted from the active settings UI.

## Capabilities

### New Capabilities

- `pi-settings-runtime`: defines the end-to-end application, capability reporting, image handling, trust ordering, fullscreen-exit behavior, and behavioral conformance contract for Pi settings exposed through A1.

### Modified Capabilities

- `owned-ui-settings`: agent settings gain declared application timing and availability, and the screen reports applied or deferred outcomes while omitting unavailable options.
- `owned-pi-ui-foundation`: the owned shell must preserve every setting-controlled pinned behavior it exposes, including transcript images, live presentation changes, terminal effects, startup trust, and fullscreen shutdown output.

## Impact

The later implementation will affect the Pi settings adapter and metadata, engine/session façades, owned settings model and app, launch trust ordering, resource loading, session-shell configuration and shutdown, transcript payload contracts and presenters, terminal runtime operations, startup lifecycle integration, and table-driven conformance tests. Image payloads will require a bounded asset resolver rather than embedding base64 data in the size-limited owned-UI view. No dependency or private Pi import is planned; any unavailable public behavior must be implemented as a minimal attributed owned port behind the existing Pi boundary.

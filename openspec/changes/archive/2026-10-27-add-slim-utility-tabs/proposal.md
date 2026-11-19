## Why

Every resident utility tab, Settings and Changelog, starts the same child as an Agent tab: the full owned composition with the Pi engine, a session backend, extensions, and the model runtime. A utility tab only shows one owned screen, yet it costs as much as an Agent, and the client keeps both prewarmed and hidden so they open at once, so two full Agent processes run even when no Agent needs them. Opening the tab must stay instant while the tab costs only what its screen needs.

## What Changes

- A utility tab's child runs a slim entry instead of the Agent composition. `bin/ui.js` reads the tab id before any A1 or Pi module loads and, for a utility tab id, loads a utility-tab runtime instead of the Agent startup graph, so the Pi engine, session backend, extensions, prompt history, suggestions, and draft recovery are never loaded or started.
- The slim runtime presents the tab's one pinned route screen, Settings or the changelog, full screen through the existing owned terminal host, with the same theme, accent, background canvas, keybindings, mouse, interrupt chord, and controller-boundary handling as today.
- It keeps the tab-bar behavior of utility tabs: it starts the tab bridge, reports its status and accent, publishes the effective tab shortcuts, opens the Plus Menu modal through `configure-plus`, detaches on the double interrupt, and stops on `bridge.stop`.
- The Settings screen's Agent section reads and writes Pi's settings through an engine-free settings port built from Pi's `SettingsManager`, and lists per-model thinking levels from a `ModelRuntime` created offline, so the section keeps every row it shows today.
- The changelog tab reads the packaged release notes directly, without the startup release-note claim.
- Agent tabs, `a1 solo`, `a1 pi`, and the standby keep the full composition unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `multi-agent-tabs`: utility tabs run a slim child process that loads no Agent engine.
- `owned-ui-settings`: the Settings tab's Agent section is served without a running engine.

## Impact

- **Launch:** `bin/ui.js` branches on the tab id before loading the declared startup graph; the startup descriptor gains no utility-tab modules.
- **TypeScript:** a utility-tab runtime and composition under `src/composition/`, an engine-free Agent settings port under `src/integrations/pi/engine/`, shared settings-manager construction extracted from `src/composition/owned-ui.ts`, and a minimal presenter for `OwnedUiTerminalHost`.
- **Native host:** none; a utility tab's holder, bridge, and registry record are unchanged.
- **Documentation:** `docs/architecture/resident-tabs.md` Decision 11.
- **Dependency:** builds on the utility tab kinds and Changelog tab from `add-tab-bar-command-palette` (PR #821), which must be in `develop` before implementation starts. No new package dependency.

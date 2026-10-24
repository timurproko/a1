# Design

## Context

A resident tab's holder starts `node bin/ui.js --tab …` with the tab id, token, and endpoint in its environment (`native/terminal-host/src/roles/holder.rs`). `bin/ui.js` consumes those credentials first (`bin/tab-launch-context.js`), installs the pinned Pi TUI resolver, and then loads the declared startup graph, whose `composition/owned-ui.js` statically imports the Pi engine host and session presenters. `composeOwnedUi` creates the engine host and a session backend before anything else, and every route screen is drawn only through the session shell's dialog coordinator and `OwnedUiTerminalHost#openRoute`.

Settings and the changelog are pinned route screens (`createOwnedRouteHost`, `hostApp`, `UiAppHost`). What they need is engine-free except for the Agent section of Settings:

- the A1 settings manager and the shared-settings watcher;
- the theme singletons, accent, and background canvas;
- Pi keybindings, which only need the profile's agent directory;
- the packaged release notes;
- the tab bridge.

The Agent section reads `AgentSettingsPort` from the engine's `PiSettingsBridge`, whose model choices come from the engine's model runtime.

## Goals and non-goals

- Goal: a utility tab neither loads nor starts the Pi engine, session backend, extensions, prompt history, suggestions, or draft recovery, and opens as quickly as today's prewarmed tab.
- Goal: the screen, its keys, its mouse, and its tab-bar behavior are unchanged.
- Non-goal: one process shared by several utility tabs. The terminal host binds one holder and terminal to each tab, so sharing is a separate change.
- Non-goal: changing Agent tabs, `a1 solo`, `a1 pi`, the standby, or the native host.

## Decisions

### 1. Branch before the startup graph loads

`bin/ui.js` resolves the tab's utility route from its tab id with `residentUtilityRoute` (`src/foundation/resident-tabs/routes.ts`), right after it consumes the launch context and installs the Pi TUI resolver. For a utility route it:

1. still installs the fatal exit and the pinned Pi package identity;
2. still runs the single Pi TUI module assertion;
3. then imports `dist/composition/utility-tab.js` instead of calling `loadDeclaredStartupGraph`.

The Agent path below the branch is unchanged. Branching here, rather than at the top of `composeOwnedUi`, keeps the engine modules from being evaluated at all, which is where most of the saving lies.

### 2. One utility-tab runtime

`runUtilityTab({ route, bridge, cwd })` returns the process exit code like `runOwnedUi`. It:

1. starts the bridge and reports `starting`;
2. builds the A1 settings manager through a factory extracted from `composeOwnedUi`, so both paths construct it identically, and loads it;
3. watches the shared settings document;
4. applies the theme singletons the engine host applies today: package border projection, accent, and the dark base;
5. follows accent changes and reports the accent to the bridge;
6. resolves the agent directory from `PI_CODING_AGENT_DIR`, as Pi's `getAgentDir` does;
7. publishes the effective tab shortcuts through `residentTabKeybindings`;
8. builds the route host with the same options as an Agent tab, so `tabRoute` pins the screen and `configurePlusMenu` requests the Plus Menu modal;
9. presents the route.

The application it hands to the fatal-exit handler disposes in reverse order.

### 3. Present through the owned terminal host

The runtime reuses `OwnedUiTerminalHost` in its bare-A1 configuration: custom viewport, fullscreen, the background settings, and no hardware cursor. A minimal presenter attaches to it:

- its root renders nothing;
- its input surface is `owned`;
- it has no viewport input of its own;
- on `activated()` it opens the pinned route with `openRoute`.

Reusing `openRoute` keeps the route's full-screen overlay, the interrupt chord, mouse routing, and pointer reporting identical to today's Settings tab. The controller-boundary pre-input listener stays in place so controller transfer works.

The route callbacks behave as follows:

- `closed` asks the bridge to close the tab, as `closeResidentUtilityRoute` does now;
- `exit` asks the bridge to detach the client, so the double interrupt leaves A1 as in an Agent tab;
- `bridge.stop` disposes the host and ends the process.

### 4. Engine-free Agent settings

The port is a `PiSettingsBridge` over `SettingsManager.create(cwd, agentDir, { projectTrusted })`, with project trust read from the project trust store and its default, as the preflight resolves it.

- **Bound owners:** `shell`, `startup`, `agent`, and `terminal`, with handlers that only persist, because the live effect of an Agent setting belongs to each Agent's own process, which rereads the shared settings file.
- **Model choices:** they come from a `ModelRuntime` created offline from the profile's `auth.json` and `models.json`, as package integration already does; until it resolves, the per-model list is empty.
- **Themes and product mode:** these come from the same sources as today.

The Settings screen therefore shows and edits the same rows as before.

### 5. The changelog without a startup claim

The changelog tab reads the packaged release-notes catalog and renders it as the Agent composition does, but takes no "What's New" startup claim and no acknowledgement, because that claim belongs to an Agent's first start.

### 6. Measure the saving

Before and after the change, the utility tab's child resident set size and its time to first paint are measured on the same machine with `scripts/development/measure-resident-tabs.mjs` or an equivalent probe. The numbers are recorded in this design as implementation evidence.

## Risks

- A setting whose owner is not bound would show as unavailable in the Settings tab; the owner list is checked against `PI_SETTING_EFFECTS` by test.
- Behaviour the session shell gives every route today, such as a clipboard copy from the screen, must be wired in the slim runtime as well; the route host's `copyText` stays the system clipboard writer.
- The branch in `bin/ui.js` runs before the startup descriptor, so a utility-tab module missing from the release must fail with the normal fatal diagnostics rather than a silent blank tab.

# Tasks

Each numbered section is one Implementation item. Implementation starts after `add-tab-bar-command-palette` (PR #821) is in `develop`; every section starts by merging current `origin/develop` and re-checking the names below.

## 1. Slim launch branch

- [ ] 1.1 In `bin/ui.js`, resolve the tab's utility route from its tab id right after the launch context and Pi TUI resolver, and for a utility route install the fatal exit and pinned Pi package identity, assert the single Pi TUI module, and run `dist/composition/utility-tab.js` instead of loading the declared startup graph; the Agent path stays unchanged. Tests: launch tests that a utility tab id never loads the startup graph's engine modules and an Agent tab id still does.

## 2. Utility-tab runtime

- [ ] 2.1 Extract the A1 settings manager construction from `composeOwnedUi` into one factory used by both compositions.
- [ ] 2.2 Add `runUtilityTab` in `src/composition/utility-tab.ts`:
  - start the bridge and report its status and accent;
  - load and watch the settings and apply the theme singletons;
  - publish the tab shortcuts and build the route host with the Agent tab's options;
  - present the pinned route through `OwnedUiTerminalHost` with a minimal presenter;
  - wire `closed`, `exit`, and `bridge.stop` to close the tab, detach the client, and stop.

  Tests: composition tests with a fake bridge and terminal for each route, status and accent reports, shortcut publication, close, detach, and stop.
- [ ] 2.3 Read the changelog from the packaged release notes without a startup claim. Tests: the changelog tab renders the packaged notes and takes no claim.

## 3. Engine-free Agent settings

- [ ] 3.1 Add an engine-free Agent settings port:
  - a `PiSettingsBridge` over Pi's `SettingsManager` with project trust resolved as the preflight does;
  - persist-only handlers for every bound owner;
  - model choices from an offline `ModelRuntime`.

  Tests: every non-hidden key in `PI_SETTING_EFFECTS` is listed, a write persists, and model choices appear once the catalog resolves.

## 4. Measurement and record

- [ ] 4.1 Record a utility tab child's resident set size and time to first paint before and after the change in `design.md`, and describe the slim utility tab process under Decision 11 in `docs/architecture/resident-tabs.md`.

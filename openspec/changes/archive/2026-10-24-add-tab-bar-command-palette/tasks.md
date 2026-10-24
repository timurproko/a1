# Tasks

Each numbered section is one Implementation item. Every section starts by merging current `origin/develop` and re-checking the names below. Native tests run in CI; focused Rust unit tests also run locally with `cargo test --lib` in `native/terminal-host` when the toolchain is present.

## 1. Changelog utility tab

- [x] 1.1 Generalize the server's Settings reservation to utility kinds (`settings-`, `changelog-`): `tab.open-changelog` reserves or selects the singleton Changelog tab titled `Changelog`, utility tabs share Close-only menus, no rename, last placement, and the rule that a registry of utility tabs has no Agent; only Settings is prewarmed and hidden. Deliver `bridge.route{route:"changelog"}` on a Changelog bridge's admission. Tests: server unit tests for reservation, reuse, and the agentless rule.
- [x] 1.2 Accept the `changelog` and `plus-menu` bridge routes in `bridge-client.ts`; compose a `changelog-` child to open the changelog reference route and close its tab when that route exits; hide and refuse `/changelog` in resident Agents. Tests: bridge decoding, composition routing, and autocomplete and slash-command tests.
- [x] 1.3 Add `Request::OpenChangelog` and the `tabs.changelog` action (no default key) to the attach client and its shortcut projection, treating `changelog-` like Settings for chip menus and rename. Tests: machine tests for the action and context menu.

## 2. Configurable plus menu

- [x] 2.1 Add the `tabBarPlusMenu` setting (kinds in order, default `["agent"]`), rename the `Tabs` section to `Tab Bar`, and add the `Plus menu` entry showing `configure` that opens the `plus-menu` route. Tests: declaration, section, and Settings screen tests.
- [x] 2.2 Add the `plus-menu` route to the Settings app: a Models-style dialog with `●`/`○` markers, `Space` toggles, Up and Down, type-to-filter, and `Esc` close, writing `tabBarPlusMenu` on each toggle. Tests: dialog rendering, toggling, filtering, and persistence.
- [x] 2.3 Read `tabBarPlusMenu` live in the attach role; make `+` create an Agent when only Agent is enabled, open the launcher with the enabled kinds (with `+` and `✓` markers) otherwise, and open a `Configure` popup on right-click that sends `tab.open-plus-menu`. On the server, reserve the Settings tab for that request, hold `plus-menu` as its pending route in the core tab runtime, and deliver it over `bridge.route` at once or on admission. Tests: machine tests for each plus configuration and the right-click popup, role reader tests, and server pending-route tests.

## 3. Command palette

- [x] 3.1 Add `tabs.commands` (default `Alt+/`) and a palette mode to the attach state machine: entries for Agent session, Settings, and Changelog with effective shortcuts, Up and Down, type-to-filter with `Backspace`, `Enter` running the entry through its shortcut request, `Esc` closing, and no key, paste, or mouse reaching a child while open. Tests: machine tests for every transition and the simulator corpus reaching the palette.
- [x] 3.2 Render the palette in the attach role as a centered box in the owned list style and add a `dimmed` presentation flag that re-asserts faint across the strip, child rows, and legacy body while a modal is open. Tests: palette renderer cell fixtures, filtered and empty lists, and composer tests for dimming and its full repaint on toggle.

## 4. Rename selection style

- [x] 4.1 Draw the inline tab-rename selection with the owned editor's selection background and the chip's own text color instead of reversed cells. Tests: strip rename fixtures for a selection over the viewed and a hidden chip, in truecolor and palette modes.

## 5. Tab and session names

- [x] 5.1 Keep a resident Agent's tab name and its Pi session name in sync: a strip rename or automatic name sets the session name, and a session name the Agent sets with `/name`, or that its session carries when resumed, becomes the tab name as a user name. Tests: server bridge-session tests for user, automatic, and default sources, and composition tests for `/name` reaching the bridge.

## 6. Architecture record

- [x] 6.1 Record the plus menu, the command palette, the Changelog utility tab, and tab and session name sync under Decision 11 in `docs/architecture/resident-tabs.md`.

## 7. Configure in place

- [x] 7.1 Open `Configure` on `+` as a `Plus Menu` modal over the dimmed active tab, store each toggle in `tabBarPlusMenu` from the attach client under the settings document lock, hide `+` when no kind is enabled, and retire `tab.open-plus-menu` with its pending bridge route. Tests: palette list and machine tests for the modal, renderer fixtures, settings writer tests for locking, defaults, and broken documents, and a strip test for the hidden `+`.
- [x] 7.2 Open the attach `Plus Menu` modal from the Settings `Plus menu` entry through a `configure-plus` bridge request that the server forwards to the controlling client as `plus.configure`, keeping the Settings dialog only without a bridge; draw the search caret as a reversed white cell with a blank row after the description; and accept the `changelog` kind in the tab registry so Changelog tabs open. Tests: Settings hand-off and fallback, bridge request, machine event, renderer rows and caret, and registry kinds.

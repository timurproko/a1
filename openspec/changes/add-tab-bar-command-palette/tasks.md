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

- [x] 3.1 Add `tabs.commands` (default `Alt+/`) and a palette mode to the attach state machine: entries for Agent, Settings, and Changelog with effective shortcuts, Up and Down, type-to-filter with `Backspace`, `Enter` running the entry through its shortcut request, `Esc` closing, and no key, paste, or mouse reaching a child while open. Tests: machine tests for every transition and the simulator corpus reaching the palette.
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
- [x] 7.3 Make Agent the fixed `+` default and Settings the only configurable extra kind, prewarm the Changelog tab hidden after Settings so it opens at once, pin a Changelog tab's screen so `Esc` and its hint do not close it, rename the palette's `Agent session` entry to `Agent`, and reset attributes at the start of the strip so a closed modal's faint never lingers on a chip. Tests: plus menu and launcher, prewarm and reuse, pinned reference screen, settings writer defaults, and the strip's leading reset.
- [x] 7.4 Keep every hidden utility tab, not only Settings, out of the fallback view when the viewed tab leaves, so closing the last Agent shows the landing instead of the prewarmed Changelog. Tests: fallback view with hidden and shown Settings and Changelog.
- [x] 7.5 Drive every utility tab from one kind table: the toggle reveals a hidden tab through the server, which places it last, and prewarming, the close fallback, and the `tab.open-<kind>` and `tab.prewarm-<kind>` messages follow the kind; on the child side, the route matching a resident tab's id is its pinned screen. Tests: kind parsing, toggle reveal and hide for Changelog, server message parsing, and the utility route of a tab id.
- [x] 7.6 List Agent, Settings, and Changelog in the Plus Menu again, with Agent alone as the default and `+` hidden when none is enabled, and add one reveal component that the resize reveal and a new tab share: a new tab shows its chip at once over an empty body and its content fades in on its first commit, while a resize fades the whole frame. Tests: plus kinds, launcher rows, hidden `+`, settings reader and writer, reveal veil, commit, scope, and timing.
- [x] 7.7 Fade in every tab that joins the strip, a revealed Settings or Changelog tab as well as a new Agent, including one created from the landing; keep the child's caret through a content fade; and wipe the landing's cwd and version with the wordmark. Tests: joining once, content-fade cursor, landing body kept with its fade, and the landing text wipe.
- [x] 7.8 Remove the landing's wipe so a tab added from the landing hides it like any other content and joins through the shared reveal, and hide the cursor through every veil and fade. Tests: the reveal hides the cursor in both scopes and the landing renders without a wipe.
- [x] 7.9 Open tabs at once without a fade: drop the joining veil, provisional chip, and content fade so only a resize fades; make a revealed tab, like a created one, keep the current content until its first drawn frame, a retained blank surface included; and show no spinner on a starting chip. Tests: a revealed tab's blank retained surface waits past the stale wait, every created or revealed tab awaits its first draw, a starting chip has no glyph, and the resize fade hides the cursor.
- [x] 7.10 Start no new Agent while a tab this client asked for is still starting or not yet shown, from the shortcut, `+`, or a menu. Tests: repeated new-Agent shortcuts during creation and before the first draw start nothing, and a new Agent starts once the previous one is shown.
- [x] 7.11 Tag the one-Agent-at-a-time test comment as an invariant so it meets the code documentation policy. Tests: the code documentation check passes.
- [x] 7.12 Hide `/name` in resident Agents: leave it out of their suggestions and refuse it with a notice pointing to the tab rename (`F2`), while direct A1 keeps it. Tests: a resident Agent refuses `/name` and omits it from suggestions, direct A1 still suggests it, and the resident footer takes a name set through the name workflow.
- [x] 7.13 Count a prewarmed Changelog holder as a utility holder, like Settings, in the role integration tests, and accept either strip row background in the empty-strip test, since `render` detects truecolor from the environment. Tests: the role integration holder counts and the empty-strip test.
- [x] 7.14 Reconcile with `develop`'s standardized dialog search chevrons and regenerate the startup graph baseline for the merged startup graph. Tests: the architecture check and the owned UI and settings tests.

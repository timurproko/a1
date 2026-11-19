# multi-agent-tabs Delta

## ADDED Requirements

### Requirement: The plus menu is configurable
A1 SHALL offer `Agent`, a multi-instance kind whose every invocation creates a new Agent tab in the launch cwd and whose launcher row carries the `+` marker, and every utility kind, `Settings` and `Changelog`, singleton toggles whose launcher rows carry `✓` while their tab is open. The A1 setting `tabBarPlusMenu` SHALL hold the kinds `+` offers, comma-joined in that order, and SHALL default to `Agent` alone. With only `Agent` enabled, clicking `+` SHALL create an Agent without a menu; with any other enabled set, clicking `+` SHALL open the launcher with one row per enabled kind in kind order and each row's effective shortcut right-aligned; with no kind enabled, the strip SHALL hide `+` and give its cells to the tabs. Right-clicking `+` SHALL open a one-row `Configure` popup whose selection opens the `Plus Menu` dialog as a modal over the dimmed active tab or landing, without switching tabs. The dialog SHALL describe itself as `Choose what the + button in the tab bar can add.`, list every kind with `●` when enabled and `○` when not, toggle the selected kind with `Space`, move with Up and Down, filter by typed text, store each toggle in `tabBarPlusMenu` at once under the settings document lock, apply it to `+` without a restart, ignore the pointer, and close with `Esc`. The search line SHALL draw its caret as a reversed white cell, as owned inputs do, and a blank row SHALL separate the description from it. The Settings `Plus menu` entry SHALL open the same modal over the Settings tab through the tab's controlling client, and SHALL open an equivalent dialog inside the Settings screen only when no tab bar can show it. When a modal closes, the strip SHALL draw at full intensity.

#### Scenario: Default plus
- **WHEN** the profile stores no plus menu and the user clicks `+`
- **THEN** one Agent SHALL be created and no launcher SHALL open

#### Scenario: Plus offers more kinds
- **WHEN** the plus menu enables Agent, Settings, and Changelog and the user clicks `+`
- **THEN** the launcher SHALL show `+ Agent`, `Settings`, and `Changelog` in that order with their effective shortcuts
- **AND** Settings or Changelog SHALL show `✓` while its tab is open

#### Scenario: Configure from the strip
- **WHEN** the user right-clicks `+` and chooses `Configure`
- **THEN** the `Plus Menu` dialog SHALL open over the dimmed active tab, list `Agent`, `Settings`, and `Changelog`, and the viewed tab SHALL NOT change

#### Scenario: Toggle a kind
- **WHEN** the dialog is open on `Changelog` and the user presses `Space`
- **THEN** `Changelog` SHALL switch between `●` and `○` and the next click on `+` SHALL reflect the change

#### Scenario: Configure from Settings
- **WHEN** the user activates the Settings `Plus menu` entry in a resident Settings tab
- **THEN** the `Plus Menu` modal SHALL open over the dimmed Settings tab

#### Scenario: Nothing enabled
- **WHEN** the user disables every kind
- **THEN** the strip SHALL no longer show `+`, and the Settings `Plus menu` entry SHALL still open the dialog

### Requirement: Tabs open at once and only a resize fades
The attach client SHALL draw an opened tab at once, without a fade: a new Agent or a revealed Settings or Changelog tab SHALL replace the current content, another tab or the landing alike, as soon as the tab's first drawn frame commits, and until then the current content SHALL stay. A tab that never draws SHALL still show after the bounded first-draw wait. Only a resize reveal SHALL fade: once its curtain lifts the whole frame, the strip included, SHALL draw faint for one fade interval and then at full intensity, with no cursor shown during the fade. A starting tab's chip SHALL show no spinner. One tab SHALL open at a time: while a tab this client asked for is still starting or not yet shown, a new-Agent shortcut, `+` click, or menu entry SHALL start nothing.

#### Scenario: A new tab draws at once
- **WHEN** the user creates an Agent beside another tab
- **THEN** the previous content SHALL stay until the Agent's first drawn frame commits, which SHALL then show at full intensity with no fade

#### Scenario: A revealed utility tab draws at once
- **WHEN** the user opens a hidden Settings or Changelog tab whose retained screen is still blank
- **THEN** the current content SHALL stay until the tab draws, so no empty body or bare cursor shows, and the tab SHALL then show with no fade

#### Scenario: A burst of new-Agent shortcuts opens one Agent at a time
- **WHEN** the user presses the new-Agent shortcut repeatedly while an Agent is still opening
- **THEN** no further Agent SHALL start until that Agent is shown, so no Agents start in the background and the newest Agent opened is the one in view

#### Scenario: A starting tab has no spinner
- **WHEN** an Agent tab is starting
- **THEN** its chip SHALL show no glyph before its name

#### Scenario: A resize fades the whole frame
- **WHEN** a resize reveal runs
- **THEN** the whole frame SHALL fade in with no cursor shown, and opening a tab SHALL never fade

### Requirement: The command palette opens every tab kind
The `tabs.commands` action, bound to `Alt+/` by default, SHALL open a modal command palette over the dimmed strip and body from any tab, the landing, or the Settings tab. The palette SHALL show the title `Commands` with a dim `esc` hint, a search line that shows the dim placeholder `Search` while empty, one `Tabs` section in the owned section style, and the rows `Agent`, `Settings`, and `Changelog` in the owned list style with `→` and the accent selected background on the selected row and each effective shortcut right-aligned. Up and Down SHALL move the selection, printable keys and `Backspace` SHALL edit a case-insensitive label filter, `Enter` SHALL close the palette and run the selected entry exactly as its shortcut or launcher row would, and `Esc` SHALL close it without action. While the palette is open, no key, paste, or mouse input SHALL reach a child, and mouse input SHALL NOT act on the strip or the palette. A `tabs.changelog` action SHALL exist for assignment without a default key.

#### Scenario: Open the palette
- **WHEN** the user presses `Alt+/`
- **THEN** the strip and body SHALL dim and the palette SHALL show `Agent  Alt+A`, `Settings  Alt+,`, and `Changelog` with the first row selected

#### Scenario: Filter and run
- **WHEN** the user types `chan` and presses `Enter`
- **THEN** only `Changelog` SHALL remain listed and the Changelog tab SHALL open or be shown

#### Scenario: Close without action
- **WHEN** the palette is open and the user presses `Esc`
- **THEN** the palette SHALL close, the frame SHALL return to full intensity, and no tab SHALL change

#### Scenario: Mouse is inert
- **WHEN** the palette is open and the user clicks anywhere
- **THEN** nothing SHALL change and no mouse report SHALL reach a child

### Requirement: Changelog is a singleton utility tab
Bare A1 resident mode SHALL present at most one profile-global utility tab titled `Changelog` that renders the owned changelog reference screen without owning an Agent session. The palette and `tabs.changelog` SHALL show it at once: the attach client SHALL keep one Changelog tab prewarmed and hidden, as it does Settings, starting it after Settings is ready and again after a Changelog tab closes, and SHALL create one only when none is running. Every utility tab, Settings and Changelog alike, SHALL follow one set of tab bar rules: opening one that is not in the strip SHALL place it last, its toggle SHALL hide the viewed one while its process keeps running, and a resident tab whose id names a utility route SHALL present that route as its pinned screen. Its registry record SHALL have the `changelog` kind. Its chip SHALL offer Close but not Rename. Its screen SHALL be the tab: it SHALL show no `Esc close` hint, and neither `Esc` nor one `Ctrl+C` SHALL close it. Resident Agents SHALL neither advertise nor execute `/changelog`; `a1 solo` and `a1 pi` SHALL keep their existing changelog command.

#### Scenario: Open the changelog
- **WHEN** the user runs Changelog from the palette with no Changelog tab
- **THEN** one tab titled `Changelog` SHALL appear and show the changelog screen

#### Scenario: Reuse the changelog
- **WHEN** a Changelog tab exists and the user runs Changelog again
- **THEN** that tab SHALL be shown without creating another

#### Scenario: Changelog opens at once
- **WHEN** Settings and Changelog are prewarmed and the user runs Changelog
- **THEN** the hidden Changelog tab SHALL be shown without starting a process

#### Scenario: A utility tab opens last
- **WHEN** a hidden Changelog or Settings tab is opened after more Agents were added
- **THEN** it SHALL join the strip as the last tab, while one already in the strip SHALL keep its slot

#### Scenario: Closing the last Agent
- **WHEN** a hidden Changelog or Settings tab is running and the user closes the last Agent
- **THEN** the landing SHALL be shown and neither hidden tab SHALL take the view

#### Scenario: Esc keeps the Changelog tab
- **WHEN** the Changelog tab is viewed and the user presses `Esc`
- **THEN** the tab SHALL stay open and its hint line SHALL show no `Esc close`

#### Scenario: Changelog is not an Agent command
- **WHEN** a resident Agent's slash-command autocomplete lists commands or the user enters `/changelog`
- **THEN** `changelog` SHALL be absent and `/changelog` SHALL NOT open a screen in that Agent

### Requirement: Tab rename selection uses the owned selection style
While a tab is renamed inline, selected characters SHALL be drawn with the owned editor's selection background and the chip's own text color, never as reversed cells, in truecolor and palette modes alike.

#### Scenario: Select a tab name
- **WHEN** the user presses `Ctrl+A` in an inline tab rename
- **THEN** the selected name SHALL show the editor's selection background with unchanged text color

### Requirement: Tab names and session names stay in sync
A resident Agent's tab name and its Pi session name SHALL name the same thing. A strip rename or an automatic name SHALL set the session name, and a session name the Agent's session otherwise sets, or that its resumed session carries, SHALL become the tab name with a user name source so automatic naming no longer replaces it. A default session name SHALL NOT replace a tab name. Because renaming the tab renames the session, a resident Agent SHALL omit `/name` from its command suggestions and refuse it with a notice pointing to the tab rename; direct A1 SHALL keep `/name`.

#### Scenario: Rename the session from the Agent
- **WHEN** the user runs `/name what is there` in a resident Agent named `what-is this`
- **THEN** the Agent SHALL refuse it with a notice to rename the tab (`F2`), and the tab and session names SHALL stay `what-is this`
- **AND** `/name` SHALL NOT appear among the Agent's command suggestions, while direct A1 SHALL still offer and run it

#### Scenario: Rename the tab from the strip
- **WHEN** the user renames the tab to `login fix` from the strip
- **THEN** the Agent's session name SHALL become `login fix`

## MODIFIED Requirements

### Requirement: The empty resident shell presents the a1 landing
While the attach client has no tab to show and no view request pending, it SHALL keep the strip with its `+` control and clock and SHALL present the a1 landing in the body: the launch cwd, formatted and placed as an Agent tab's footer shows it (flush left on the second-to-last body row, with the home directory as `~`, in the footer's dim color), the running version as `v<version>` in the footer's dim color on the row below it, and the three-row half-block `a1` wordmark in the profile's accent color on the rows above it (omitted where half-block glyphs are unsupported or rows run out), so the folder stays in place when a tab opens or closes at either strip position. The landing body SHALL be painted with the canvas the `backgroundStyle` setting gives Agent tabs, and SHALL leave the terminal background when it is `transparent`. When a tab is added from the landing, the landing SHALL stay until the tab's first drawn frame replaces it, as any content does, with no wipe or fade. The landing SHALL hold no input: keys, paste, and body mouse input SHALL reach no child, while tab shortcuts, the `+` launcher and its popups, strip hover, strip mouse input, and the double-`Ctrl+C` detach SHALL behave exactly as with tabs. The landing SHALL render no cursor and SHALL never be shown while a tab is viewed.

#### Scenario: Last tab closes into the landing
- **WHEN** the final Agent or Settings tab closes while the attach client stays open and the strip is at the top
- **THEN** the strip SHALL show `+` and the clock and the body SHALL show the launch cwd on the row where an Agent's footer shows it, the version below it, and the wordmark above it
- **AND** no cursor SHALL show

#### Scenario: The folder does not move when a tab opens
- **WHEN** the user creates an Agent from the landing at either tab bar position
- **THEN** the Agent's footer SHALL show the cwd on the same row and column as the landing showed it

#### Scenario: Start an Agent from the landing
- **WHEN** the user presses the `New A1 tab` shortcut or chooses `+ Agent` from the launcher on the landing
- **THEN** one Agent SHALL be created and presented through the ordinary tab UI

#### Scenario: Open Settings from the landing
- **WHEN** the user presses the `Open Settings tab` shortcut or chooses `Settings` from the `+` launcher on the landing
- **THEN** the hidden Settings tab kept ready beside the landing SHALL be shown through the ordinary tab UI without starting a new process

#### Scenario: Adding a tab hides the landing
- **WHEN** the user adds an Agent or Settings tab from the landing
- **THEN** the landing SHALL stay until the tab's first drawn frame replaces it at once, as it would beside another tab

#### Scenario: The wordmark hands over to the Agent caret
- **WHEN** the user starts an Agent from the landing
- **THEN** no wipe or fade SHALL run: the Agent's first drawn frame SHALL replace the whole landing at once

#### Scenario: The landing follows the background setting
- **WHEN** `backgroundStyle` is `accent` or `dark` and the landing is shown
- **THEN** every body cell SHALL use the canvas an Agent tab would use for that style and accent

#### Scenario: A lone hidden Settings tab is not an Agent
- **WHEN** bare `a1` attaches and the registry holds only a hidden Settings tab
- **THEN** the server SHALL create one A1 tab in the launch cwd and the client SHALL view it, not the Settings tab

#### Scenario: Small terminal
- **WHEN** the body has fewer rows or columns than the full header needs
- **THEN** the header SHALL be clipped to the body without wrapping or overflowing it

### Requirement: Tabs are managed from the strip, mouse, and assignable actions
A1 SHALL create a new Agent tab in the client's launch cwd from `Alt+A`; clicking `+` SHALL act as the configured plus menu requires, and by default SHALL create one Agent through the same creation flow. Settings SHALL create or show the singleton global Settings utility tab; its default `Alt+,` action SHALL do the same from another tab and SHALL hide the Settings tab while it is viewed. `Alt+1` through `Alt+9` SHALL view those positions and `Alt+0` the tenth. Actions for next, previous, move-right, and move-left SHALL exist for assignment but have no default keys. Left click on a tab SHALL view it. Right click on a visible Agent tab SHALL open a stable two-row context menu anchored beneath the pointer and clamped to the terminal, with `Close` first and `Rename` second; a Settings or Changelog tab SHALL expose Close but SHALL NOT be renameable. Popup labels SHALL use effective shortcut assignments. Escape, a click elsewhere, a tab switch, or target removal SHALL dismiss a menu without action. Dragging an Agent chip after 250 ms or one column of movement SHALL calculate insertion from chip midpoints, preview only a real move with a v2 `│` marker, and issue one reorder with the captured expected revision on release; release away from the strip SHALL cancel. No tab-management slash command SHALL be exposed. A1 SHALL impose no configured or hard user tab count and SHALL never return a `tab-limit` refusal; only a concrete launch, persistence, containment, protocol, or operating-system resource failure MAY refuse creation. Each client SHALL keep its own viewed tab.

#### Scenario: Create from keyboard
- **WHEN** the user presses `Alt+A`
- **THEN** a new default-named Agent SHALL appear with its first complete surface and become viewed

#### Scenario: Create from strip
- **WHEN** the user clicks `+` under the default plus menu
- **THEN** the same creation flow as `Alt+A` SHALL run without a popup

#### Scenario: Create from the grouped launcher
- **WHEN** the plus menu offers more than Agent and the user selects `+ Agent`
- **THEN** the same creation flow as `Alt+A` SHALL run

#### Scenario: Open Settings from the grouped launcher
- **WHEN** the plus menu offers Settings and the user selects it with or without existing Agent tabs
- **THEN** A1 SHALL create or activate the singleton Settings tab without visible command input

#### Scenario: Open Settings from its action
- **WHEN** the user invokes `tabs.settings` under its default binding while another tab is viewed
- **THEN** A1 SHALL perform the same singleton Settings action as the launcher
- **AND** the presented shortcut label SHALL be `Alt+,`

#### Scenario: Hover strip controls
- **WHEN** the pointer rests over a non-viewed tab chip, overflow, or `+`
- **THEN** the complete control SHALL retain v2 hover styling until the pointer leaves or its geometry disappears
- **AND** unrelated clock, status, registry, and child updates SHALL NOT clear it

#### Scenario: Open and use the default context menu
- **WHEN** the user right-clicks a visible Agent tab under default bindings
- **THEN** a menu beneath the strip SHALL show only `Close  Alt+W` and `Rename  F2` in that order
- **AND** moving and clicking SHALL highlight and invoke the pointed row for the originally targeted tab

#### Scenario: Cancel the context menu
- **WHEN** the context menu is open and the user presses Escape or clicks outside it
- **THEN** it SHALL close without an action or child input
- **AND** the latest complete child surface SHALL remain visible

#### Scenario: Jump beyond count
- **WHEN** the user presses `Alt+7` with three tabs
- **THEN** view SHALL not change and the key SHALL not reach the child

#### Scenario: Preview and commit a drag reorder
- **WHEN** the user holds a pressed Agent chip for 250 ms or crosses a chip midpoint
- **THEN** `│` SHALL preview only a real move and release on the strip SHALL send one reorder
- **AND** release away from the strip SHALL cancel

#### Scenario: Concurrent reorder
- **WHEN** two clients reorder from the same registry revision
- **THEN** exactly one SHALL apply and both SHALL converge

#### Scenario: Tab limit reached
- **WHEN** tab count exceeds every historical configured or hard count and another creation can acquire real resources
- **THEN** creation SHALL proceed because no user tab limit exists

#### Scenario: Create beyond the former limit
- **WHEN** more Agent tabs are requested than the former `tabsMax` value or hard count of 50 and each sequential launch can obtain real resources
- **THEN** A1 SHALL continue creating tabs without a quota notice or silent recycling

#### Scenario: Real start failure
- **WHEN** a new process cannot start or its required durable registry commit fails
- **THEN** no tab SHALL be claimed as created and one concise actionable failure MAY appear without mentioning a tab limit

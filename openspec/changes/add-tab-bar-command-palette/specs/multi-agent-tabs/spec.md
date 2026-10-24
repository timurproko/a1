# multi-agent-tabs Delta

## ADDED Requirements

### Requirement: The plus menu is configurable
A1 SHALL offer three tab kinds in this order: `Agent`, a multi-instance kind whose every invocation creates a new Agent tab in the launch cwd and whose menu row carries the `+` marker, and `Settings` and `Changelog`, singleton toggles whose invocation creates or shows their one tab and whose menu row carries `✓` while that tab is open. The A1 setting `tabBarPlusMenu` SHALL hold the kinds `+` offers and SHALL default to `Agent` alone. With only `Agent` enabled, clicking `+` SHALL create an Agent without a menu; with any other enabled set, clicking `+` SHALL open the launcher with one row per enabled kind in kind order and each row's effective shortcut right-aligned; with no kind enabled, the strip SHALL hide `+` and give its cells to the tabs. Right-clicking `+` SHALL open a one-row `Configure` popup whose selection opens the `Plus Menu` dialog as a modal over the dimmed active tab or landing, without switching tabs. The dialog SHALL describe itself as `Choose what the + button in the tab bar can add.`, list every kind with `●` when enabled and `○` when not, toggle the selected kind with `Space`, move with Up and Down, filter by typed text, store each toggle in `tabBarPlusMenu` at once under the settings document lock, apply it to `+` without a restart, ignore the pointer, and close with `Esc`. The Settings `Plus menu` entry SHALL open the same dialog inside the Settings screen.

#### Scenario: Default plus
- **WHEN** the profile stores no plus menu and the user clicks `+`
- **THEN** one Agent SHALL be created and no launcher SHALL open

#### Scenario: Plus offers more kinds
- **WHEN** the plus menu enables Agent, Settings, and Changelog and the user clicks `+`
- **THEN** the launcher SHALL show `+ Agent`, `Settings`, and `Changelog` in that order with their effective shortcuts
- **AND** Settings or Changelog SHALL show `✓` while its tab is open

#### Scenario: Configure from the strip
- **WHEN** the user right-clicks `+` and chooses `Configure`
- **THEN** the `Plus Menu` dialog SHALL open over the dimmed active tab, and the viewed tab SHALL NOT change

#### Scenario: Toggle a kind
- **WHEN** the dialog is open on `Changelog` and the user presses `Space`
- **THEN** `Changelog` SHALL switch between `●` and `○` and the next click on `+` SHALL reflect the change

#### Scenario: Nothing enabled
- **WHEN** the user disables every kind
- **THEN** the strip SHALL no longer show `+`, and the Settings `Plus menu` entry SHALL still open the dialog

### Requirement: The command palette opens every tab kind
The `tabs.commands` action, bound to `Alt+/` by default, SHALL open a modal command palette over the dimmed strip and body from any tab, the landing, or the Settings tab. The palette SHALL show the title `Commands` with a dim `esc` hint, a search line that shows the dim placeholder `Search` while empty, one `Tabs` section in the owned section style, and the rows `Agent session`, `Settings`, and `Changelog` in the owned list style with `→` and the accent selected background on the selected row and each effective shortcut right-aligned. Up and Down SHALL move the selection, printable keys and `Backspace` SHALL edit a case-insensitive label filter, `Enter` SHALL close the palette and run the selected entry exactly as its shortcut or launcher row would, and `Esc` SHALL close it without action. While the palette is open, no key, paste, or mouse input SHALL reach a child, and mouse input SHALL NOT act on the strip or the palette. A `tabs.changelog` action SHALL exist for assignment without a default key.

#### Scenario: Open the palette
- **WHEN** the user presses `Alt+/`
- **THEN** the strip and body SHALL dim and the palette SHALL show `Agent session  Alt+A`, `Settings  Alt+,`, and `Changelog` with the first row selected

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
Bare A1 resident mode SHALL present at most one profile-global utility tab titled `Changelog` that renders the owned changelog reference screen without owning an Agent session. The palette, a configured `+` launcher, and `tabs.changelog` SHALL create it or show the existing one. Its chip SHALL offer Close but not Rename, and exiting its screen SHALL close the tab. Resident Agents SHALL neither advertise nor execute `/changelog`; `a1 solo` and `a1 pi` SHALL keep their existing changelog command.

#### Scenario: Open the changelog
- **WHEN** the user runs Changelog from the palette with no Changelog tab
- **THEN** one tab titled `Changelog` SHALL appear and show the changelog screen

#### Scenario: Reuse the changelog
- **WHEN** a Changelog tab exists and the user runs Changelog again
- **THEN** that tab SHALL be shown without creating another

#### Scenario: Changelog is not an Agent command
- **WHEN** a resident Agent's slash-command autocomplete lists commands or the user enters `/changelog`
- **THEN** `changelog` SHALL be absent and `/changelog` SHALL NOT open a screen in that Agent

### Requirement: Tab rename selection uses the owned selection style
While a tab is renamed inline, selected characters SHALL be drawn with the owned editor's selection background and the chip's own text color, never as reversed cells, in truecolor and palette modes alike.

#### Scenario: Select a tab name
- **WHEN** the user presses `Ctrl+A` in an inline tab rename
- **THEN** the selected name SHALL show the editor's selection background with unchanged text color

### Requirement: Tab names and session names stay in sync
A resident Agent's tab name and its Pi session name SHALL name the same thing. A strip rename or an automatic name SHALL set the session name, and a session name the Agent sets with `/name`, or that its resumed session carries, SHALL become the tab name with a user name source so automatic naming no longer replaces it. A default session name SHALL NOT replace a tab name.

#### Scenario: Rename the session from the Agent
- **WHEN** the user runs `/name what is there` in a resident Agent named `what-is this`
- **THEN** the tab chip SHALL show `what is there`
- **AND** a later automatic name SHALL NOT replace it

#### Scenario: Rename the tab from the strip
- **WHEN** the user renames the tab to `login fix` from the strip
- **THEN** the Agent's session name SHALL become `login fix`

## MODIFIED Requirements

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

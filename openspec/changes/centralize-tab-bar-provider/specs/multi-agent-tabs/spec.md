## ADDED Requirements

### Requirement: Every tab kind uses one tab-bar provider contract

The resident tab bar SHALL consume one registered provider contract for every tab kind. Each registration SHALL declare the kind's stable name, label, shortcut action, multiplicity, activation behavior, prewarm policy, renameability, Agent-session ownership, child route when present, and launcher marker. The command palette, plus launcher, shortcut dispatch, context menu, visibility handling, server reservation, registry validation, session handling, and route delivery SHALL use those registrations rather than separate Agent, Settings, Changelog, or utility-kind branches.

A multi-instance create kind SHALL create one new tab on every activation. A singleton toggle kind SHALL create its one tab when absent, reveal and activate it when hidden, activate it without moving it when already shown, and hide it according to the shared toggle behavior when it is viewed. Adding a future kind SHALL require one provider registration and its child content, not another parallel tab lifecycle.

#### Scenario: Activate every registered kind through one recipient

- **WHEN** Agent, Settings, or Changelog is invoked from its shortcut, the command palette, or the plus launcher
- **THEN** the tab bar SHALL pass that registered kind to the same activation recipient
- **AND** the provider's multiplicity and activation policy SHALL determine whether a tab is created, activated, revealed, or hidden

#### Scenario: Toggle a singleton tab

- **WHEN** a registered singleton-toggle tab is absent, hidden, already shown, or currently viewed
- **THEN** repeated activation SHALL respectively create it, reveal and activate it, activate it in its existing slot, or hide it through the shared toggle behavior

#### Scenario: Apply kind capabilities

- **WHEN** the tab bar or server needs to offer Rename, persist Agent session metadata, prewarm a singleton, validate a registry kind, or deliver a child route
- **THEN** it SHALL query the registered kind capabilities rather than infer behavior from a concrete tab name or a utility category

### Requirement: Newly added tabs append through the tab-bar ordering API

The resident tab bar SHALL own one kind-neutral ordering API over live tabs. A newly created tab and a hidden tab that newly joins the strip SHALL be placed after every tab already shown in strip order. Selecting a tab already in the strip SHALL retain its current slot, including a slot established by drag-and-drop. Stopped durable registry records SHALL NOT affect the visible insertion destination. Cold creation, prewarmed promotion, and singleton reveal SHALL use the same ordering API and SHALL NOT branch on tab kind.

#### Scenario: Create an Agent after Settings

- **WHEN** an Agent is shown, Settings is opened after it, and another Agent is created
- **THEN** the strip order SHALL be the first Agent, Settings, and the new Agent

#### Scenario: Reveal a hidden singleton after later tabs

- **WHEN** a singleton tab is prewarmed while hidden and other tabs are added before it is opened
- **THEN** opening it SHALL place it after every tab currently shown

#### Scenario: Keep an existing dragged slot

- **WHEN** a shown singleton or multi-instance tab was dragged to a different slot and is activated again
- **THEN** activation SHALL select it without changing its durable order

#### Scenario: Ignore stopped records

- **WHEN** stopped registry records occur before, between, or after the live tabs
- **THEN** a new or newly shown tab SHALL still become the final visible tab

## MODIFIED Requirements

### Requirement: Tabs open at once and only a resize fades

The attach client SHALL present one locally pending new Agent chip and an empty transcript and complete idle editor/footer with a visual caret but no child cursor on the first paint after a user create action, without awaiting process startup; its complete real surface SHALL replace the pending presentation as soon as its first nonblank drawn frame commits, without a fade. Blank child surfaces SHALL remain parked for any duration and SHALL NOT replace the pending Agent presentation or expose a child cursor merely because a first-draw timer elapsed. Revealed Settings and Changelog tabs SHALL retain the current content until their first nonblank drawn frame commits. An explicit create refusal, failed surface, holder loss, child exit, restart, or recovery outcome SHALL continue through its existing owned presentation rather than remain hidden behind the first-draw gate. Only a resize reveal SHALL fade: once its curtain lifts the whole frame, the strip included, SHALL draw faint for one fade interval and then at full intensity, with no cursor shown during the fade. A starting tab's chip SHALL show no spinner. One tab SHALL open at a time: while a tab this client asked for is still starting or not yet shown, a new-Agent shortcut, `+` click, or menu entry SHALL start nothing.

#### Scenario: A new tab draws at once

- **WHEN** the user creates an Agent beside another tab
- **THEN** the first paint SHALL show exactly one pending Agent chip and a complete idle editor/footer, then its first complete nonblank child frame SHALL replace that chip and shell together at full intensity without a fade or duplicate chip

#### Scenario: A blank Agent surface never becomes visible

- **WHEN** a newly requested Agent publishes blank surfaces before, at, or after the former bounded first-draw wait
- **THEN** the complete local startup preview SHALL remain visible with no child cursor
- **AND** the first nonblank coherent Agent frame SHALL replace it in one commit

#### Scenario: A revealed utility tab draws at once

- **WHEN** the user opens a hidden Settings or Changelog tab whose retained screen is still blank
- **THEN** the current content SHALL stay until the tab draws, so no empty body or bare cursor shows, and the tab SHALL then show with no fade

#### Scenario: A startup failure remains visible

- **WHEN** an Agent create, holder, or child fails before a nonblank frame commits
- **THEN** the established failure or recovery presentation SHALL replace the startup preview
- **AND** no blank child surface or bare cursor SHALL appear first

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
The `tabs.commands` action, bound to `Alt+/` by default, SHALL open a modal command palette over the dimmed strip and body from any tab, the landing, or the Settings tab. The palette SHALL show the title `Commands` with a dim `esc` hint, a search line that shows the dim placeholder `Search` while empty, one `Tabs` section in the owned section style, and the rows `Agent`, `Settings`, and `Changelog` in the owned list style with `→` and the accent selected background on the selected row and each effective shortcut right-aligned. Up and Down SHALL move the selection, printable keys and `Backspace` SHALL edit a case-insensitive label filter, `Enter` SHALL close the palette and run the selected entry exactly as its shortcut or launcher row would, and `Esc` SHALL close it without action. While the palette is open, no key, paste, or mouse input SHALL reach a child, and mouse input SHALL NOT act on the strip or the palette. A `tabs.changelog` action SHALL exist for assignment without a default key. The Commands and Plus Menu dialogs SHALL declare their footer guidance as semantic key-and-action entries and render it through one reusable native shortcut-hint component. Each shortcut key SHALL use the owned quiet gray role, each action description SHALL use the distinct lighter muted gray role, and adjacent entries SHALL have exactly two display cells between them with no middle dot or other separator glyph. The Commands footer SHALL read `Type search  ↑↓ navigate  Enter open  Esc close`; the Plus Menu footer SHALL read `Type search  ↑↓ navigate  Space toggle  Esc close`. Width clipping SHALL preserve graphemes and complete key/action style boundaries in truecolor and 256-color modes.

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

#### Scenario: Style native tab-dialog shortcut hints
- **WHEN** Commands or Plus Menu renders its footer in truecolor or 256-color mode
- **THEN** every shortcut key SHALL use the quiet gray role and every action description SHALL use the distinct lighter muted gray role
- **AND** entries SHALL be separated by exactly two spaces with no separator glyph

## MODIFIED Requirements

### Requirement: The command palette opens every tab kind

The `tabs.commands` action, bound to `Alt+/` by default, SHALL open a modal command palette over the dimmed strip and body from any tab, the landing, or the Settings tab. Dimming SHALL apply to the complete visible backdrop, including colored backgrounds of pinned submitted prompts and other styled cells, not only foreground text; the palette SHALL retain full-intensity colors. Closing the palette SHALL restore the unmodified backdrop colors. The palette SHALL show the title `Commands` with a dim `esc` hint, a search line that shows the dim placeholder `Search` while empty, one `Tabs` section in the owned section style, and the rows `Agent`, `Settings`, and `Changelog` in the owned list style with `→` and the accent selected background on the selected row and each effective shortcut right-aligned. Up and Down SHALL move the selection, printable keys and `Backspace` SHALL edit a case-insensitive label filter, `Enter` SHALL close the palette and run the selected entry exactly as its shortcut or launcher row would, and `Esc` SHALL close it without action. While the palette is open, no key, paste, or mouse input SHALL reach a child, and mouse input SHALL NOT act on the strip or the palette. A `tabs.changelog` action SHALL exist for assignment without a default key. The Commands and Plus Menu dialogs SHALL declare their footer guidance as semantic key-and-action entries and render it through one reusable native shortcut-hint component. Each shortcut key SHALL use the owned quiet gray role, each action description SHALL use the distinct lighter muted gray role, and adjacent entries SHALL have exactly two display cells between them with no middle dot or other separator glyph. The Commands footer SHALL read `Type search  ↑↓ navigate  Enter open  Esc close`; the Plus Menu footer SHALL read `Type search  ↑↓ navigate  Space toggle  Esc close`. Width clipping SHALL preserve graphemes and complete key/action style boundaries in truecolor and 256-color modes.

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

#### Scenario: Dim a pinned prompt behind the Commands palette

- **WHEN** a sticky submitted prompt with a colored background is visible and the reader opens Commands
- **THEN** the prompt background and text SHALL recede with the rest of the tab body and strip
- **AND** the Commands panel SHALL remain full intensity
- **AND** closing Commands SHALL restore the prompt and strip to their original colors

#### Scenario: Repaint the backdrop with a modal open

- **WHEN** styled child content changes or the terminal resizes while a host modal is shown
- **THEN** every repainted exposed backdrop cell SHALL retain its dimmed presentation without changing the underlying child surface

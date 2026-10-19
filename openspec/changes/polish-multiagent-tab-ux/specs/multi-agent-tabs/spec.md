## MODIFIED Requirements

### Requirement: Tab status comes from the tab bridge, not the screen
Each chip SHALL show structured status:
- v2's ordered Braille progress frames `⠋`, `⠙`, `⠹`, `⠸`, `⠼`, `⠴`, `⠦`, `⠧`, `⠇`, and `⠏` at an 80 ms cadence while working.
- Yellow `?` while an extension, trust, or permission request awaits the user.
- Green `✓` when the last turn finished successfully.
- Red `✗` when the last turn was aborted or errored, or the tab crashed or failed.
- The same progress frames in the dim lifecycle color while starting or restoring.
- No glyph when idle with no settled turn.

A `✓` or `✗` settlement marker SHALL remain on the chip, including after any client views the tab, until that tab's next turn starts. Working frames SHALL use the resolved A1 accent reported by that specific tab. Status SHALL derive from sequenced engine events through the authenticated tab bridge, never terminal output, rendered cells, titles, or timing. A missing bridge SHALL degrade to process-level states and the launch accent. Open tabs SHALL have no suspended state or `◌` glyph.

#### Scenario: Background tab needs input
- **WHEN** an extension in a background tab requests confirmation
- **THEN** that chip SHALL show yellow `?` until the request is answered

#### Scenario: Background tab finishes
- **WHEN** an Agent's turn completes successfully, whether or not its tab is viewed
- **THEN** its chip SHALL show green `✓`
- **AND** the `✓` SHALL remain after the tab is viewed until that Agent starts another turn

#### Scenario: Agent is aborted
- **WHEN** the user aborts an Agent's running turn
- **THEN** its chip SHALL show red `✗` rather than returning to no glyph
- **AND** the `✗` SHALL remain after the tab is viewed until that Agent starts another turn

#### Scenario: Next turn replaces the marker
- **WHEN** a tab showing `✓` or `✗` starts a new turn
- **THEN** its chip SHALL show working progress frames instead of the marker

#### Scenario: Working tabs have independent accents
- **WHEN** two working tabs report different resolved A1 accents
- **THEN** each chip's v2 progress frame SHALL use its own reported accent

#### Scenario: Starting and restoring tabs animate dimly
- **WHEN** a tab is starting or restoring
- **THEN** its chip SHALL animate through the v2 progress frames at 80 ms in the dim lifecycle color rather than showing a static ellipsis or quarter-circle glyph

#### Scenario: Terminal-looking output cannot fake status
- **WHEN** a tab prints spinner characters, `✓`, or a title containing status words
- **THEN** chip status SHALL remain determined only by the bridge

#### Scenario: Out-of-order status
- **WHEN** a report has a lower sequence or superseded incarnation
- **THEN** the server SHALL discard it and retain the newer status

### Requirement: Resident lifecycle mechanics remain invisible
The resident attach client SHALL keep controller, subscription, and intentional-stop mechanics invisible:
- Input during automatic transfer SHALL be delivered once after acknowledgement, or refused before any prefix.
- Pointer motion and focus reports SHALL never consume the input budget of a pending view or cause key or paste input to be refused.
- The attach client SHALL NOT render an input-delivery notice row such as `Input was not sent; try again.` beneath the strip.
- Successful create and close SHALL commit only complete final topology states.
- A newly created Agent SHALL become visible only with its first drawn frame, or after a bounded fallback when the child never draws. The prior view SHALL remain until then and no cursor SHALL show.
- When no tabs remain, the terminal SHALL show only hoverable `+` with the child cursor hidden.

#### Scenario: Type immediately after switching
- **WHEN** the user switches tabs and immediately types, pastes, or clicks the child surface before controller acknowledgement
- **THEN** the input SHALL reach the new tab exactly once after ownership is acknowledged
- **AND** no read-only notice or takeover prompt SHALL appear

#### Scenario: Move the pointer while a new Agent starts
- **WHEN** the user chooses `+ Agent`, moves the pointer across the body many times, and types before the new Agent has drawn
- **THEN** every typed key SHALL reach the new Agent exactly once after it becomes input-ready
- **AND** no `Input was not sent` or other notice row SHALL appear

#### Scenario: Close an Agent normally
- **WHEN** an idle or confirmed-busy Agent tab is intentionally closed
- **THEN** its chip SHALL disappear once without displaying `✗`, `X`, `read-only-viewer`, or its retained body as a failed surface

#### Scenario: Close the last tab
- **WHEN** the final Agent or Settings tab closes
- **THEN** A1 SHALL clear the prior surface once and render only `+`
- **AND** no clock, notice background, text cursor, child cursor, stale cell, or instruction SHALL remain

#### Scenario: Create a tab normally
- **WHEN** a new Agent reaches its first input-ready complete surface
- **THEN** its chip, body, status bar, and editor SHALL appear together without a provisional flashing chip, blank body, stray cursor, or clear-only frame

### Requirement: Inline rename supports word motion
The resident inline tab-name editor SHALL retain grapheme-safe character editing. It SHALL support these keys:
- Ctrl+Left or Ctrl+Right moves to the preceding or following word boundary.
- Ctrl+Backspace deletes to the preceding word boundary.
- Ctrl+Delete deletes to the following word boundary.
- Ctrl+Z undoes the last edit and Ctrl+Y or Ctrl+Shift+Z redoes it.

Control- or Alt-modified letters SHALL never be inserted as text. Word operations SHALL never split a Unicode grapheme and SHALL preserve the selection rules, chip geometry, and manual-rename semantics.

#### Scenario: Move across words while renaming
- **WHEN** the user renames `fix login flow` and presses Ctrl+Left or Ctrl+Right
- **THEN** the caret SHALL move by one semantic word boundary in the requested direction without changing the name

#### Scenario: Delete a whole word
- **WHEN** the caret is before `login` in `fix login flow` and the user presses Ctrl+Delete
- **THEN** the name SHALL become `fix flow` with the caret at the same position

#### Scenario: Undo and redo a rename edit
- **WHEN** the user types characters, presses Ctrl+Z, then Ctrl+Y
- **THEN** Ctrl+Z SHALL restore the name and caret before the typed run and Ctrl+Y SHALL reapply it
- **AND** no `z` or `y` character SHALL be inserted

#### Scenario: Move across Unicode text
- **WHEN** a rename contains combining characters or emoji and the user alternates character and word movement or deletion
- **THEN** every caret position SHALL remain on a grapheme boundary

### Requirement: Resident Settings is one global utility tab
Bare A1 resident mode SHALL present at most one profile-global utility tab titled `Settings`. It SHALL render the owned global settings without owning an Agent session. A Settings route delivered before the child presenter has started SHALL be retained and presented once it starts. The launcher and `tabs.settings` action SHALL create or activate that singleton, and closing its screen or tab SHALL remove it. Resident Agents SHALL not advertise or execute `/settings`; `a1 solo` and `a1 pi` SHALL retain their existing command behavior.

#### Scenario: Open Settings from the launcher
- **WHEN** a resident Agent is viewed and the user chooses Settings from `+`
- **THEN** one tab titled `Settings` SHALL appear and show the owned Settings screen
- **AND** the Agent tab's editor, transcript, session, and surface SHALL remain unchanged

#### Scenario: Settings route arrives before startup completes
- **WHEN** the server delivers the Settings route before the Settings child's presenter is running
- **THEN** the Settings screen SHALL be shown once the presenter starts rather than an empty body

#### Scenario: Open Settings with the shortcut
- **WHEN** the user presses the default `Alt+Period` Settings action
- **THEN** the same singleton Settings tab SHALL be created or activated
- **AND** no `/settings` text or equivalent bytes SHALL enter an Agent editor

#### Scenario: Reuse global Settings
- **WHEN** the Settings tab already exists and the menu or shortcut requests Settings again
- **THEN** A1 SHALL activate that exact tab without creating another Settings process or tab

#### Scenario: Close Settings
- **WHEN** the user closes the Settings screen or its tab
- **THEN** the Settings utility tab SHALL be removed
- **AND** the previously selected surviving tab SHALL become visible with its unchanged complete surface

#### Scenario: Discover commands in a resident Agent
- **WHEN** resident Agent slash-command autocomplete or execution resolves built-in commands
- **THEN** `settings` SHALL be absent and `/settings` SHALL NOT open a route
- **AND** `a1 solo` and `a1 pi` SHALL retain their existing Settings commands

## ADDED Requirements

### Requirement: Open strip popups stay stable while tabs stream
An open context, overflow, or launcher popup SHALL be presented with each outer cell written once per frame with its final content. Child output beneath or beside the popup SHALL NOT clear, blank, or rewrite popup cells, and SHALL repaint only changed child cells outside the popup. Dismissing a popup SHALL restore the newest child content beneath it.

#### Scenario: Menu open while the Agent streams
- **WHEN** the tab context menu or `+` launcher is open over a tab whose Agent is streaming output
- **THEN** no presented frame SHALL blank or rewrite the popup's cells
- **AND** the popup SHALL remain visually stable until dismissed

#### Scenario: Dismiss over changed content
- **WHEN** the child changed rows beneath the popup while it was open and the popup is dismissed
- **THEN** those rows SHALL show the child's newest content

### Requirement: The strip row has a solid dark background
The strip row SHALL be painted across its full width with a fixed dark background, RGB `20,20,20` with a palette fallback. That background SHALL appear behind padding, the space after `+`, and the clock, and chips SHALL keep their own v2 backgrounds. The row SHALL NOT inherit a child-controlled default background or retain child output.

#### Scenario: Strip with tabs
- **WHEN** tabs are present
- **THEN** every strip cell outside chips, overflow, and `+` SHALL carry the dark row background

#### Scenario: Child output cannot reach the strip
- **WHEN** a child changes the terminal default background or writes content that would reach the first row
- **THEN** the strip row SHALL keep the dark background and show only strip content

### Requirement: Resident dialogs receive keys like solo
Owned full-screen dialogs and screens in a resident tab, including Changelog and Settings, SHALL respond to the same navigation, close, and interrupt keys as in `a1 solo`, whether the child terminal reports keys in legacy or kitty keyboard encoding. A lone Esc SHALL reach the child immediately rather than being held for a possible controller-boundary sequence.

#### Scenario: Scroll and close Changelog in a tab
- **WHEN** the Changelog dialog is open in a resident Agent and the user presses Up, Down, then Esc
- **THEN** the dialog SHALL scroll and then close, matching `a1 solo`

#### Scenario: Esc alone is not delayed
- **WHEN** the user presses only Esc in a resident Agent
- **THEN** the child SHALL receive Esc without waiting for another key

### Requirement: Resident presentation preserves footer hyperlinks
Hyperlinks written by a resident child, including the footer pull-request reference, SHALL reach the outer terminal as the same OSC 8 hyperlink targets on every resident presentation path. They SHALL NOT be reduced to plain styled text.

#### Scenario: Footer pull request link
- **WHEN** the viewed Agent's footer shows a pull-request number linked to its URL
- **THEN** the outer terminal SHALL receive that number as an OSC 8 hyperlink to the same URL, matching `a1 solo`

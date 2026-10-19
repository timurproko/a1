## MODIFIED Requirements

### Requirement: Tabs are managed from the strip, mouse, and assignable actions
A1 SHALL create a new Agent tab in the client's launch cwd from `Alt+A`; clicking `+` SHALL open a v2-style launcher containing `+ Agent`, a disabled separator, and `Settings` with the effective Settings shortcut right-aligned. Agent SHALL use the same creation flow. Settings SHALL create or show the singleton global Settings utility tab; its default `Alt+,` action SHALL do the same from another tab and SHALL hide the Settings tab while it is viewed. `Alt+1` through `Alt+9` SHALL view those positions and `Alt+0` the tenth. Actions for next, previous, move-right, and move-left SHALL exist for assignment but have no default keys. Left click on a tab SHALL view it. Right click on a visible Agent tab SHALL open a stable two-row context menu anchored beneath the pointer and clamped to the terminal, with `Close` first and `Rename` second; a Settings tab SHALL expose Close but SHALL NOT be renameable. Popup labels SHALL use effective shortcut assignments. Escape, a click elsewhere, a tab switch, or target removal SHALL dismiss a menu without action. Dragging an Agent chip after 250 ms or one column of movement SHALL calculate insertion from chip midpoints, preview only a real move with a v2 `│` marker, and issue one reorder with the captured expected revision on release; release away from the strip SHALL cancel. No tab-management slash command SHALL be exposed. A1 SHALL impose no configured or hard user tab count and SHALL never return a `tab-limit` refusal; only a concrete launch, persistence, containment, protocol, or operating-system resource failure MAY refuse creation. Each client SHALL keep its own viewed tab.

#### Scenario: Create from keyboard
- **WHEN** the user presses `Alt+A`
- **THEN** a new default-named Agent SHALL appear with its first complete surface and become viewed

#### Scenario: Create from strip
- **WHEN** the user clicks `+`
- **THEN** a persistent popup SHALL show `+ Agent`, a separator line, and `Settings` in that order
- **AND** Agent and Settings SHALL be independently hoverable and clickable

#### Scenario: Create from the grouped launcher
- **WHEN** the user selects `+ Agent`
- **THEN** the same creation flow as `Alt+A` SHALL run

#### Scenario: Open Settings from the grouped launcher
- **WHEN** the user selects Settings with or without existing Agent tabs
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

### Requirement: Tab chips reproduce the approved v2 strip
The strip SHALL use the v2 default top-row presentation as fixed behavior rather than settings: normal chips SHALL use RGB background `38,38,38` with foreground `170,170,170`, hovered chips background `48,48,48`, and the viewed chip background `55,55,55` with white text, with v2's palette fallback. Each chip SHALL render one space, an optional status glyph and space, the display name, and one space, with no close glyph and a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. When chips do not fit, the viewed chip SHALL stay visible, remaining tabs SHALL collapse into a keyboard-navigable `…` menu, and a trailing `+` SHALL always be reserved. The strip SHALL NOT wrap. The right edge SHALL show local time in the active owned time format followed by one blank terminal cell, whether or not tabs are open; no wallpaper text SHALL render.

#### Scenario: Wide names are clipped by display width
- **WHEN** a tab name contains CJK characters or emoji wider than the chip allows
- **THEN** its name SHALL clip with `…` at a grapheme boundary while the complete chip remains within 20 columns

#### Scenario: More tabs than fit
- **WHEN** the terminal cannot fit every chip
- **THEN** the viewed chip SHALL remain visible, `…` SHALL list hidden tabs, and assigned navigation or jump keys SHALL still reach them

#### Scenario: Close button is always present
- **WHEN** any visible tab chip is rendered or clicked after the legacy close-button behavior is removed
- **THEN** it SHALL contain no `×`, `X`, or separately clickable close region
- **AND** clicking anywhere in the chip SHALL invoke only its ordinary view or drag behavior

#### Scenario: Render the strip clock in twelve-hour form
- **WHEN** `timeFormat` is `8:00 PM`
- **THEN** the right-aligned clock SHALL use a non-padded 12-hour hour and uppercase `AM` or `PM`
- **AND** one blank cell SHALL remain between the clock's final glyph and the terminal's right edge

#### Scenario: Render the strip clock in twenty-four-hour form
- **WHEN** `timeFormat` is `20:00`
- **THEN** the right-aligned clock SHALL use zero-padded 24-hour `HH:mm`
- **AND** one blank cell SHALL remain between the clock's final digit and the terminal's right edge

#### Scenario: Clock with no tabs
- **WHEN** every tab has been closed
- **THEN** the strip SHALL show `+` and the right-aligned clock

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
- When no tabs remain, the terminal SHALL show only hoverable `+` and the strip clock, with the child cursor hidden.
- A tab switch or creation SHALL repaint the strip and body in place without first clearing the screen.

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
- **THEN** A1 SHALL clear the prior surface once and render only `+` and the strip clock
- **AND** no notice background, text cursor, child cursor, stale cell, or instruction SHALL remain

#### Scenario: Switch or create without a blank strip
- **WHEN** the viewed tab changes to another tab or a newly created tab
- **THEN** no presented frame SHALL clear the screen or blank tab names before the new tab's content is painted

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
Bare A1 resident mode SHALL present at most one profile-global utility tab titled `Settings`. It SHALL render the owned global settings without owning an Agent session. A Settings route delivered before the child presenter has started SHALL be retained and presented once it starts. The launcher SHALL create or activate that singleton. The `tabs.settings` action SHALL toggle it: while Settings is viewed it SHALL hide that tab from the strip, keep its process running, and show the previous tab, and otherwise it SHALL show the singleton. To open Settings without a startup delay, the attach client SHALL start a hidden Settings tab in the background when tabs exist without one; a Settings tab joins the strip only once it is viewed. Closing its tab SHALL remove it. Settings are shared: every running resident tab SHALL reread the shared settings document when it changes and apply each changed live setting, such as the accent color, without a restart. Its screen is the tab, so it SHALL offer no screen-level Esc close or Esc close hint, and one Ctrl+C SHALL NOT dismiss it. Resident Agents SHALL not advertise or execute `/settings`; `a1 solo` and `a1 pi` SHALL retain their existing command behavior.

#### Scenario: Open Settings from the launcher
- **WHEN** a resident Agent is viewed and the user chooses Settings from `+`
- **THEN** one tab titled `Settings` SHALL appear and show the owned Settings screen
- **AND** the Agent tab's editor, transcript, session, and surface SHALL remain unchanged

#### Scenario: Settings route arrives before startup completes
- **WHEN** the server delivers the Settings route before the Settings child's presenter is running
- **THEN** the Settings screen SHALL be shown once the presenter starts rather than an empty body

#### Scenario: Open Settings with the shortcut
- **WHEN** the user presses the default `Alt+,` Settings action
- **THEN** the same singleton Settings tab SHALL be created or activated
- **AND** no `/settings` text or equivalent bytes SHALL enter an Agent editor

#### Scenario: Reuse global Settings
- **WHEN** the Settings tab already exists but is not viewed and the menu or shortcut requests Settings again
- **THEN** A1 SHALL activate that exact tab without creating another Settings process or tab

#### Scenario: Toggle Settings hidden with the shortcut
- **WHEN** the Settings tab is viewed and the user presses the Settings shortcut
- **THEN** the Settings chip SHALL leave the strip and the previously selected tab SHALL become visible
- **AND** pressing the shortcut again SHALL show Settings without starting another process

#### Scenario: Hidden Settings never opens by itself
- **WHEN** Settings is hidden and the user closes the last visible tab
- **THEN** the hidden Settings tab SHALL close too and the strip SHALL show only `+` and the clock
- **AND** a closed viewed tab SHALL never be replaced by the hidden Settings tab

#### Scenario: Settings opens without a startup delay
- **WHEN** Agent tabs have been open for a few seconds and the user first presses the Settings shortcut
- **THEN** the already running hidden Settings tab SHALL be shown without waiting for a new process

#### Scenario: A setting change reaches every running tab
- **WHEN** Agent tabs are running and the user changes the accent color in Settings
- **THEN** every running Agent tab SHALL switch to the new accent without being reopened

#### Scenario: Esc inside the Settings tab
- **WHEN** the Settings tab is viewed with no search or value menu open and the user presses Esc
- **THEN** the Settings tab SHALL remain open and its standing hint SHALL NOT offer Esc close

#### Scenario: Close Settings
- **WHEN** the user closes the Settings tab
- **THEN** the Settings utility tab SHALL be removed
- **AND** the previously selected surviving tab SHALL become visible with its unchanged complete surface

#### Scenario: Discover commands in a resident Agent
- **WHEN** resident Agent slash-command autocomplete or execution resolves built-in commands
- **THEN** `settings` SHALL be absent and `/settings` SHALL NOT open a route
- **AND** `a1 solo` and `a1 pi` SHALL retain their existing Settings commands

### Requirement: Double Ctrl+C reliably detaches the resident interface
The attach client SHALL recognize the semantic outer-terminal `Ctrl+C` event across supported terminal encodings before representation can obscure its identity. The first press SHALL reach the child exactly once. A second press inside the clear/exit interval SHALL detach without reaching or terminating any child, whichever tab is viewed, including Settings. When the owned `quitAnimation` setting is on (the default), detach SHALL first play bare A1's fall quit animation over the presented screen, bounded in duration, and then restore the parent terminal.

#### Scenario: Leave resident A1 from an ordinary prompt
- **WHEN** the user presses `Ctrl+C` twice inside the clear/exit interval
- **THEN** the first press SHALL retain its solo A1 clear, copy, or interrupt meaning, the second SHALL close the attached A1 interface, and every resident agent SHALL keep running

#### Scenario: Leave from the Settings tab with the quit animation
- **WHEN** the Settings tab or any Agent tab is viewed and the user presses `Ctrl+C` twice inside the clear/exit interval
- **THEN** the fall quit animation SHALL play over the presented screen and the parent terminal SHALL be restored with a visible cursor

#### Scenario: Quit animation is off
- **WHEN** `quitAnimation` is off and the user detaches with double `Ctrl+C`
- **THEN** the parent terminal SHALL be restored immediately without an animation

#### Scenario: Return after detach
- **WHEN** the user detaches with double `Ctrl+C` and later runs bare `a1`
- **THEN** A1 SHALL reattach to the same running tabs with their work and retained presentations advanced during the absence

#### Scenario: Press Ctrl+C outside the interval
- **WHEN** two `Ctrl+C` presses are separated by at least the clear/exit interval or by another completed input sequence
- **THEN** both presses SHALL reach the child independently and the attach client SHALL remain connected

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

### Requirement: Resident tabs keep the outer terminal theme for unset colors
The resident presentation SHALL publish a child's default foreground, default background, or palette entry to the outer terminal only when the child set that color. Colors a child left at the emulator's initial values SHALL be reset to the outer terminal's own theme rather than replaced with emulator defaults.

#### Scenario: New Agent without explicit colors
- **WHEN** a newly created Agent has not set its default background
- **THEN** its body SHALL show the outer terminal's own background, not black

#### Scenario: Child sets its own background
- **WHEN** a child sets its default background with OSC 11
- **THEN** the outer terminal SHALL show that background while the tab is viewed

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

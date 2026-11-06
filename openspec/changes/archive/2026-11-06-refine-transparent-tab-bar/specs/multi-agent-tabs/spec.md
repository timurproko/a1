## MODIFIED Requirements

### Requirement: Tab chips reproduce the approved v2 strip
The strip SHALL retain the approved v2 geometry, clipping, status, overflow, and active-chip treatment while adapting non-active chrome to the configured tab-bar canvas. With a transparent canvas, inactive chips, the overflow control, and `+` SHALL retain the terminal default background at rest instead of painting opaque neutral blocks; their hover feedback SHALL retain that background and add a consistent accent-derived foreground emphasis. The viewed chip SHALL keep its existing resolved active treatment. Black and Accent canvases SHALL retain readable canvas-relative inactive and hover treatments. Each chip SHALL render one space, an optional status glyph and space, the display name, and one space, with no close glyph and a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. When chips do not fit, the viewed chip SHALL stay visible when space permits, and a trailing `+` SHALL be reserved while at least one plus-menu kind is enabled. The muted single-column centered `⋯` overflow control SHALL appear only while some chips do not fit and SHALL open a keyboard- and mouse-navigable popup listing only tabs whose chips are not drawn, without checkmarks, in strip order. Each row SHALL reserve a one-cell status-glyph slot and separator before its name; it SHALL show the same current status glyph and semantic color as the chip when present, or a blank slot while idle. Names SHALL clip by display width without shifting the icon slot, leaking icon style into the title, or changing popup hit geometry. Choosing a popup row SHALL view exactly that tab with either top or bottom strip placement and place its chip in the currently active chip's strip slot when that chip was drawn and the two do not both fit, even if a different non-swap view request was pending; the displaced tab SHALL appear in the popup. Other visible chips SHALL remain visible when geometry permits, and a pending view request SHALL NOT briefly repaint the old viewed chip in the slot or replay the newly drawn chip's hidden-name transition. The popup SHALL track the current drawn chips across resize, reorder, creation, removal, and view changes; removed tabs SHALL NOT remain actionable. The strip SHALL NOT wrap. The right edge SHALL render the configured right-side items followed by one blank terminal cell; no wallpaper text SHALL render.

#### Scenario: Transparent inactive controls blend with the canvas
- **WHEN** the tab-bar canvas is Transparent and the strip shows an inactive tab, overflow, or `+`
- **THEN** the control SHALL paint no opaque neutral background at rest
- **AND** hovering it SHALL retain the terminal background and add the same accent-derived foreground emphasis without changing its hit range
- **AND** the active tab SHALL retain its existing selected treatment

#### Scenario: Wide names are clipped by display width
- **WHEN** a tab name contains CJK characters or emoji wider than the chip allows
- **THEN** its name SHALL clip with `…` at a grapheme boundary while the complete chip remains within 20 columns

#### Scenario: More tabs than fit
- **WHEN** the terminal cannot fit every chip
- **THEN** the viewed chip SHALL remain visible when space permits, `⋯` SHALL list only the tabs without drawn chips, next/previous navigation SHALL still reach every tab, and Alt+number SHALL select only a chip currently drawn in that numbered left-to-right position

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
- **WHEN** every tab has been closed and at least one plus-menu kind is enabled
- **THEN** the strip SHALL show `+` and the right-aligned clock

#### Scenario: Only hidden tabs appear when some chips overflow
- **WHEN** a terminal has three open tabs and its strip can show only one tab chip
- **THEN** the overflow popup SHALL list only the other two tabs, in strip order and without checkmarks
- **AND** selecting one SHALL view it in the strip and move the currently active chip into the popup

#### Scenario: Strip menus are pointer-only
- **WHEN** hidden chips exist and the user clicks the centered `⋯` control
- **THEN** the hidden-tab popup SHALL open, with its existing pointer hover and keyboard Up/Down/Enter/Esc navigation
- **WHEN** the configured plus menu includes a utility kind and the user clicks `+`, including when no tabs exist
- **THEN** the add-tab popup SHALL open without creating a tab until an item is chosen
- **WHEN** only Agent is enabled and the user clicks `+`
- **THEN** one Agent SHALL be created directly without opening a popup
- **AND** `+` SHALL be absent when no plus-menu kind is enabled
- **AND** neither Alt+- nor Alt+= SHALL be assigned to or consumed by a tab-menu shortcut, even if a prior user binding names the removed menu actions

#### Scenario: Jump shortcuts track only drawn chips
- **WHEN** the strip draws two chips after a narrow resize or hidden-tab swap, regardless of their registry indexes
- **THEN** Alt+1 SHALL select the first drawn chip and Alt+2 the second
- **AND** Alt+3 SHALL do nothing, without scheduling a later selection if more tabs appear

#### Scenario: An unrelated pending view cannot displace the active chip's swap slot
- **WHEN** the committed active chip and a different chip with an ordinary pending view request are both drawn
- **AND** the user selects a hidden tab from `⋯` before the ordinary request commits
- **THEN** the hidden tab SHALL replace the committed active chip, not the different requested chip

#### Scenario: Hidden-tab selection keeps the strip stable
- **WHEN** the user chooses a hidden named tab and its view request is pending
- **THEN** the incoming chip SHALL occupy the currently active chip's slot without a transient return of the displaced chip
- **AND** any hidden automatic title animation already in progress SHALL NOT replay when that chip appears; other drawn chips SHALL retain their display

#### Scenario: Hidden-tab status icons remain aligned
- **WHEN** hidden tabs include a working tab, an attention-needing tab, and an idle tab
- **THEN** each popup row SHALL reserve the same icon-and-separator cells before its name, showing the strip's current status glyph and color for working and attention states and a blank icon slot for idle
- **AND** clipping a long name or hovering a row SHALL NOT shift the icon or alter the row's tab target

#### Scenario: Swap a hidden tab while two chips fit
- **WHEN** two chips are visible, the user views one of them, and they choose a hidden named tab from `⋯`
- **THEN** the named tab SHALL occupy the currently active chip's position
- **AND** the other visible chip SHALL remain drawn, while the displaced chip SHALL become a menu entry

#### Scenario: Click a named tab in a bottom-positioned overflow popup
- **WHEN** the tab bar is at the bottom and the user clicks the second hidden row, named `ask-me-something`, in an overflow popup
- **THEN** the `ask-me-something` tab SHALL be viewed, not the first or previously viewed tab
- **AND** clicking another drawn popup row SHALL view only that row's named tab

#### Scenario: Visibility follows a resize
- **WHEN** a strip expands to show more chips or shrinks to hide some chips while its popup is open
- **THEN** the popup SHALL show only undrawn chips in order without stale rows or actions
- **AND** the popup SHALL cease to be available when every tab fits

#### Scenario: Overflow at an extreme width
- **WHEN** the terminal is too narrow to show ordinary chip geometry beside the reserved controls
- **THEN** the strip and popup SHALL stay within the terminal columns without wrapping or claiming a chip is visible when it was not drawn

### Requirement: The strip row has a solid dark background
The strip row SHALL repaint its full width with the live `tabBarBackgroundStyle`: Transparent SHALL restore the terminal default background, Black SHALL use the established dark canvas, and Accent SHALL use the active profile accent canvas. The selected canvas SHALL appear behind padding, the space after controls, and the right-side group. Child-controlled colors and output SHALL NOT leak into the strip. Chips and controls SHALL apply their canvas-relative states without replacing a transparent resting canvas with fixed black blocks.

#### Scenario: Strip with tabs
- **WHEN** the tab-bar background is Transparent and tabs are present
- **THEN** every resting strip cell outside the active chip SHALL retain the terminal default background unless another visible state explicitly owns that cell

#### Scenario: Child output cannot reach the strip
- **WHEN** a child changes the terminal default background or writes content that would reach the strip row
- **THEN** the strip row SHALL show only current strip content over the configured canvas semantics

### Requirement: The empty resident shell presents the a1 landing
While the attach client has no tab to show and no view request pending, it SHALL keep the strip with its `+` control and clock and SHALL present the a1 landing in the body: the launch cwd, formatted and placed as an Agent tab's footer shows it (one-cell left gutter on the second-to-last body row, with the home directory as `~`, in the footer's dim color), a blank row below the cwd, and the three-row half-block `a1` wordmark in the profile's accent color on the rows above it (omitted where half-block glyphs are unsupported or rows run out), so the folder stays in place when a tab opens or closes at either strip position. This SHALL hold from the first registry list the client receives: a list with no running tab and no pending create SHALL paint the landing at once, without waiting for a tab to have been shown first. The landing body SHALL be painted with the canvas the `backgroundStyle` setting gives Agent tabs, and SHALL leave the terminal background when it is `transparent`. When an Agent is added from the landing, the single pending Agent chip and complete idle editor/footer SHALL replace the landing on the initiating event; the first drawn Agent frame SHALL replace that pending presentation without a wipe or fade. A hidden utility tab SHALL retain its existing first-draw handoff. A tab the server is starting for this attach SHALL keep the established first-draw gate instead of the landing. The landing SHALL hold no input: keys, paste, and body mouse input SHALL reach no child, while tab shortcuts, the `+` launcher and its popups, strip hover, strip mouse input, and the double-`Ctrl+C` detach SHALL behave exactly as with tabs. The landing SHALL render no cursor and SHALL never be shown while a tab is viewed.

#### Scenario: Last tab closes into the landing
- **WHEN** the final Agent or Settings tab closes while the attach client stays open and the strip is at the top
- **THEN** the strip SHALL show `+` and the clock and the body SHALL show the launch cwd on the row where an Agent's footer shows it, a blank row below it, and the wordmark above it
- **AND** no cursor SHALL show

#### Scenario: Empty landing omits the package version
- **WHEN** the landing is visible at either tab-bar position
- **THEN** its left side SHALL show the wordmark and launch cwd without a package-version label
- **AND** the row below the cwd SHALL remain blank while the optional strip Version item remains independently configurable

#### Scenario: A fresh attach lists no running tab
- **WHEN** the attach client's first registry list holds only stopped records or nothing, and no Agent start is pending for this attach
- **THEN** the strip with `+` and the clock and the landing SHALL be painted immediately
- **AND** any start failure notice SHALL be shown over it

#### Scenario: A fresh attach waits for a starting tab
- **WHEN** the server is starting an Agent for this attach and the first registry list carries that starting tab
- **THEN** the client SHALL keep the first-draw gate for that tab and SHALL NOT show the landing

#### Scenario: The folder does not move when a tab opens
- **WHEN** the user creates an Agent from the landing at either tab bar position
- **THEN** the Agent's footer SHALL show the cwd on the same row and one-cell-gutter column as the landing showed it

#### Scenario: Start an Agent from the landing
- **WHEN** the user presses the `New A1 tab` shortcut or chooses `+ Agent` from the launcher on the landing
- **THEN** one Agent SHALL be created and presented through the ordinary tab UI

#### Scenario: Open Settings from the landing
- **WHEN** the user presses the `Open Settings tab` shortcut or chooses `Settings` from the `+` launcher on the landing
- **THEN** the hidden Settings tab kept ready beside the landing SHALL be shown through the ordinary tab UI without starting a new process

#### Scenario: Adding a tab hides the landing
- **WHEN** the user adds an Agent from the landing
- **THEN** the landing SHALL immediately give way to one pending Agent chip and a complete idle editor/footer, which the first drawn Agent frame SHALL replace at once
- **WHEN** the user opens a utility tab from the landing
- **THEN** the landing SHALL remain until the utility tab's first drawn frame replaces it

#### Scenario: The wordmark hands over to the Agent caret
- **WHEN** the user starts an Agent from the landing
- **THEN** no wipe or fade SHALL run: the complete idle editor/footer SHALL replace the landing, then the Agent's first drawn frame SHALL replace it at once

#### Scenario: The landing wordmark has a clean a
- **WHEN** the landing is visible with half-block glyphs supported
- **THEN** its accent-colored `a1` wordmark SHALL NOT render a stray full block to the left of the `a`'s middle row
- **AND** its middle row SHALL have a lower-half left descender with the upper half of that cell empty, matching the approved `a` shape without increasing the wordmark's width or moving its placement
- **AND** the cwd SHALL start after the same one-cell gutter as the Agent footer and the row below it SHALL remain blank

#### Scenario: The landing follows the background setting
- **WHEN** `backgroundStyle` is `accent` or `dark` and the landing is shown
- **THEN** every body cell SHALL use the canvas an Agent tab would use for that style and accent

#### Scenario: A lone hidden Settings tab is not an Agent
- **WHEN** bare `a1` attaches and the registry holds only a hidden Settings tab
- **THEN** the server SHALL create one A1 tab in the launch cwd and the client SHALL view it, not the Settings tab

#### Scenario: Small terminal
- **WHEN** the body has fewer rows or columns than the full header needs
- **THEN** the header SHALL be clipped to the body without wrapping or overflowing it

### Requirement: Resident right-side items expose configuration controls

The complete physically rendered right-side group, from the first visible Version or Time cell through the final visible item and including the configured separation between them, SHALL have one explicit hover and hit range. Hovering any cell in that range SHALL apply one consistent group treatment to every rendered item. Right-clicking anywhere in the group SHALL open a context menu containing `Configure`; activating it SHALL open the native searchable multi-select titled `Right Side`, where Version and Time toggle independently and persist in fixed order. Items omitted by narrow layout SHALL contribute no cells to the group, and space outside the rendered group SHALL not consume child input.

The group's resting foreground SHALL use the resident status/footer dim color. Its hover treatment SHALL follow the same canvas-aware additive visual language as the transparent strip controls while remaining independent of tab chips, popups, overflow, drag targets, and child-surface input.

#### Scenario: Hover the complete configured group

- **WHEN** Version and Time are rendered and the pointer rests over either item or their internal separation
- **THEN** the complete Version-and-Time group SHALL show one continuous hover state
- **AND** its full rendered span SHALL remain one configuration hit target

#### Scenario: Configure Version from the strip

- **WHEN** the user right-clicks anywhere in the rendered right-side group and chooses `Configure`
- **THEN** the native `Right Side` multi-select SHALL open with Version and Time rows
- **AND** toggling a row SHALL persist the ordered `tabBarRightItems` subset and repaint the strip live

#### Scenario: Narrow strip omits Version

- **WHEN** the strip is too narrow to render Version beside the required controls and Time
- **THEN** the right-side group hit range SHALL cover only the rendered Time item
- **AND** tabs, overflow, plus, and child input SHALL retain valid geometry

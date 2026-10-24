## MODIFIED Requirements

### Requirement: Tab chips reproduce the approved v2 strip
The strip SHALL use the v2 default top-row presentation as fixed behavior rather than settings: normal chips SHALL use RGB background `38,38,38` with foreground `170,170,170`, hovered chips background `48,48,48`, and the viewed chip background `55,55,55` with white text, with v2's palette fallback. Each chip SHALL render one space, an optional status glyph and space, the display name, and one space, with no close glyph and a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. When chips do not fit, the viewed chip SHALL stay visible when space permits, and a trailing `+` SHALL always be reserved. The muted single-column centered `⋯` overflow control SHALL appear only while some chips do not fit and SHALL open a keyboard- and mouse-navigable popup listing only tabs whose chips are not drawn, without checkmarks, in strip order. Each row SHALL reserve a one-cell status-glyph slot and separator before its name; it SHALL show the same current status glyph and semantic color as the chip when present, or a blank slot while idle. Names SHALL clip by display width without shifting the icon slot, leaking icon style into the title, or changing popup hit geometry. Choosing a popup row SHALL view exactly that tab with either top or bottom strip placement and place its chip in the currently active chip's strip slot when that chip was drawn and the two do not both fit, even if a different non-swap view request was pending; the displaced tab SHALL appear in the popup. Other visible chips SHALL remain visible when geometry permits, and a pending view request SHALL NOT briefly repaint the old viewed chip in the slot or replay the newly drawn chip's hidden-name transition. The popup SHALL track the current drawn chips across resize, reorder, creation, removal, and view changes; removed tabs SHALL NOT remain actionable. The strip SHALL NOT wrap. The right edge SHALL show local time in the active owned time format followed by one blank terminal cell, whether or not tabs are open; no wallpaper text SHALL render.

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
- **WHEN** every tab has been closed
- **THEN** the strip SHALL show `+` and the right-aligned clock

#### Scenario: Only hidden tabs appear when some chips overflow
- **WHEN** a terminal has three open tabs and its strip can show only one tab chip
- **THEN** the overflow popup SHALL list only the other two tabs, in strip order and without checkmarks
- **AND** selecting one SHALL view it in the strip and move the currently active chip into the popup

#### Scenario: Strip menus are pointer-only
- **WHEN** hidden chips exist and the user clicks the centered `⋯` control
- **THEN** the hidden-tab popup SHALL open, with its existing pointer hover and keyboard Up/Down/Enter/Esc navigation
- **WHEN** the user clicks `+`, including when no tabs exist
- **THEN** the add-tab popup SHALL open without creating a tab until an item is chosen
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

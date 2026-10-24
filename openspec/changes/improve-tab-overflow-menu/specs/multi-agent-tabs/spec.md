## MODIFIED Requirements

### Requirement: Tab chips reproduce the approved v2 strip
The strip SHALL use the v2 default top-row presentation as fixed behavior rather than settings: normal chips SHALL use RGB background `38,38,38` with foreground `170,170,170`, hovered chips background `48,48,48`, and the viewed chip background `55,55,55` with white text, with v2's palette fallback. Each chip SHALL render one space, an optional status glyph and space, the display name, and one space, with no close glyph and a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. When chips do not fit, the viewed chip SHALL stay visible when space permits, and a trailing `+` SHALL always be reserved. The muted single-column `…` overflow control SHALL appear only while some chips do not fit and SHALL open a keyboard- and mouse-navigable popup listing every available tab once in strip order. Each popup row SHALL show a checkmark if and only if that tab's chip is visible on the current strip; hidden tabs SHALL have no checkmark. The checkmark SHALL describe strip visibility rather than the viewed tab, and SHALL follow the current drawn chips across resize, reorder, creation, removal, and view changes. Choosing any popup row, including a hidden named tab, SHALL view exactly the tab named on that row with either top or bottom strip placement; removed tabs SHALL NOT remain actionable. The strip SHALL NOT wrap. The right edge SHALL show local time in the active owned time format followed by one blank terminal cell, whether or not tabs are open; no wallpaper text SHALL render.

#### Scenario: Wide names are clipped by display width
- **WHEN** a tab name contains CJK characters or emoji wider than the chip allows
- **THEN** its name SHALL clip with `…` at a grapheme boundary while the complete chip remains within 20 columns

#### Scenario: More tabs than fit
- **WHEN** the terminal cannot fit every chip
- **THEN** the viewed chip SHALL remain visible when space permits, `…` SHALL list every available tab, and assigned navigation or jump keys SHALL still reach them

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

#### Scenario: All tabs appear when some chips overflow
- **WHEN** a terminal has three open tabs and its strip can show only one tab chip
- **THEN** the overflow popup SHALL list all three tabs once, in strip order
- **AND** only the tab with a visible chip SHALL have a checkmark, regardless of which popup row has keyboard focus
- **AND** selecting a hidden tab SHALL view it through the normal tab-switch flow

#### Scenario: Click a named tab in a bottom-positioned overflow popup
- **WHEN** the tab bar is at the bottom and the user clicks the second row, named `ask-me-something`, in a five-row overflow popup
- **THEN** the `ask-me-something` tab SHALL be viewed, not the first or previously viewed tab
- **AND** clicking another visible popup row SHALL view only that row's named tab

#### Scenario: Visibility follows a resize
- **WHEN** a strip expands to show more chips or shrinks to hide some chips while its popup is open
- **THEN** the popup SHALL reflect the current set of drawn chip IDs and their ordered names without stale markers or actions
- **AND** the popup SHALL cease to be available when every tab fits

#### Scenario: Overflow at an extreme width
- **WHEN** the terminal is too narrow to show ordinary chip geometry beside the reserved controls
- **THEN** the strip and popup SHALL stay within the terminal columns without wrapping or claiming a chip is visible when it was not drawn

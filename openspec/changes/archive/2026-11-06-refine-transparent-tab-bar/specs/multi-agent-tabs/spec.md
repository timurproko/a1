## MODIFIED Requirements

### Requirement: Tab chips reproduce the approved v2 strip
The strip SHALL retain the approved v2 geometry, clipping, status, overflow, and active-chip treatment while adapting non-active chrome to the configured tab-bar canvas. With a transparent canvas, inactive chips, the overflow control, and `+` SHALL retain the terminal default background at rest instead of painting opaque neutral blocks; their hover feedback SHALL use the same subtle accent-selected background as owned popup menus while retaining their resting label foreground. The viewed chip SHALL keep its existing resolved active treatment. Black SHALL retain its readable dark inactive-tab treatment. Accent inactive tabs SHALL rest directly on the accent canvas and hover with a lighter form of that canvas, while Transparent inactive tabs SHALL remain text on the terminal-default background at rest. Each chip SHALL render one space, an optional status glyph and space, the display name, and one space, with no close glyph and a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. When chips do not fit, the viewed chip SHALL stay visible when space permits, and a trailing `+` SHALL be reserved while at least one plus-menu kind is enabled. The muted single-column centered `⋯` overflow control SHALL appear only while some chips do not fit and SHALL open a keyboard- and mouse-navigable popup listing only tabs whose chips are not drawn, without checkmarks, in strip order. Each row SHALL reserve a one-cell status-glyph slot and separator before its name; it SHALL show the same current status glyph and semantic color as the chip when present, or a blank slot while idle. Names SHALL clip by display width without shifting the icon slot, leaking icon style into the title, or changing popup hit geometry. Choosing a popup row SHALL view exactly that tab with either top or bottom strip placement and place its chip in the currently active chip's strip slot when that chip was drawn and the two do not both fit, even if a different non-swap view request was pending; the displaced tab SHALL appear in the popup. Other visible chips SHALL remain visible when geometry permits, and a pending view request SHALL NOT briefly repaint the old viewed chip in the slot or replay the newly drawn chip's hidden-name transition. The popup SHALL track the current drawn chips across resize, reorder, creation, removal, and view changes; removed tabs SHALL NOT remain actionable. The strip SHALL NOT wrap. The right edge SHALL render the configured right-side items followed by one blank terminal cell; no wallpaper text SHALL render.

#### Scenario: Transparent inactive controls blend with the canvas
- **WHEN** the tab-bar canvas is Transparent and the strip shows an inactive tab, overflow, or `+`
- **THEN** the control SHALL paint no opaque neutral background at rest
- **AND** hovering it SHALL use the owned popup menu's accent-selected background without changing its label foreground or hit range
- **AND** the active tab SHALL retain its existing selected treatment

#### Scenario: Accent inactive tabs inherit the canvas
- **WHEN** the tab-bar canvas is Accent and an inactive tab is shown
- **THEN** that tab SHALL use the accent canvas at rest instead of a dark neutral block
- **AND** hover SHALL use the same lighter accent canvas language as the strip controls
- **AND** Black SHALL keep its dark inactive-tab treatment while Transparent keeps text on its terminal-default background at rest

#### Scenario: Black and Accent plus controls stay on their canvas
- **WHEN** the tab-bar canvas is Black or Accent and the strip shows `+`
- **THEN** `+` SHALL rest directly on the configured strip canvas without a separate black block
- **AND** hovering `+` or the grouped right side SHALL use the same subtly lightened canvas background without recoloring either label
- **AND** Black hover SHALL remain a neutral lighter black while Accent hover SHALL preserve the accent-canvas hue

#### Scenario: Creating a tab clears relocated plus hover
- **WHEN** the pointer activates `+` and the resulting tab chip moves `+` to a different column without pointer motion
- **THEN** the relocated `+` SHALL render at rest rather than retaining hover from its old position
- **AND** only a new pointer event over the relocated hit range SHALL restore its hover

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
While the attach client has no tab to show and no view request pending, it SHALL keep the strip with its `+` control and clock and SHALL present a ready local Agent editor and status footer in the body. The launch cwd SHALL be formatted and placed exactly where an Agent footer shows it, with the same one-cell gutter and dim style, and neither a wordmark nor package-version label SHALL occupy the editor or footer. This ready prompt SHALL appear from the first registry list with no running tab or pending create. Its body SHALL follow the Agent `backgroundStyle`, including the terminal default for `transparent`.

Printable Unicode keys, ordinary single-line cursor/editing keys, and paste SHALL update a bounded local draft without starting a process or forwarding input to any child. Enter on a non-empty draft SHALL create exactly one Agent, immediately present its pending chip, submitted-message bar, empty editor, and footer, and bind the draft plus submit action to that pending creation; buffered input SHALL be released only after that exact Agent commits its view. The submitted-message preview SHALL remain painted across the initial pre-input child commit and every intermediate startup or Working surface, then SHALL hand off directly to the first coherent same-Agent surface whose retained content contains the submitted message. Empty Enter SHALL do nothing. Cancellation or creation failure SHALL discard the bound submission without delivering it to a later Agent, hidden utility, or unrelated viewed tab. Tab shortcuts, `+` and its popups, strip pointer interactions, and double-`Ctrl+C` detach SHALL retain precedence and existing behavior. A hidden utility SHALL retain its first-draw handoff, a tab already starting for this attach SHALL retain its first-draw gate, and the ready prompt SHALL never be shown while a tab is viewed.

#### Scenario: Last tab closes into the landing
- **WHEN** the final Agent or Settings tab closes while the attach client stays open
- **THEN** the strip SHALL show `+` and the clock and the body SHALL show an empty editor, status footer, cwd, and caret at either strip position

#### Scenario: Empty prompt omits passive branding and version
- **WHEN** the ready prompt is visible
- **THEN** it SHALL show no landing wordmark or package-version label
- **AND** the optional strip Version item SHALL remain independently configurable

#### Scenario: A fresh attach lists no running tab
- **WHEN** the attach client's first registry list holds only stopped records or nothing, and no Agent start is pending for this attach
- **THEN** the strip and ready prompt SHALL be painted immediately
- **AND** any start failure notice SHALL be shown over it

#### Scenario: A fresh attach waits for a starting tab
- **WHEN** the server is starting an Agent for this attach and the first registry list carries that starting tab
- **THEN** the client SHALL keep the first-draw gate for that tab and SHALL NOT show the ready prompt

#### Scenario: Compose before creating an Agent
- **WHEN** the user types, edits, or pastes into the ready prompt
- **THEN** the local draft and caret SHALL update without creating an Agent or forwarding input to a child
- **AND** an empty Enter SHALL create nothing

#### Scenario: Submit directly from the empty shell
- **WHEN** the ready prompt holds a non-empty draft and the user presses Enter
- **THEN** exactly one Agent SHALL be created and its pending presentation SHALL appear immediately
- **AND** the pending body SHALL immediately show one blank breathing row followed by the submitted prompt in a full-width accent-projected message row with the muted ` ❯ ` prefix, ordinary prompt text, and right-aligned submission time when width permits
- **AND** the provisional message row SHALL occupy the same vertical position as the first real submitted prompt so handoff does not jump
- **AND** the configured 12- or 24-hour time format and palette fallback SHALL match the final Agent design while the editor remains empty
- **AND** the draft and submit action SHALL reach only that Agent after its view commits

#### Scenario: Failed direct submission cannot leak
- **WHEN** direct Agent creation is cancelled, fails, or is superseded before its view commits
- **THEN** its bound draft SHALL be discarded and SHALL NOT reach a later Agent, hidden utility, or other tab

#### Scenario: The folder does not move when a tab opens
- **WHEN** the user creates an Agent from the ready prompt at either tab-bar position
- **THEN** the Agent footer SHALL show the cwd on the same row and one-cell-gutter column

#### Scenario: Start an Agent from the landing
- **WHEN** the user presses the `New A1 tab` shortcut or chooses `+ Agent` from the ready prompt
- **THEN** one Agent SHALL be created and presented through the ordinary tab UI

#### Scenario: Open Settings from the landing
- **WHEN** the user presses the `Open Settings tab` shortcut or chooses `Settings` from `+`
- **THEN** the hidden Settings tab kept ready SHALL be shown without receiving or consuming the Agent draft

#### Scenario: Adding a tab hides the landing
- **WHEN** the user submits a non-empty draft from the ready prompt
- **THEN** the ready prompt SHALL immediately give way to the pending Agent presentation
- **WHEN** the user opens a utility tab from the ready prompt
- **THEN** the ready prompt SHALL remain until the utility tab's first drawn frame replaces it

#### Scenario: The wordmark hands over to the Agent caret
- **WHEN** the user starts an Agent from the ready prompt
- **THEN** no wipe or fade SHALL run between the ready editor, provisional submission, and first real submitted-message surface

#### Scenario: The landing wordmark has a clean a
- **WHEN** the ready prompt is visible
- **THEN** the obsolete landing wordmark SHALL NOT render in the editor body
- **AND** the cwd SHALL retain the Agent footer's one-cell gutter and row

#### Scenario: Pending and first-draw handoff
- **WHEN** a direct prompt submission starts an Agent
- **THEN** the pending chip, provisional submitted-prompt content, empty editor, and footer SHALL replace the ready prompt without a wipe or fade
- **AND** the initial committed child frame that predates deferred input SHALL remain cached without replacing the provisional prompt
- **AND** intermediate startup or Working surfaces that do not yet contain the submitted message SHALL remain cached without replacing the provisional prompt
- **AND** the first coherent same-Agent surface containing the submitted-message marker and accepted prompt content SHALL replace the provisional presentation directly without an intervening blank or editor flash
- **AND** cancellation, failure, or an explicit view change SHALL clear the held preview before another tab can be shown

#### Scenario: The landing follows the background setting
- **WHEN** `backgroundStyle` is `accent`, `dark`, or `transparent`
- **THEN** every prompt body cell SHALL use the same canvas semantics as an Agent tab

#### Scenario: A lone hidden Settings tab is not an Agent
- **WHEN** bare `a1` attaches and the registry holds only a hidden Settings tab
- **THEN** the server SHALL create one A1 tab in the launch cwd and the client SHALL view it, not the Settings tab

#### Scenario: Small terminal
- **WHEN** the body has fewer rows or columns than the complete editor and footer need
- **THEN** the prompt SHALL clip within the body without wrapping, overflowing, or moving input into the strip

### Requirement: Resident right-side items expose configuration controls

The complete physically rendered right-side group, from one blank cell before the first visible Version or Time glyph through one blank cell after the final visible glyph, SHALL have one explicit hover and hit range. Its user-facing Settings row and native multi-select title SHALL be `Widgets`, and the dialog SHALL describe choosing which widgets the tab bar shows; persisted setting identities SHALL remain unchanged. When both items are present, ` • ` SHALL separate Version from Time, matching the model/thinking separator convention. Hovering any cell in that padded range SHALL apply one consistent group treatment to every rendered item and both padding cells. Right-clicking anywhere in the group SHALL open a context menu containing `Configure`; activating it SHALL open the native searchable multi-select titled `Widgets`, where Version and Time toggle independently and persist in fixed order. Items omitted by narrow layout SHALL contribute no cells to the group, and space outside the rendered group SHALL not consume child input.

The group's resting foreground SHALL use the resident status/footer dim color. On Transparent, its hover treatment SHALL use the owned popup menu's accent-selected background; on Black and Accent, it SHALL use the same subtly lightened canvas background as `+`. Every hover SHALL retain the dim foreground and remain independent of tab chips, popups, overflow, drag targets, and child-surface input.

#### Scenario: Hover the complete configured group

- **WHEN** Version and Time are rendered and the pointer rests over either item or their internal separation
- **THEN** the complete Version-and-Time group SHALL show one continuous hover state with one blank cell before and after it
- **AND** Version and Time SHALL be separated by ` • `
- **AND** its full padded rendered span SHALL remain one configuration hit target

#### Scenario: Configure Version from the strip

- **WHEN** the user right-clicks anywhere in the rendered right-side group and chooses `Configure`
- **THEN** the native `Right Side` multi-select SHALL open with Version and Time rows
- **AND** toggling a row SHALL persist the ordered `tabBarRightItems` subset and repaint the strip live

#### Scenario: Narrow strip omits Version

- **WHEN** the strip is too narrow to render Version beside the required controls and Time
- **THEN** the right-side group hit range SHALL cover the rendered Time item plus its one-cell leading and trailing padding
- **AND** tabs, overflow, plus, and child input SHALL retain valid geometry

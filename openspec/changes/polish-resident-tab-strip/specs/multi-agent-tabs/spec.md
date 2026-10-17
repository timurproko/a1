# multi-agent-tabs Delta

## ADDED Requirements

### Requirement: Resident strip transitions present one stable current frame
The attach client SHALL present strip topology, active selection, current child surface, host overlays, pointer state, and cursor restoration as one current frame. Create, close, switch, rename, reorder, clock, status, and streamed-surface updates SHALL NOT expose an intermediate blank, stale, contradictory, or partially composed frame. Unchanged topology SHALL NOT be repainted merely because a repeated list snapshot arrived.

#### Scenario: Create a tab while another tab is visible
- **WHEN** tab creation is accepted and the new tab's first complete surface becomes available
- **THEN** the new topology, active chip, and new child surface SHALL become visible together
- **AND** existing chips SHALL NOT disappear and reappear during the transition
- **AND** the old child surface SHALL NOT appear under the new active chip

#### Scenario: Close the viewed tab
- **WHEN** the viewed tab closes and a survivor is selected
- **THEN** the closed chip SHALL be removed once and the survivor's active chip and complete surface SHALL become visible together
- **AND** surviving chips SHALL NOT disappear, reorder spuriously, or show the closed tab's surface

#### Scenario: Stream while a host overlay is open
- **WHEN** the viewed child emits surface updates while a context menu, rename editor, overflow chooser, confirmation, or failure notice is open
- **THEN** each presented frame SHALL retain that overlay above the newest child surface
- **AND** child output SHALL NOT erase, interleave with, or leak through the overlay
- **AND** overlay painting SHALL preserve the child's cursor position

#### Scenario: Dismiss an overlay
- **WHEN** a host overlay is cancelled, completed, or displaced by another tab
- **THEN** the obscured cells SHALL be restored from the current complete child surface in the same presentation
- **AND** no instructional residue, blank repair frame, or stale child text SHALL remain

#### Scenario: Receive an unchanged registry snapshot
- **WHEN** a periodic tab list contains the same ordered tabs, metadata, and active selection as the presented frame
- **THEN** the attach client SHALL retain the existing strip cells and hover state without emitting a redundant topology repaint

#### Scenario: Terminal does not honor synchronized updates
- **WHEN** the outer terminal ignores synchronized-update control sequences
- **THEN** each logical resident frame SHALL still be emitted as one bounded output write with no separately exposed clear-only or strip-only transition

### Requirement: Inline tab rename matches v2
F2 and the Rename context action SHALL edit the targeted name directly inside its tab chip using settled chip geometry. The editor SHALL support cursor movement, Home, End, Backspace, Delete, Ctrl+A replacement, Enter commit, and Escape cancel. A valid manual name SHALL appear immediately, persist through the registry and child session, and SHALL NOT trigger automatic-name animation.

#### Scenario: Edit a tab name inline
- **WHEN** the user invokes Rename, selects the existing name with Ctrl+A, types a replacement, and presses Enter
- **THEN** the replacement SHALL appear in the same chip immediately and persist as a user name
- **AND** no rename instruction line or automatic-name animation SHALL appear

#### Scenario: Cancel inline rename
- **WHEN** the user presses Escape or activates another pointer target during rename
- **THEN** the original current title SHALL be restored without forwarding the cancelling input to the child

### Requirement: Automatic tab names use the v2 transition
An automatic `nameSource=auto` change SHALL use a 600 ms moving rainbow over the old title, a 45 ms-per-grapheme rainbow typewriter reveal, and a 300 ms settle on truecolor terminals; palette terminals SHALL use only the reveal. The animation SHALL preserve chip and hit geometry and continue across unrelated registry, status, clock, surface, menu, and hover updates.

#### Scenario: Animate only an automatic name
- **WHEN** a default-named tab receives a different title from the automatic naming flow
- **THEN** the v2 rainbow, typewriter, and settle phases SHALL render in order with stable geometry
- **AND** a manual rename, restored title, or unchanged refresh SHALL not start or restart that transition

## MODIFIED Requirements

### Requirement: Bare A1 presents resident A1 sessions as tabs
Bare `a1` SHALL present a v2-style one-row tab strip at the top of the terminal and the viewed tab's terminal surface in all remaining rows. Each tab SHALL be an independent resident terminal session running the complete A1 owned UI with its own Pi agent session, extensions, transcript, editor, queue, model, thinking level, notices, and cwd. Only the viewed tab SHALL receive keyboard, paste, focus, and surface mouse input. Surface mouse reports SHALL remove the one-row tab-strip offset exactly once so the viewed child receives coordinates matching its visible rows, while mouse input on the strip SHALL remain attach-owned and SHALL NOT reach the child. The strip SHALL be present even when a single tab exists. When no tab exists, the terminal SHALL show only the strip's `+` control on an otherwise blank surface. The tab chip SHALL be the resident session name's visible location, and the viewed resident shell SHALL NOT repeat that name in its inner footer; direct single-agent and comparison launches without a tab strip SHALL retain their existing footer session name. Extension components using the certified text-terminal contract SHALL behave as in direct single-agent bare A1 on Windows x64, macOS arm64, and Linux x64; inline image protocols SHALL use the text fallback. `a1 solo` and `a1 pi` SHALL NOT present a tab strip.

#### Scenario: Explicit solo launch
- **WHEN** the user runs `a1 solo`
- **THEN** A1 SHALL launch one direct single-agent owned UI without resident infrastructure or a Tabs settings section

#### Scenario: First launch with no tabs
- **WHEN** the user runs bare `a1` and the profile has no resident tabs
- **THEN** A1 SHALL create one A1 tab in the launch cwd and view it

#### Scenario: Last tab closes
- **WHEN** the final resident tab is removed while the attach client remains open
- **THEN** only the `+` control SHALL remain visible
- **AND** no clock, empty-state instruction, detach hint, status notice, prior child surface, or other text SHALL remain

#### Scenario: Resident session name is not duplicated
- **WHEN** a named resident tab is viewed and its inner footer renders repository, branch, or pull-request context
- **THEN** the tab chip SHALL show the session name and the inner footer SHALL omit the duplicate name while preserving its other context

#### Scenario: Direct session keeps its footer name
- **WHEN** `a1 solo` or a resident fallback runs a named direct session without a tab strip
- **THEN** the footer SHALL continue to show the session name

#### Scenario: Two tabs keep separate state
- **WHEN** the user types a draft in tab 1, switches to tab 2, prompts it, and switches back
- **THEN** tab 1 SHALL show its transcript, scroll position, and draft unchanged
- **AND** the prompt SHALL have reached only the agent of tab 2

#### Scenario: Switch while both agents work
- **WHEN** the user switches tabs while both agents stream
- **THEN** only the viewed surface and input target SHALL change, and both agents SHALL continue without pause or restart

#### Scenario: Extension custom UI in a tab
- **WHEN** an extension renders a custom interactive component using the certified text-terminal contract
- **THEN** keyboard, mouse, paste, selection, clipboard, hyperlinks, cursor, Unicode, and alternate-screen behavior SHALL match direct single-agent bare A1 on the same platform
- **AND** an inline-image request SHALL use the existing text fallback

#### Scenario: Hover and activate a child-surface control
- **WHEN** the pointer enters or activates a pinned prompt, jump-to-bottom control, or other mouse target on the viewed surface beneath the tab strip
- **THEN** the child SHALL receive the row corresponding to the visibly pointed-at cell
- **AND** the target SHALL hover and activate at the same physical position as in direct single-agent bare A1

#### Scenario: Pointer remains on the tab strip
- **WHEN** a mouse report addresses the top-row tab strip
- **THEN** the attach client SHALL handle or ignore it according to strip behavior
- **AND** the viewed child SHALL receive no mouse report for that row

#### Scenario: Pi comparison profile
- **WHEN** the user runs `a1 pi`
- **THEN** no tab strip, resident server, holder, or tab bridge SHALL be involved

### Requirement: Tab chips reproduce the approved v2 strip
The strip SHALL use the v2 default top-row presentation as fixed behavior rather than settings: normal chips SHALL use RGB background `38,38,38` with foreground `170,170,170`, hovered chips background `48,48,48`, and the viewed chip background `55,55,55` with white text, with v2's palette fallback. Each chip SHALL render one space, an optional status glyph and space, the display name, and one space, with no close glyph and a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. When chips do not fit, the viewed chip SHALL stay visible, remaining tabs SHALL collapse into a keyboard-navigable `…` menu, and a trailing `+` SHALL always be reserved. The strip SHALL NOT wrap. With tabs present, the right edge SHALL show local time in the active owned time format followed by one blank terminal cell; with no tabs, no clock or wallpaper text SHALL render.

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
- **WHEN** `timeFormat` is `8:00 PM` and tabs are present
- **THEN** the right-aligned clock SHALL use a non-padded 12-hour hour and uppercase `AM` or `PM`
- **AND** one blank cell SHALL remain between the clock's final glyph and the terminal's right edge

#### Scenario: Render the strip clock in twenty-four-hour form
- **WHEN** `timeFormat` is `20:00` and tabs are present
- **THEN** the right-aligned clock SHALL use zero-padded 24-hour `HH:mm`
- **AND** one blank cell SHALL remain between the clock's final digit and the terminal's right edge

### Requirement: Tabs are managed from the strip, mouse, and assignable actions
A1 SHALL create a new A1 tab in the client's launch cwd from `Alt+A`; clicking `+` SHALL instead open a v2-style launcher containing `+ Agent`, a disabled separator, and `Settings`. Agent SHALL use the same creation flow. Settings SHALL open the owned Settings route in the viewed resident tab without injecting command text, or first create and view an Agent tab when the strip is empty. `Alt+1` through `Alt+9` SHALL view those tabs and `Alt+0` the tenth. Actions for next, previous, move-right, and move-left SHALL exist for assignment but have no default keys. Left click on a tab SHALL view it. Right click on a visible tab SHALL open a stable two-row context menu anchored beneath the pointer and clamped to the terminal, with `Close` first and `Rename` second; each row SHALL show its active shortcut right-aligned, producing `Close  Alt+W` and `Rename  F2` under default bindings. Popup menus SHALL use v2's neutral normal background `38,38,38`, hover background `48,48,48`, white labels, muted shortcuts, one-cell horizontal padding, and palette fallback. The pointed enabled row SHALL highlight and left click SHALL invoke it for the originally targeted tab; disabled separators SHALL never highlight or activate. Escape, a click elsewhere, a tab switch, or target removal SHALL dismiss a menu without action. Dragging a chip after 250 ms or one column of movement SHALL calculate insertion from chip midpoints, preview only a real move with a v2 `│` marker, and issue one reorder with the captured expected revision on release; release away from the strip SHALL cancel. No `/new-tab`, `/close`, `/tabs`, `/quit-all`, or `/restart-tab` command SHALL be exposed. At `tabsMax`, creation SHALL do nothing and state the limit. A matching prewarmed standby SHALL be used when available. Each client SHALL keep its own viewed tab.

#### Scenario: Create from keyboard
- **WHEN** the user presses `Alt+A`
- **THEN** a new default-named tab SHALL appear after the last tab and become viewed with an empty editor

#### Scenario: Create from strip
- **WHEN** the user clicks `+`
- **THEN** a popup SHALL show `+ Agent`, a separator line, and `Settings` in that order
- **AND** Agent and Settings SHALL be visually separated and independently selectable

#### Scenario: Create from the grouped launcher
- **WHEN** the user selects `+ Agent`
- **THEN** the same creation flow as `Alt+A` SHALL run

#### Scenario: Open Settings from the grouped launcher
- **WHEN** the user selects `Settings` while a tab is viewed
- **THEN** that tab SHALL open the owned Settings route without visible `/settings` input
- **AND** selecting Settings on an empty strip SHALL first create an Agent tab and open the route after its first complete surface

#### Scenario: Hover strip controls
- **WHEN** the pointer rests over a non-viewed tab chip, the overflow chip, or the `+` control
- **THEN** that complete control SHALL use its v2 hover background until the pointer leaves or its geometry disappears
- **AND** clock ticks, status animation, registry refreshes, and child surface updates SHALL NOT clear a still-valid hover state

#### Scenario: Open and use the default context menu
- **WHEN** the user right-clicks a visible tab under default bindings
- **THEN** a menu beneath the strip SHALL show only `Close  Alt+W` and `Rename  F2` in that order
- **AND** moving between its rows SHALL highlight the pointed row
- **AND** left-clicking a row SHALL invoke that action for the right-clicked tab
- **AND** no right-click instruction or action prompt SHALL replace text in the strip

#### Scenario: Cancel the context menu
- **WHEN** the context menu is open and the user presses Escape or clicks outside it
- **THEN** it SHALL close without renaming, closing, switching, or forwarding that input to the child
- **AND** the latest child surface SHALL be restored beneath it

#### Scenario: Jump beyond count
- **WHEN** the user presses `Alt+7` with three tabs
- **THEN** view SHALL not change and the key SHALL not reach the tab

#### Scenario: Preview and commit a drag reorder
- **WHEN** the user holds a pressed tab for 250 ms or moves it at least one column across another chip midpoint
- **THEN** a `│` insertion marker SHALL appear only at a destination that changes order
- **AND** release on the strip SHALL send one reorder while release away from the strip SHALL send none

#### Scenario: Concurrent reorder
- **WHEN** two clients reorder from the same registry revision
- **THEN** exactly one SHALL apply and both SHALL converge

#### Scenario: Tab limit reached
- **WHEN** tab count equals `tabsMax` and creation is requested
- **THEN** no tab SHALL be created and the strip SHALL state the limit

### Requirement: Closing a tab stops only that session after confirmation when busy
`Alt+W` and the chip context menu SHALL close a tab, including a failed tab. No tab-chip close glyph or direct close hit region SHALL exist. A working tab, a tab awaiting input, or one with queued input SHALL ask `Stop "<name>"? Enter stop · Esc cancel`. Closing SHALL request graceful shutdown, terminate the verified tree after a bounded deadline, remove the tab everywhere, and leave its Pi session resumable. When the active tab closes, its immediate preceding tab in strip order SHALL become active when one exists; otherwise the next surviving tab SHALL become active. Closing the last tab SHALL leave only `+` on an otherwise blank surface rather than quit. Failed/stalled UI MAY offer restart, but no restart slash command SHALL exist.

#### Scenario: Cancel closing a working tab
- **WHEN** the user closes a streaming tab and presses `Esc`
- **THEN** it SHALL remain and continue

#### Scenario: Close idle tab
- **WHEN** the user invokes `Alt+W` or chooses `Close` for an idle tab
- **THEN** it SHALL close without confirmation and other tabs SHALL be unaffected

#### Scenario: Close an active tab with a preceding neighbor
- **WHEN** the active tab at any position after the first closes
- **THEN** the tab immediately preceding it in the prior strip order SHALL become active
- **AND** the first tab SHALL NOT be selected merely because it is first

#### Scenario: Close the first active tab
- **WHEN** the first active tab closes and another tab survives
- **THEN** the next surviving tab in the prior strip order SHALL become active

#### Scenario: Close a background tab
- **WHEN** a non-viewed tab closes
- **THEN** the currently viewed tab SHALL remain active with its input and surface unchanged

#### Scenario: Closed session remains resumable
- **WHEN** a closed session is selected later
- **THEN** it SHALL open with no lost committed entries

#### Scenario: Child ignores graceful stop
- **WHEN** the child does not exit by the deadline
- **THEN** its verified tree SHALL be terminated and SHALL NOT restart

### Requirement: Tab input rules and prompts follow the viewed tab
The attach client SHALL apply a failed tab's restricted input rules only while that tab is viewed, and SHALL forward input normally to any other viewed tab. A tab overlay that captures keys, such as the busy-close confirmation, overflow chooser, rename editor, or context menu, SHALL be cancelled when the viewed tab changes or its target tab is removed. While such an overlay is open, it SHALL remain visible over tab output without replacing the strip row or writing instructional text into the child surface. A failed or refused new-tab request SHALL show its concise reason through the same stable host-overlay composition.

#### Scenario: Switch away from a failed tab
- **WHEN** the viewed tab fails and the user switches to another tab that produces no new output
- **THEN** keys typed in the other tab SHALL reach it

#### Scenario: Close prompt under streaming output
- **WHEN** the busy-close confirmation is open and the tab keeps streaming output
- **THEN** the confirmation notice SHALL remain visible until the user answers or cancels it

#### Scenario: Close prompt after a tab switch
- **WHEN** the busy-close confirmation is open and the user clicks another tab in the strip
- **THEN** the confirmation SHALL be cancelled and keys SHALL reach the newly viewed tab

#### Scenario: New tab refused
- **WHEN** a new-tab request is refused for the tab limit or fails with `tab-start-busy`
- **THEN** the terminal SHALL show a concise overlay naming the reason
- **AND** the strip and current child surface SHALL remain otherwise unchanged

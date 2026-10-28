# multi-agent-tabs Specification

## Purpose
Defines the opt-in resident-tab path that keeps bare A1 running independently of its attached terminal and restores the same retained session when the user returns.

## Requirements

### Requirement: Bare A1 runs one resident tab when opted in
On Windows x64, macOS, and Linux, when the A1 setting `residentTabs` is enabled, bare `a1` without a session selection SHALL ensure the profile's resident server before the launch guardian starts, then run the terminal host's attach role, hosted by the Node runtime through the release's fixed role entry, as the launch instance's root instead of the direct owned UI. With no tab, the server SHALL create one A1 tab running `bin/ui.js --tab` in the client's launch cwd; with an existing tab, the client SHALL view it. Each tab process SHALL receive its own launch runtime identity, distinct from every other tab incarnation and launch instance. The attach client SHALL draw a one-row strip with the tab's status glyph and name above the tab's surface. While one client is attached, another bare `a1` of the same profile SHALL be refused with a message naming the other terminal and SHALL NOT start a direct session. When the terminal host is missing, the platform is unsupported, resident survival cannot be verified, or the server is incompatible, blocked, or cannot start, bare `a1` SHALL run the direct single-agent owned UI and show one notice naming the reason. With the setting at its default `false`, bare `a1` SHALL behave exactly as without this capability. `a1 pi` and `a1 --session` SHALL keep their direct behavior.

#### Scenario: First launch with resident tabs enabled
- **WHEN** the user enables `residentTabs` and runs bare `a1` with no resident tab
- **THEN** a resident tab SHALL start the full A1 UI in the launch cwd and the strip SHALL show it starting and then idle

#### Scenario: Survival cannot be verified
- **WHEN** resident tabs are enabled but the server cannot be started outside terminal containment with verified identity
- **THEN** bare `a1` SHALL start the direct single-agent owned UI and show exactly one notice naming the reason

#### Scenario: Setting left at its default
- **WHEN** `residentTabs` is `false`
- **THEN** bare `a1` SHALL neither probe nor start the resident server and SHALL run the direct owned UI

#### Scenario: Second terminal while attached
- **WHEN** a second bare `a1` of the same profile starts while a client is attached
- **THEN** it SHALL print that `a1` is attached in another terminal, exit without starting a session, and leave the first client attached

#### Scenario: Tab runtime identity
- **WHEN** a resident tab runs beside a direct `a1` instance in the same repository
- **THEN** each SHALL have a distinct launch runtime identity and their worktree claims SHALL NOT collide

#### Scenario: Attach client process image
- **WHEN** bare `a1` attaches to a resident tab
- **THEN** the attach client's process image SHALL be the Node runtime running the fixed role entry and SHALL load the verified terminal-host addon

### Requirement: Quitting bare A1 detaches from resident tabs
Pressing `Ctrl+C` twice within the existing clear/exit interval SHALL detach the local attach client from the tab. The attach client SHALL forward the first `Ctrl+C` to the tab unchanged and SHALL consume a second `Ctrl+C` inside the interval as the detach request without forwarding it, so a single `Ctrl+C` keeps its ordinary meaning in the tab and a double press never ends the tab's process. Inside the A1 tab, `/quit` and `Ctrl+D` on an empty editor SHALL request detach through the tab bridge for the attachment that was current when the command was admitted, and the server SHALL honor the request only while that attachment is still current. When the bridge is unavailable, the tab SHALL remain running and SHALL direct the user to `Ctrl+C` twice. Detaching SHALL restore the outer terminal's screen and input modes and leave the tab running, and the parent terminal SHALL show a dim `1 tab still running · run a1 to return`.

#### Scenario: Leave with Ctrl+C twice
- **WHEN** the user presses `Ctrl+C` twice within the clear/exit interval in the tab
- **THEN** the tab SHALL receive exactly one `Ctrl+C`, the client SHALL detach, and the tab's process SHALL keep running

#### Scenario: Single Ctrl+C keeps its meaning
- **WHEN** the user presses `Ctrl+C` once in the A1 tab
- **THEN** A1 in the tab SHALL clear or copy exactly as in single-agent A1 and the client SHALL remain attached

#### Scenario: Quit while the tab works
- **WHEN** the user submits `/quit` while the tab streams a reply
- **THEN** the terminal SHALL be restored with the running-tab hint and the tab SHALL finish its turn

#### Scenario: Enhanced keyboard modes do not leak
- **WHEN** the client detaches after enabling enhanced keyboard or mouse reporting
- **THEN** the parent shell SHALL receive no enhanced key or mouse sequences

### Requirement: Relaunching bare A1 reattaches every tab
Bare `a1` with resident tabs enabled SHALL connect to the profile's resident server and view the resident tab from its retained terminal surface. The surface SHALL include output produced while no client was attached, and input SHALL reach the tab as soon as the surface is shown.

#### Scenario: Close the terminal mid-turn and return
- **WHEN** the terminal running `a1` closes while the tab streams, and the user later runs `a1` in a new terminal
- **THEN** the tab SHALL show the output produced while detached and the live continuation of the turn, or its completed result

#### Scenario: Type after reattaching
- **WHEN** the user reattaches and types a prompt
- **THEN** the keystrokes SHALL reach the A1 editor in the tab encoded for its current terminal modes

### Requirement: Tab failure is presented and recoverable per tab
A crashed, restarting, or failed tab SHALL show its state in its own strip entry and SHALL show a banner with its reason over its read-only last-screen snapshot. A failed tab's banner SHALL offer `[r] retry`, `[f] start fresh`, and `[alt+w] close`, handled by the attach client while that tab is viewed. Retry SHALL reset the restart budget and start the tab once; start fresh SHALL open a new Pi session in the tab's cwd and leave the previous session resumable; close SHALL remove the tab and leave its session resumable. When a restarted tab's last journaled prompt had no settled reply, A1 SHALL offer that prompt back into the editor and SHALL NOT resend it. Other tabs SHALL remain fully operable throughout.

#### Scenario: One tab crashes
- **WHEN** one tab's A1 process exits unexpectedly during a turn
- **THEN** only that tab SHALL show crash and restart state, and other tabs SHALL keep streaming and accepting input

#### Scenario: Restart budget exhausted
- **WHEN** a tab crashes three times within ten minutes
- **THEN** it SHALL show failed with retry, fresh, and close actions and SHALL NOT restart automatically again

#### Scenario: Start fresh after failure
- **WHEN** the user presses `f` on a failed tab
- **THEN** the tab SHALL start a new session in the same cwd and the failed session SHALL remain in the session picker

#### Scenario: Recovered prompt and draft together
- **WHEN** a restarted tab has both an unfinished journaled prompt and a non-empty recovered draft
- **THEN** the prompt SHALL be placed in the editor, the draft SHALL be kept in editor history, and a notice SHALL say both were recovered

### Requirement: Bare A1 presents resident A1 sessions as tabs
Bare `a1` SHALL present a v2-style one-row tab strip at the top of the terminal and the viewed tab's terminal surface in all remaining rows. Each tab SHALL be an independent resident terminal session running the complete A1 owned UI with its own Pi agent session, extensions, transcript, editor, queue, model, thinking level, notices, and cwd. Only the viewed tab SHALL receive keyboard, paste, focus, and surface mouse input. Surface mouse reports SHALL remove the one-row tab-strip offset exactly once so the viewed child receives coordinates matching its visible rows, while mouse input on the strip SHALL remain attach-owned and SHALL NOT reach the child. The strip SHALL be present even when a single tab exists. When no tab exists, the strip SHALL keep its `+` control and clock and the surface below it SHALL show the a1 landing. The tab chip SHALL be the resident session name's visible location, and the viewed resident shell SHALL NOT repeat that name in its inner footer; direct single-agent and comparison launches without a tab strip SHALL retain their existing footer session name. Extension components using the certified text-terminal contract SHALL behave as in direct single-agent bare A1 on Windows x64, macOS arm64, and Linux x64; inline image protocols SHALL use the text fallback. `a1 solo` and `a1 pi` SHALL NOT present a tab strip.

An Agent record whose child has exited and that no holder owns SHALL NOT count as an existing Agent for the attach handshake. When bare `a1` attaches without a session selection and no Agent is running, the server SHALL drop such stopped Agent records, create one new Agent tab in the launch cwd, and the client SHALL view it; the new tab SHALL use a fresh identity rather than a stopped tab's directory, draft, or recovery screen, except that a profile holding no Agent record at all SHALL keep its first-launch identity. Stopped tabs' sessions remain resumable by session id.

#### Scenario: Explicit solo launch
- **WHEN** the user runs `a1 solo`
- **THEN** A1 SHALL launch one direct single-agent owned UI without resident infrastructure or a Tabs settings section

#### Scenario: First launch with no tabs
- **WHEN** the user runs bare `a1` and the profile has no resident tabs
- **THEN** A1 SHALL create one A1 tab in the launch cwd and view it

#### Scenario: Every Agent has stopped
- **WHEN** the user runs bare `a1` and every Agent record in the profile is stopped with no holder, whether its child exited, crashed, was shut down by an update, or was killed
- **THEN** the server SHALL drop those records and create one new Agent tab in the launch cwd, and the client SHALL view it through the ordinary first-draw gate
- **AND** no empty body SHALL be shown while the Agent starts beyond that gate

#### Scenario: One Agent still runs beside stopped ones
- **WHEN** the user runs bare `a1` and the profile holds a running Agent and stopped Agent records
- **THEN** the client SHALL view the first running Agent in strip order and the server SHALL start nothing

#### Scenario: Last tab closes
- **WHEN** the final resident tab is removed while the attach client remains open
- **THEN** the strip SHALL show `+` and the clock and the body SHALL show the landing
- **AND** no detach hint, status notice, prior child surface, or child cursor SHALL remain

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
The strip SHALL use the v2 default top-row presentation as fixed behavior rather than settings: normal chips SHALL use RGB background `38,38,38` with foreground `170,170,170`, hovered chips background `48,48,48`, and the viewed chip background `55,55,55` with white text, with v2's palette fallback. Each chip SHALL render one space, an optional status glyph and space, the display name, and one space, with no close glyph and a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. When chips do not fit, the viewed chip SHALL stay visible when space permits, and a trailing `+` SHALL be reserved while at least one plus-menu kind is enabled. The muted single-column centered `⋯` overflow control SHALL appear only while some chips do not fit and SHALL open a keyboard- and mouse-navigable popup listing only tabs whose chips are not drawn, without checkmarks, in strip order. Each row SHALL reserve a one-cell status-glyph slot and separator before its name; it SHALL show the same current status glyph and semantic color as the chip when present, or a blank slot while idle. Names SHALL clip by display width without shifting the icon slot, leaking icon style into the title, or changing popup hit geometry. Choosing a popup row SHALL view exactly that tab with either top or bottom strip placement and place its chip in the currently active chip's strip slot when that chip was drawn and the two do not both fit, even if a different non-swap view request was pending; the displaced tab SHALL appear in the popup. Other visible chips SHALL remain visible when geometry permits, and a pending view request SHALL NOT briefly repaint the old viewed chip in the slot or replay the newly drawn chip's hidden-name transition. The popup SHALL track the current drawn chips across resize, reorder, creation, removal, and view changes; removed tabs SHALL NOT remain actionable. The strip SHALL NOT wrap. The right edge SHALL show local time in the active owned time format followed by one blank terminal cell, whether or not tabs are open; no wallpaper text SHALL render.

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

### Requirement: Tab status icons are the only attention signal
Background attention SHALL be conveyed only by chip status icons. A1 SHALL NOT emit a terminal bell, sound, terminal notification sequence, or operating-system notification for status changes, and SHALL NOT forward BEL written by a tab. No setting SHALL enable such a signal.

#### Scenario: Background tab needs the user
- **WHEN** a background tab needs input or finishes
- **THEN** only its chip icon SHALL change

#### Scenario: A tab program rings the bell
- **WHEN** a program writes BEL
- **THEN** the outer terminal SHALL NOT receive it

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

### Requirement: Tabs are renamed inline and names are Pi session names
`F2`, the chip menu, and existing `/name <name>` SHALL rename a tab. Inline rename SHALL use `Enter` to commit and `Esc` or click elsewhere to cancel. Names SHALL be trimmed, control-free, nonempty, and at most 64 characters; invalid input SHALL retain the editor with a concise reason. A committed name SHALL become the Pi session name, appear in every client, and be user-provided. Defaults SHALL be `agent` or the smallest free `agent N`. With `tabsAutoName` on by default, A1 SHALL start proposing a lowercase hyphenated name of at most 16 characters when the first agent run begins, without waiting for that turn to settle. Naming SHALL use bounded model work that permits reasoning models to produce the short answer, SHALL fall back deterministically, and SHALL never override a user name. An automatic rename SHALL reproduce v2's title transition: 600 ms moving per-character rainbow over the old title, the new title typed at 45 ms per character, and a 300 ms settle to foreground gray while preserving the wider endpoint width; terminals without truecolor SHALL use the plain typewriter phase. Manual renames SHALL not animate.

#### Scenario: Rename inline
- **WHEN** the user enters `auth-refactor` with `F2`
- **THEN** every client and the Pi session SHALL use `auth-refactor`

#### Scenario: Auto-name starts with the run
- **WHEN** the first agent run begins and remains busy for an extended period
- **THEN** automatic naming SHALL proceed without waiting for the run to settle

#### Scenario: Reasoning model consumes the first budget
- **WHEN** the naming model spends the first bounded attempt without producing title text
- **THEN** A1 SHALL retry with a larger bounded budget before using the deterministic fallback

#### Scenario: User name survives auto-name
- **WHEN** the user renames before auto-naming completes
- **THEN** auto-naming SHALL NOT change either the Pi session name or the tab name

#### Scenario: Auto-name animates
- **WHEN** an automatic name replaces a default name in a truecolor terminal
- **THEN** the old title SHALL show the moving per-character rainbow before the new title is typed and settled to foreground gray
- **AND** active frames SHALL retain the display width of the wider clipped endpoint

#### Scenario: Auto-name animates without truecolor
- **WHEN** an automatic name replaces a default name in a terminal without truecolor
- **THEN** the new title SHALL use the plain typewriter timing without truecolor rainbow or settle escapes

#### Scenario: Manual rename is immediate
- **WHEN** a user-provided name replaces the current name
- **THEN** the complete new title SHALL appear without an automatic-title animation

#### Scenario: Auto-name fails
- **WHEN** bounded model naming fails or times out
- **THEN** deterministic prompt-derived naming SHALL be used without affecting the active turn

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

### Requirement: The active terminal automatically controls its viewed tab
Each tab SHALL have at most one input-controller client and monotonic revision. Transfer SHALL use the controller barrier across native, PTY, and child buffers. Focus gain SHALL automatically claim the viewed tab; when focus reporting is unavailable or no claim is complete, first input SHALL claim and be held until acknowledgement. No `Enter` takeover or persistent view-only prompt SHALL be required. Input and resize SHALL carry the current revision; stale clients SHALL deliver no bytes. `/quit` and empty-editor `Ctrl+D` SHALL capture immutable origin identity/revision and detach only their current originating attach client while keeping A1 and the tab running. Ambiguous attribution SHALL reject the request and direct the user to double `Ctrl+C`. A detaching client SHALL print `1 agent still running run a1 to return.` or `N agents still running run a1 to return.` as applicable. Terminal bytes and prompt content SHALL NOT enter the bridge.

#### Scenario: Second terminal becomes active
- **WHEN** a second terminal gains focus on a controlled tab
- **THEN** the causal boundary and new owner SHALL be acknowledged automatically before its input is delivered

#### Scenario: Focus reporting is unavailable
- **WHEN** a terminal's first input arrives without a completed focus claim
- **THEN** that input SHALL be held, the claim SHALL complete safely, and the input SHALL then be delivered once

#### Scenario: Stale detach request
- **WHEN** a detach request names a superseded revision
- **THEN** neither client SHALL detach

#### Scenario: Delayed quit from previous controller
- **WHEN** client A's `/quit` executes after client B gains control
- **THEN** it SHALL retain A's old generation or be rejected, SHALL NOT detach B, and SHALL NOT stop A1 or the tab

#### Scenario: Two terminals view different tabs
- **WHEN** bare `a1` runs in two terminals
- **THEN** both SHALL show the same collection, retain their own viewed tabs, and automatically control only through current revisions

#### Scenario: Quit local A1 attach
- **WHEN** the current controller submits `/quit` while two agents run
- **THEN** only that attach client SHALL exit and print `2 agents still running run a1 to return.` while both agents and the other client continue

### Requirement: Tab shortcuts are declared, configurable, and conflict-checked
Tab actions SHALL have stable identities, accept `keybindings.json` assignments, be checked against A1 and Pi bindings, and appear under Tabs in Keyboard Shortcuts. Conflicts SHALL disable and report the assigned tab binding. The attach client SHALL consume matched actions before encoding and forward unmatched input. Defaults SHALL be `Alt+A` new Agent, `Alt+Period` Settings, `Alt+W` close, `F2` rename, `Alt+1`…`Alt+0` jump, plus failed-banner `r` retry and `f` fresh. `tabs.next`, `tabs.previous`, `tabs.moveRight`, and `tabs.moveLeft` SHALL be unbound by default but assignable. Double `Ctrl+C` SHALL remain fixed: first press forwarded, second within A1's clear/exit interval consumed as local detach.

#### Scenario: Hotkeys listing
- **WHEN** Keyboard Shortcuts opens inside a resident tab
- **THEN** assigned Agent, Settings, close, rename, and jump actions SHALL be listed and unbound actions SHALL remain discoverable

#### Scenario: Rebind Settings
- **WHEN** `tabs.settings` receives a free custom assignment
- **THEN** that key SHALL create or activate the Settings tab and the launcher SHALL show the effective label

#### Scenario: User assigns next tab
- **WHEN** `tabs.next` receives a free key assignment
- **THEN** that key SHALL switch tabs and Keyboard Shortcuts SHALL show it

#### Scenario: Collision
- **WHEN** a tab action is assigned to an existing editor binding
- **THEN** launch SHALL report and disable the conflict rather than dispatching both actions

#### Scenario: Leave with Ctrl+C twice
- **WHEN** the user presses `Ctrl+C` twice within the interval
- **THEN** the child SHALL receive exactly one press, the attach client SHALL exit, and every tab process SHALL continue

### Requirement: Resident routing requires an interactive terminal
A bare or session-selected A1 launch SHALL take the resident route only when its standard input and standard output are both terminals. Otherwise it SHALL run the direct owned UI with the resident fallback reason `no interactive terminal`, and SHALL neither probe nor start the resident host.

#### Scenario: Piped launch with a packaged terminal host
- **WHEN** a package that carries the terminal host is launched with piped standard input or output
- **THEN** the launch SHALL run the direct owned UI and SHALL NOT start the attach client or contact the resident host

#### Scenario: Interactive launch
- **WHEN** the same package is launched from a terminal on a supported platform
- **THEN** resident routing SHALL proceed as before

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

### Requirement: Resident tabs preserve prompt keyboard modifiers
After resolving tab-owned actions, bare A1's resident attach client SHALL forward supported Ctrl, Alt, and Shift keyboard combinations with the same key identity and modifiers observed by the direct solo-agent prompt. A modified key SHALL NOT degrade into its unmodified form while crossing the resident terminal boundary.

#### Scenario: Move by word in a resident prompt
- **WHEN** the user presses Ctrl+Left or Ctrl+Right while editing a prompt in a resident tab
- **THEN** the prompt cursor SHALL move by one word in the requested direction exactly as it does in direct solo-agent mode

#### Scenario: Use other modified prompt keys
- **WHEN** the user invokes a supported prompt action with modified arrow, navigation, Enter, Backspace, Delete, Tab, or character input in a resident tab
- **THEN** the child prompt SHALL receive the original key identity and modifiers and invoke the same effective binding as direct solo-agent mode

#### Scenario: Keep tab actions authoritative
- **WHEN** a modified key resolves to an active tab-owned action
- **THEN** the attach client SHALL invoke that tab action without also forwarding the key to the child prompt

### Requirement: Resident strip transitions present one stable current frame
The attach client SHALL present strip topology, active selection, current complete child surface, host overlays, pointer state, terminal modes, and cursor restoration as one current frame. A holder surface used as a committed body SHALL contain a complete retained child presentation rather than only the most recently dirty rows. Create, close, switch, rename, reorder, clock, status, and streamed-surface updates SHALL NOT expose an intermediate blank, stale, contradictory, stopped, or partially composed frame. Unchanged topology or status SHALL NOT repaint. An intentional close SHALL suppress late output and failure events from the closing incarnation.

#### Scenario: Create a tab while another tab is visible
- **WHEN** creation is accepted and the new tab's first complete surface becomes available
- **THEN** the new topology, active chip, and body SHALL become visible together once
- **AND** existing chips SHALL NOT disappear, flash, or show the old body beneath the new active chip

#### Scenario: Close the viewed tab
- **WHEN** the viewed tab closes and a survivor is selected
- **THEN** the closed chip SHALL be removed once and the survivor's active chip and complete surface SHALL become visible together
- **AND** late close-incarnation status, surface, and exit events SHALL NOT resurrect a failed-looking chip or snapshot

#### Scenario: Stream while a host overlay is open
- **WHEN** the viewed child emits complete current surfaces while a popup, rename editor, or confirmation is open
- **THEN** each presented frame SHALL retain that overlay above the newest child surface without stale rows or cursor movement

#### Scenario: Dismiss an overlay
- **WHEN** a host overlay closes, completes, or is displaced by another tab
- **THEN** its cells SHALL be restored from the current complete child surface in the same presentation
- **AND** no residue, blank repair frame, or stale child text SHALL remain

#### Scenario: Receive an unchanged registry snapshot
- **WHEN** a registry, status, or complete-surface snapshot is equivalent to the presented state
- **THEN** the attach client SHALL emit no redundant presentation write

#### Scenario: Terminal does not honor synchronized updates
- **WHEN** the outer terminal ignores synchronized-update controls
- **THEN** ordered bounded writes and row damage SHALL still avoid a clear-only, strip-only, notice-only, or stale-body intermediate frame

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

### Requirement: Viewed resident A1 matches direct A1 interaction semantics
Except for declared resident-tab controls and lifecycle differences, a viewed resident A1 child SHALL produce the same semantic action and visible child result as `a1 solo` for equivalent keyboard, text/IME, paste, focus, mouse, resize, dialog, extension text-UI, completion, history, command, and attachment input on the same platform and effective profile.

#### Scenario: Edit an ordinary prompt
- **WHEN** equivalent typing, Unicode, multiline, cursor, word-motion, Home/End, deletion, undo/redo, history, and completion inputs are sent to an ordinary prompt in resident and solo A1
- **THEN** the prompt text, cursor, selection, completion state, and invoked actions SHALL be equivalent after accounting for the resident strip row

#### Scenario: Interact with a modal or extension surface
- **WHEN** a built-in dialog, trust or permission prompt, replacement editor, or certified extension text UI owns input in resident A1
- **THEN** its keys, paste, pointer behavior, cancellation, focus, and resulting presentation SHALL match the same surface in solo A1

#### Scenario: Send the first input after switching tabs
- **WHEN** the user switches to a resident tab and immediately sends a key, paste, click, focus event, or resize
- **THEN** that input SHALL reach the newly viewed child exactly once in order and SHALL NOT visibly wait for a takeover gesture

### Requirement: Resident selection and clipboard behavior matches direct A1
Every child row and surface SHALL retain the same selectable or non-selectable ownership as `a1 solo`. Equivalent prompt, transcript, status/footer, dialog, and extension gestures SHALL produce equivalent selection paint and copied text, while resident strip cells SHALL remain attach-owned controls and SHALL NOT enter child selection or clipboard content.

#### Scenario: Select and copy child content
- **WHEN** the user performs an equivalent drag, reverse drag, double click, triple click, selection extension, or scrolling selection over viewed child content in resident and solo A1
- **THEN** resident A1 SHALL paint the same child cells and copy the same semantic text without strip content, padding, controls, or stale rows

#### Scenario: Copy with Ctrl+C
- **WHEN** a copyable prompt or response selection owns `Ctrl+C` in a resident tab
- **THEN** the first `Ctrl+C` SHALL invoke the same copy and selection-clearing behavior as solo A1 and SHALL leave the attach client connected

#### Scenario: Paste with Ctrl+V on first use
- **WHEN** the ordinary prompt owns the first `Ctrl+V` after resident startup and the supported clipboard contains readable content
- **THEN** resident A1 SHALL insert that content exactly once under the same bounded acquisition and preparation behavior as solo A1 without requiring a prior clipboard or focus action

#### Scenario: Receive terminal-provided paste
- **WHEN** the outer terminal supplies a bracketed, right-click, multiline, or Unicode paste
- **THEN** the viewed child SHALL receive one complete paste with the same normalization, ownership, insertion, feedback, and capacity behavior as solo A1

### Requirement: Resident shortcuts use the effective A1 shortcut contract
After resolving active tab actions, resident A1 SHALL preserve every supported effective A1 key identity and modifier and SHALL invoke the same action as `a1 solo`. Shortcut help, hints, dialogs, and `/hotkeys` SHALL derive child actions from the same effective declarations, with tab actions listed separately and consumed only in their active scope.

#### Scenario: Use default prompt shortcuts
- **WHEN** the user invokes any supported default A1 prompt or viewport shortcut in a resident tab
- **THEN** the same child action SHALL run exactly once as in solo A1 and no encoded key fragment SHALL enter the prompt

#### Scenario: Use customized shortcuts
- **WHEN** `keybindings.json` changes an A1 or tab action without a conflict
- **THEN** resident dispatch and every shortcut presentation SHALL show and invoke the effective assignment exactly as solo dispatch plus the separately resolved tab actions

#### Scenario: Tab action wins only in tab scope
- **WHEN** an input resolves to an active resident tab action
- **THEN** the attach client SHALL invoke that action without forwarding the input, while unmatched and disabled tab bindings SHALL continue unchanged to the child

### Requirement: Resident tabs make independent concurrent progress
Every resident Agent SHALL continue engine work, render scheduling, child animation state, PTY draining, retained terminal-state updates, and switch-time complete-surface production independently of which tab is viewed and independently of another tab's first response, input, rendering, lifecycle work, revision number, or slow client. Hidden Agents MAY suppress external surface delivery, but their children SHALL continue their normal render scheduling and their holders SHALL retain every output update in current terminal state. Selecting any working Agent SHALL expose a complete frame containing its newest committed partial reply and current animation phase, then continue presenting later partial frames and animation changes without waiting for that turn or another turn to settle. Selection SHALL NOT be required to resume execution or restart an animation. Execution, child rendering, and viewed presentation SHALL each make independently observable progress; one advancing status icon or a final answer SHALL NOT substitute for the other stages.

#### Scenario: Several agents stream simultaneously
- **WHEN** at least three resident Agents generate streamed replies at the same time and the user repeatedly switches before any reply settles
- **THEN** every selected Agent SHALL show successive partial reply states and live animation changes and continue advancing
- **AND** no Agent SHALL remain on its pre-run frame and then jump directly to final content

#### Scenario: Later Agent has a lower revision
- **WHEN** the first Agent has emitted more surface revisions than a later-created Agent
- **THEN** selecting the later Agent SHALL commit and continue its own revision sequence rather than discarding it as globally stale

#### Scenario: Lifecycle work overlaps active input
- **WHEN** tab create, close, Settings startup, restart, rename, reorder, recovery, or registry persistence overlaps input and streaming in another Agent
- **THEN** the unrelated Agent SHALL retain solo-equivalent input and presentation responsiveness

#### Scenario: One attached client is slow
- **WHEN** one client's replaceable surface lane cannot drain while multiple Agents continue working
- **THEN** no child, holder, other client, or lifecycle-independent input path SHALL wait for that client
- **AND** the slow lane SHALL eventually receive one newest complete surface rather than replaying a catch-up burst

#### Scenario: First response order does not select the only live Agent
- **WHEN** three Agents begin overlapping turns and any one of them produces its first response before the other two
- **THEN** each Agent SHALL continue independent engine and child-render progress regardless of response order
- **AND** activating either later responder SHALL show its current unfinished response and ongoing updates without waiting for the first Agent to finish

#### Scenario: Hidden animation remains current
- **WHEN** a working Agent remains hidden while other Agents stream and its normal child animations advance
- **THEN** its engine, renderer, and retained terminal state SHALL keep advancing
- **AND** selecting it SHALL present its current animation phase and continue animation rather than replaying old frames or restarting a frozen phase

#### Scenario: No viewer remains attached
- **WHEN** every attach client disconnects while several Agents have unfinished turns
- **THEN** all Agents SHALL continue engine work, child rendering, and retained-state updates
- **AND** reattachment SHALL reveal current committed content without a catch-up replay or an execution-resume action

#### Scenario: Type while another Agent floods output
- **WHEN** one Agent emits high-rate output while the user activates another working Agent and types into its prompt
- **THEN** the input SHALL be delivered exactly once to the activated Agent and its visible echo and animations SHALL progress without waiting for the flood to finish

#### Scenario: Requested target changes while first input waits
- **WHEN** first input is pending behind a controller handoff and the requested target is cancelled, fails, or is superseded
- **THEN** admitted input SHALL retain its original target and controller identity or receive the established explicit rejection or uncertain-delivery outcome
- **AND** it SHALL not be silently retargeted to the previously visible Agent or replayed into a surviving tab

#### Scenario: Server reconnects while no viewer is attached
- **WHEN** all viewers are detached and a server reconnect overlaps unfinished turns
- **THEN** each child SHALL continue engine/render progress and its holder SHALL continue parsing and retaining committed content during reconnect
- **AND** a later viewer SHALL obtain current partial content and live continuation without restarting the Agent

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

### Requirement: Resident Settings is one global utility tab
Bare A1 resident mode SHALL present at most one profile-global utility tab titled `Settings`. It SHALL render the owned global settings without owning an Agent session. A Settings route delivered before the child presenter has started SHALL be retained and presented once it starts. The launcher SHALL create or activate that singleton. The `tabs.settings` action SHALL toggle it: while Settings is viewed it SHALL hide that tab from the strip, keep its process running, and show the previous tab, and otherwise it SHALL show the singleton. To open Settings without a startup delay, the attach client SHALL start a hidden Settings tab in the background when tabs exist, or the landing is shown, without one; a Settings tab joins the strip only once it is viewed. Closing its tab SHALL remove it. Settings are shared: every running resident tab SHALL reread the shared settings document when it changes and apply each changed live setting, such as the accent color, without a restart. Its screen is the tab, so it SHALL offer no screen-level Esc close or Esc close hint, and one Ctrl+C SHALL NOT dismiss it. Resident Agents SHALL not advertise or execute `/settings`; `a1 solo` and `a1 pi` SHALL retain their existing command behavior.

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
- **THEN** the hidden Settings tab SHALL stay hidden and running beside the landing, and the strip SHALL show only `+` and the clock
- **AND** it SHALL close when the client detaches, so a later bare `a1` starts its first Agent and never views it
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

### Requirement: Resident lifecycle mechanics remain invisible
The resident attach client SHALL keep controller, subscription, and intentional-stop mechanics invisible:
- Input during automatic transfer SHALL be delivered once after acknowledgement, or refused before any prefix.
- Pointer motion and focus reports SHALL never consume the input budget of a pending view or cause key or paste input to be refused.
- The attach client SHALL NOT render an input-delivery notice row such as `Input was not sent; try again.` beneath the strip.
- Successful create and close SHALL commit only complete final topology states; locally pending presentation SHALL NOT enter the authoritative registry.
- A user-created Agent SHALL immediately show exactly one selected locally pending chip and an empty transcript with a complete idle ruled editor with a visual block caret and a two-row cwd/model/usage footer in the configured canvas, without loading/preparation text, stale usage, old child surface, or a child cursor. The provisional footer MAY use the last complete Agent's model/context as display-only hints; if unavailable it SHALL use neutral values until the new Agent draws. A registry update arriving before or after `tab.created` SHALL NOT display a second Agent chip beside it. The real chip and child surface SHALL become visible together only with the first nonblank drawn frame; blank child surfaces SHALL remain parked for any duration without exposing a child cursor, while explicit failure or recovery presentation SHALL remain visible.
- When no tabs remain, the strip SHALL show hoverable `+` and the clock, the body SHALL show the landing, and no cursor SHALL show.
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
- **THEN** A1 SHALL clear the prior surface once and render `+`, the strip clock, and the landing
- **AND** no notice background, child cursor, stale cell, or child text SHALL remain

#### Scenario: Switch or create without a blank strip
- **WHEN** the viewed tab changes to another tab or a newly created tab
- **THEN** no presented frame SHALL clear the screen or blank tab names before the new tab's content is painted

#### Scenario: Create a tab normally
- **WHEN** the user requests a new Agent from a tab or landing
- **THEN** the first paint SHALL show a single pending Agent chip and an empty transcript, ruled prompt with a visual caret, and full two-row footer without the previous child content, loading text, child cursor, or a clear-only frame
- **AND** the first input-ready complete surface SHALL replace them together with the real chip, body, and editor without an intermediate duplicate chip; during truecolor chip fill the displayed provisional footer SHALL stay steady until the latest real Agent footer is revealed at fill completion

#### Scenario: Pending footer matches the committed Agent UI
- **WHEN** an Agent is created while an existing Agent has a complete footer
- **THEN** the provisional footer SHALL preserve the real footer's left and right gutters and styled model/context presentation while resetting the new tab's usage to zero, but its path SHALL show only the new Agent's launch cwd without replaying another Agent's branch or PR link
- **AND** no previous prompt, conversation text, branch, or PR link SHALL leak into the provisional body
- **AND** the new Agent's real footer SHALL add its resolved branch and PR together after repository metadata refresh; before that, its plain cwd SHALL stay visible without blocking the body or input
- **WHEN** no complete Agent footer exists
- **THEN** the same owned footer layout SHALL show neutral model/context values without claiming unseen session metadata

#### Scenario: A registry list precedes the create acknowledgement
- **WHEN** the server publishes the new Agent in a registry list before `tab.created` or before the Agent's first complete surface
- **THEN** only the selected pending Agent chip SHALL appear beside the previously existing tabs
- **AND** the real Agent chip SHALL replace it, never appear beside it or blink out later

#### Scenario: Accent-aware pending chip fills into the real Agent
- **WHEN** the user creates an Agent with any supported accent scheme, including the default purple
- **THEN** its selected provisional chip SHALL use a lighter shade derived from that accent, and the real chip and body SHALL replace the preview together on the first complete frame
- **AND** the real chip's background SHALL fill from left to right from that initializing shade into its configured normal selected shade without moving its title or hit target, then settle fully to the selected shade
- **AND** the child body and input SHALL NOT wait for this chip-only animation, no scheme SHALL fall back to blue, and closing or switching during the fill SHALL NOT leave a stale active chip

#### Scenario: The real footer appears after the chip fills
- **WHEN** a pending Agent commits its first complete frame and the selected chip begins its truecolor fill
- **THEN** the already visible plain cwd path and provisional status row SHALL remain stable while the real body and editor update
- **AND** the latest real footer SHALL appear in one paint when the chip reaches its active shade, without briefly showing intermediate Agent status or inherited usage
- **AND** cancel, tab switch, or resize SHALL discard the held footer; without truecolor animation the real footer SHALL appear immediately

#### Scenario: Close before Agent startup completes
- **WHEN** the user invokes the close shortcut or closes the provisional chip from its context menu before the Agent's first frame
- **THEN** the pending chip and shell SHALL disappear immediately, the previous view or landing SHALL return, and A1 SHALL remain attached even when no other Agent is running; queued input for that creation SHALL be discarded
- **AND** the server SHALL cancel that exact creation before starting a holder when possible, or stop its holder and child if already launched
- **AND** a late create acknowledgement, registry list, or child frame SHALL NOT reveal a ghost Agent or close an unrelated new tab

#### Scenario: Creation is refused
- **WHEN** a pending Agent creation fails before a tab is registered
- **THEN** its pending chip and body SHALL disappear, the prior coherent view or landing SHALL return with an actionable notice, and buffered input SHALL NOT reach the prior Agent

### Requirement: Popup gestures preserve a usable v2 menu
Every strip popup SHALL remain open through its opening pointer gesture. Motion SHALL hover enabled rows, a primary click SHALL invoke one row once, separators SHALL remain inert, and an outside press SHALL dismiss without child input. Releases alone SHALL not dismiss. Popup rows SHALL use v2's dark normal/hover colors, white labels, muted shortcuts, and padding; palette output SHALL remain dark without reverse video.

#### Scenario: Release after opening the add menu
- **WHEN** the user presses `+` and releases the primary mouse button without another action
- **THEN** the launcher SHALL remain visible and usable

#### Scenario: Hover and choose Settings
- **WHEN** the launcher is open and the pointer moves onto Settings then clicks it
- **THEN** the Settings row SHALL show hover styling and the singleton Settings action SHALL run exactly once

#### Scenario: Cross a separator
- **WHEN** pointer motion or keyboard navigation reaches the launcher separator
- **THEN** the separator SHALL neither highlight nor activate and keyboard navigation SHALL skip it

#### Scenario: Render without direct RGB
- **WHEN** the terminal uses the supported palette path
- **THEN** popup rows SHALL remain dark and readable without a light reverse-video panel

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

### Requirement: The normal repository build produces a resident-ready local application

On a supported development platform, `npm run build` SHALL produce the managed runtime, process guardian, and a verified release-profile terminal-host addon for the current platform, including its manifest and notices, so a subsequent bare `./scripts/dev` launch can take the resident multi-agent route without deployment or a separate tabs-specific build command. Before cleaning or compiling, the build SHALL evaluate the complete native prerequisite set in one pass and fail with an actionable diagnostic when it cannot produce or verify that complete local artifact set; it SHALL NOT report success and defer discovery of the incomplete build to the launch-time single-agent fallback.

On Windows, the prerequisite set SHALL include Rust/Cargo, the Microsoft C++ x64 toolchain, and its Windows SDK environment. The build SHALL use an explicit valid tool override first, then an already valid launching environment, and otherwise SHALL discover installed Rustup and Visual Studio C++ tools and initialize them for build children without mutating the user's persistent environment. A GNU `link.exe` earlier on the launching `PATH` SHALL NOT be selected in place of Microsoft's linker. Missing software SHALL require explicit user installation; A1 SHALL NOT silently accept licenses, elevate privileges, or install third-party software.

#### Scenario: Developer builds and launches bare A1

- **WHEN** a developer runs `npm run build` successfully on a supported platform and then launches bare `./scripts/dev` from an interactive terminal
- **THEN** the local release SHALL contain a verified terminal host for that platform
- **AND** resident startup SHALL be available without publishing, installing, or running another build command

#### Scenario: Installed Windows tools are absent from the launching shell

- **WHEN** Rustup is installed in its canonical user location and a complete Visual Studio C++ workload is installed but Git Bash or ordinary PowerShell does not expose both tools correctly
- **THEN** plain `npm run build` SHALL initialize an effective child environment that resolves the repository-pinned Rust toolchain and Microsoft's x64 compiler and linker
- **AND** the build SHALL NOT require the developer to open another shell or prepend paths manually

#### Scenario: Git Bash shadows the Microsoft linker

- **WHEN** Git Bash's GNU `link.exe` precedes a complete installed Visual Studio toolchain on the launching `PATH`
- **THEN** the effective build environment SHALL select the Microsoft linker from the chosen Visual Studio installation
- **AND** prerequisite success SHALL NOT be reported for an environment that would invoke the GNU linker

#### Scenario: Windows native prerequisites are unavailable

- **WHEN** the normal build cannot obtain or verify Rust/Cargo, the Visual Studio C++ workload, its x64 linker, or its Windows SDK environment
- **THEN** the build SHALL fail before cleaning or compiling and name every observed blocker
- **AND** its diagnostic SHALL provide an ordered setup sequence using the official Rustup and Visual Studio installation paths, then direct the developer to rerun the same `npm run build`
- **AND** it SHALL NOT claim to have produced the normal runnable application or install external software without explicit user action

#### Scenario: Native prerequisite is unavailable

- **WHEN** the normal build cannot obtain or verify the current platform's terminal-library prerequisite
- **THEN** the build SHALL fail with a diagnostic naming how to obtain that prerequisite
- **AND** it SHALL NOT claim to have produced the normal runnable application

#### Scenario: Manual Git Bash handoff

- **WHEN** an implementation candidate is handed off for interactive testing on Windows Git Bash
- **THEN** the handoff SHALL provide one copy-pasteable line that changes to the exact worktree, runs `npm run build`, and launches `./scripts/dev`
- **AND** it SHALL NOT invoke the direct Node launcher, manually initialize Visual Studio, manually alter `PATH`, or require a tabs-specific build command

### Requirement: Open strip popups stay stable while tabs stream
An open context, overflow, or launcher popup SHALL be presented with each outer cell written once per frame with its final content. Child output beneath or beside the popup SHALL NOT clear, blank, or rewrite popup cells, and SHALL repaint only changed child cells outside the popup. Dismissing a popup SHALL restore the newest child content beneath it. On the legacy raw-byte fallback, the popup SHALL be repainted after the child bytes within the same synchronized frame.

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

### Requirement: First-run project-trust handoff stays visually quiet
When a viewed resident Agent confirms its startup project-trust decision, A1 SHALL treat the blank child surface between the cleared trust dialog and the first drawn owned-shell frame as a presentation handoff rather than visible activity. During that handoff, the tab chip SHALL retain its name without a starting lifecycle glyph and the body SHALL expose no child cursor. This exception SHALL NOT alter the tab's structured lifecycle state or suppress working, input-needed, settlement, crash, restart, or failure indicators outside the handoff.

#### Scenario: Confirm trust before the shell draws
- **WHEN** the user confirms a project-trust choice and the starting resident child publishes a blank surface before its owned shell is drawn
- **THEN** the viewed chip SHALL show no starting lifecycle glyph and the blank body SHALL show no cursor

#### Scenario: Complete the startup handoff
- **WHEN** the owned shell publishes its first drawn frame after the blank trust handoff
- **THEN** A1 SHALL present that frame with its normal cursor and status behavior without retaining the handoff suppression

#### Scenario: Preserve meaningful tab indicators
- **WHEN** the same or another tab works, needs input, settles, crashes, restarts, restores outside the blank trust handoff, or fails
- **THEN** its applicable status indicator SHALL remain visible according to the ordinary resident-tab status contract

### Requirement: Tab chips pad before the icon and separate it from the name
A1 SHALL paint one leading padding cell in each tab chip and one separating space between an applicable lifecycle icon and its name. Icon-less chips SHALL retain the leading padding cell. Width calculations and hit regions SHALL match the painted cells.

#### Scenario: Paint a chip with an icon
- **WHEN** a tab chip displays a lifecycle icon and a name
- **THEN** its first cell SHALL be a space, followed by the icon, one separating space, and the name

### Requirement: Resident structured replay converges to the newest child frame
When a viewed resident child publishes a complete structured frame, A1 SHALL present the newest value of every child cell and SHALL remove content that occupied a cell only in the prior frame. Explicit backgrounds on trailing blank cells SHALL remain part of the child frame through retained capture and outer presentation. Differential repainting, overlays, and row reuse SHALL NOT retain an obsolete scroll control, live-status row, glyph, background, or text after the authoritative child frame replaces or clears it.

#### Scenario: Clear a formerly painted bottom row
- **WHEN** a complete child frame clears or replaces a row that previously contained a scroll-to-bottom control or live status
- **THEN** the resident presentation SHALL replace every former cell with the newest row
- **AND** no second control, status line, or stale background SHALL remain near the dock

#### Scenario: Preserve styled trailing blanks
- **WHEN** a child row contains an explicit component background through trailing blank cells at its content boundary
- **THEN** retained capture and outer presentation SHALL preserve that background through the final intended cell
- **AND** a separately painted scrollbar rail SHALL NOT cause an intervening default-background gap

#### Scenario: Publish only complete relayed frames
- **WHEN** the child's pseudoterminal re-renders a synchronized frame on its own schedule and relays the frame's begin and end markers before or between the re-rendered cells, including during continuous wheel or scrollbar-drag motion
- **THEN** the holder SHALL NOT publish the cells rendered between the markers or the state at the end marker as a frame
- **AND** it SHALL publish once the re-rendered cells following the end marker have arrived and settled, or after a bounded wait when no further cells arrive
- **AND** a begin marker arriving before that render pass SHALL NOT publish the torn state
- **AND** a pseudoterminal that relays the child's bytes verbatim SHALL keep publishing exactly at each end marker

#### Scenario: Preserve solo content through the full resident pipeline
- **WHEN** solo and resident children receive identical terminal output at identical content geometry, including erased colored blanks, regional scrolling, links, wide glyphs, and moved overlays
- **THEN** retained capture, wire transport, and differential resident replay SHALL preserve the same semantic cells, styles, links, and child cursor position after each complete frame
- **AND** splitting a synchronized frame across transport reads SHALL NOT change its final content

#### Scenario: Preserve child geometry below the strip
- **WHEN** the outer terminal has one tab-strip row and the remaining rows belong to the child
- **THEN** the child SHALL receive the reduced height and use child-local cursor and scrolling coordinates
- **AND** presentation SHALL apply exactly one row offset without shifting, duplicating, or retaining content at the bottom edge

#### Scenario: Match solo fullscreen wrapping behavior
- **WHEN** the outer resident presenter paints complete retained rows as positioned cells
- **THEN** automatic line wrapping SHALL remain disabled for the outer fullscreen session so writing the final column cannot move content into another row
- **AND** leaving the outer session SHALL restore normal wrapping without changing the child terminal's own wrapping semantics

#### Scenario: Preserve Windows outer VT byte output
- **WHEN** resident replay writes full-width rows through a Windows console, including repeated badge and rail hover updates
- **THEN** the outer writer SHALL preserve UTF-8 VT byte output without routing the frame through stdout's UTF-16 console conversion
- **AND** edge glyphs and styled blanks SHALL remain in their retained columns without disabling differential rendering
- **AND** the writer SHALL restore the original console output encoding on exit and SHALL NOT change console encoding for redirected output

#### Scenario: Keep differential presentation coherent
- **WHEN** unchanged rows are reused while one or more rows are cleared, restyled, or replaced
- **THEN** A1 SHALL repaint the changed rows in one coherent presentation and acknowledge the new baseline only after the complete outer write succeeds
- **AND** unchanged popup, cursor, hyperlink, selection, and strip behavior SHALL remain intact

### Requirement: Resident attach starts without cursor or selection artifacts
The resident attach client SHALL hide the outer terminal cursor as part of entering its fullscreen terminal modes, before any asynchronous strip or child presentation can occur. When the server already has one or more resident Agent tabs and the launch does not request a specific tab, the attach handshake SHALL identify the first Agent in durable strip order and the client SHALL present that tab as active in its first tab-bearing frame. A profile with no existing tab SHALL retain the established first-draw gate for the newly created tab.

#### Scenario: First launch waits for child presentation
- **WHEN** bare A1 enters resident fullscreen mode before its first child surface is ready
- **THEN** no visible cursor SHALL appear in the blank child area
- **AND** the cursor SHALL remain hidden until a committed child surface places it

#### Scenario: Reattach to existing Agents
- **WHEN** one or more Agent tabs are already running and the user runs bare A1 without selecting a tab
- **THEN** the first Agent in strip order SHALL be the active tab in the first frame that shows those tabs
- **AND** the strip SHALL NOT briefly show every tab as inactive

#### Scenario: Explicit tab target remains authoritative
- **WHEN** launch requests a specific existing resident tab
- **THEN** that requested tab SHALL remain the initial active tab rather than being replaced by the first Agent

### Requirement: The resident tab bar follows the configured edge
Bare A1 SHALL expose one resident tab-bar position with allowed values `top` and `bottom`, defaulting to `top`. This requirement supersedes earlier top-only strip-placement statements. The chosen value SHALL apply live to attached resident clients. The tab bar SHALL occupy exactly one outer row at the selected edge, while every child retains the same column count and one fewer row than the outer terminal. Strip controls, clock, menus, notices, drag markers, terminal cursor, selection, and child mouse coordinates SHALL be composed relative to the selected edge. `a1 solo` and `a1 pi` SHALL remain strip-free.

#### Scenario: Default top position
- **WHEN** the profile has no stored tab-bar position
- **THEN** the strip SHALL occupy the top row and the child surface SHALL occupy the rows below it

#### Scenario: Bottom position
- **WHEN** the effective tab-bar position is `bottom`
- **THEN** the child surface SHALL begin on the first outer row and the strip SHALL occupy the final outer row
- **AND** the child SHALL retain the same row count it has with a top strip

#### Scenario: Change position live
- **WHEN** the user changes the tab-bar position while a resident client is attached
- **THEN** the next coherent presentation SHALL move the strip and current child surface to their configured rows without restarting an Agent or changing the active tab
- **AND** no stale strip, child row, overlay, or cursor SHALL remain at the former position

#### Scenario: Point at the bottom strip
- **WHEN** the strip is at the bottom and a pointer report addresses its row
- **THEN** the attach client SHALL own that report and the child SHALL receive no mouse event

#### Scenario: Point at a child row with a bottom strip
- **WHEN** the strip is at the bottom and a pointer report addresses the child surface
- **THEN** the child SHALL receive the same zero-based row that the equivalent visible row has in `a1 solo`
- **AND** no top-strip subtraction SHALL be applied

#### Scenario: Present overlays and cursor at either edge
- **WHEN** host overlays or the child cursor are visible and the tab-bar position changes
- **THEN** each SHALL remain aligned to the same semantic child cells and host controls at the newly configured edge

### Requirement: Resident tabs reorder through stable drag-and-drop
A resident tab drag SHALL show a stable insertion marker within the tab strip after left-button movement or the established hold threshold. Pointer motion SHALL preview only and SHALL NOT mutate durable order. Releasing the left button over a changed valid destination SHALL request exactly one reorder using the registry revision captured at drag start. Releasing at the original slot, outside the strip, after the source tab disappears, or against stale registry state SHALL leave durable order unchanged. The behavior SHALL apply at both configured strip edges.

#### Scenario: Preview a changed destination
- **WHEN** the user presses a visible tab and drags across another visible tab
- **THEN** the strip SHALL show one insertion line at the resulting boundary
- **AND** ordinary strip repaints SHALL NOT make the line flash or disappear
- **AND** tab order SHALL remain unchanged until release

#### Scenario: Commit on release
- **WHEN** the user releases over a valid destination different from the source slot
- **THEN** the client SHALL send exactly one reorder request for that destination
- **AND** the strip SHALL remove the insertion line while the durable order update is applied

#### Scenario: Suppress a no-op or cancelled drag
- **WHEN** the user releases at the source slot, outside the strip, after the source disappears, or after the registry revision becomes stale
- **THEN** no durable reorder SHALL occur
- **AND** no insertion line SHALL remain visible

#### Scenario: Drag with a bottom strip
- **WHEN** the tab bar is at the bottom and the user drags a visible tab
- **THEN** press, preview, release, and hit testing SHALL use the final outer row
- **AND** the child SHALL receive none of those strip-owned pointer reports

### Requirement: Resident scrollbar rail keeps its gutter column

The resident tab presentation SHALL draw every scrollbar track and thumb cell in the same final gutter column that solo mode uses, on every viewport row, including rows where a jump-to-bottom control, a live-status row, or streamed content previously appeared.

#### Scenario: Rail survives a moved bottom control

- **WHEN** a resident tab scrolls away from the end, shows the jump-to-bottom control, and then returns to the end so the control disappears
- **THEN** the row that held the control shows its rail cell in the final gutter column and no rail cell one column to its left

#### Scenario: Rail survives streamed rows under Windows ConPTY

- **WHEN** a resident child streams rows and hovers or drags the rail while Windows ConPTY re-renders its output
- **THEN** the retained resident rows match a complete capture of the child terminal and every rail cell stays in the gutter column

### Requirement: The empty resident shell presents the a1 landing
While the attach client has no tab to show and no view request pending, it SHALL keep the strip with its `+` control and clock and SHALL present the a1 landing in the body: the launch cwd, formatted and placed as an Agent tab's footer shows it (one-cell left gutter on the second-to-last body row, with the home directory as `~`, in the footer's dim color), the running version as `v<version>` with the same left gutter in the footer's dim color on the row below it, and the three-row half-block `a1` wordmark in the profile's accent color on the rows above it (omitted where half-block glyphs are unsupported or rows run out), so the folder stays in place when a tab opens or closes at either strip position. This SHALL hold from the first registry list the client receives: a list with no running tab and no pending create SHALL paint the landing at once, without waiting for a tab to have been shown first. The landing body SHALL be painted with the canvas the `backgroundStyle` setting gives Agent tabs, and SHALL leave the terminal background when it is `transparent`. When an Agent is added from the landing, the single pending Agent chip and complete idle editor/footer SHALL replace the landing on the initiating event; the first drawn Agent frame SHALL replace that pending presentation without a wipe or fade. A hidden utility tab SHALL retain its existing first-draw handoff. A tab the server is starting for this attach SHALL keep the established first-draw gate instead of the landing. The landing SHALL hold no input: keys, paste, and body mouse input SHALL reach no child, while tab shortcuts, the `+` launcher and its popups, strip hover, strip mouse input, and the double-`Ctrl+C` detach SHALL behave exactly as with tabs. The landing SHALL render no cursor and SHALL never be shown while a tab is viewed.

#### Scenario: Last tab closes into the landing
- **WHEN** the final Agent or Settings tab closes while the attach client stays open and the strip is at the top
- **THEN** the strip SHALL show `+` and the clock and the body SHALL show the launch cwd on the row where an Agent's footer shows it, the version below it, and the wordmark above it
- **AND** no cursor SHALL show

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
- **AND** the cwd and version rows SHALL each start after the same one-cell gutter as the Agent footer

#### Scenario: The landing follows the background setting
- **WHEN** `backgroundStyle` is `accent` or `dark` and the landing is shown
- **THEN** every body cell SHALL use the canvas an Agent tab would use for that style and accent

#### Scenario: A lone hidden Settings tab is not an Agent
- **WHEN** bare `a1` attaches and the registry holds only a hidden Settings tab
- **THEN** the server SHALL create one A1 tab in the launch cwd and the client SHALL view it, not the Settings tab

#### Scenario: Small terminal
- **WHEN** the body has fewer rows or columns than the full header needs
- **THEN** the header SHALL be clipped to the body without wrapping or overflowing it

### Requirement: The plus menu is configurable
A1 SHALL offer `Agent`, a multi-instance kind whose every invocation creates a new Agent tab in the launch cwd and whose launcher row carries the `+` marker, and every utility kind, `Settings` and `Changelog`, singleton toggles whose launcher rows carry `✓` while their tab is open. The A1 setting `tabBarPlusMenu` SHALL hold the kinds `+` offers, comma-joined in that order, and SHALL default to `Agent` alone. With only `Agent` enabled, clicking `+` SHALL create an Agent without a menu; with any other enabled set, clicking `+` SHALL open the launcher with one row per enabled kind in kind order and each row's effective shortcut right-aligned; with no kind enabled, the strip SHALL hide `+` and give its cells to the tabs. Right-clicking `+` SHALL open a one-row `Configure` popup whose selection opens the `Plus Menu` dialog as a modal over the dimmed active tab or landing, without switching tabs. The dialog SHALL describe itself as `Choose what the + button in the tab bar can add.`, list every kind with `●` when enabled and `○` when not, toggle the selected kind with `Space`, move with Up and Down, filter by typed text, store each toggle in `tabBarPlusMenu` at once under the settings document lock, apply it to `+` without a restart, ignore the pointer, and close with `Esc`. The search line SHALL draw its caret as a reversed white cell, as owned inputs do, and a blank row SHALL separate the description from it. The Settings `Plus menu` entry SHALL open the same modal over the Settings tab through the tab's controlling client, and SHALL open an equivalent dialog inside the Settings screen only when no tab bar can show it. When a modal closes, the strip SHALL draw at full intensity.

#### Scenario: Default plus
- **WHEN** the profile stores no plus menu and the user clicks `+`
- **THEN** one Agent SHALL be created and no launcher SHALL open

#### Scenario: Plus offers more kinds
- **WHEN** the plus menu enables Agent, Settings, and Changelog and the user clicks `+`
- **THEN** the launcher SHALL show `+ Agent`, `Settings`, and `Changelog` in that order with their effective shortcuts
- **AND** Settings or Changelog SHALL show `✓` while its tab is open

#### Scenario: Configure from the strip
- **WHEN** the user right-clicks `+` and chooses `Configure`
- **THEN** the `Plus Menu` dialog SHALL open over the dimmed active tab, list `Agent`, `Settings`, and `Changelog`, and the viewed tab SHALL NOT change

#### Scenario: Toggle a kind
- **WHEN** the dialog is open on `Changelog` and the user presses `Space`
- **THEN** `Changelog` SHALL switch between `●` and `○` and the next click on `+` SHALL reflect the change

#### Scenario: Configure from Settings
- **WHEN** the user activates the Settings `Plus menu` entry in a resident Settings tab
- **THEN** the `Plus Menu` modal SHALL open over the dimmed Settings tab

#### Scenario: Nothing enabled
- **WHEN** the user disables every kind
- **THEN** the strip SHALL no longer show `+`, and the Settings `Plus menu` entry SHALL still open the dialog

### Requirement: Tabs open at once and only a resize fades

The attach client SHALL present one locally pending new Agent chip and an empty transcript and complete idle editor/footer with a visual caret but no child cursor on the first paint after a user create action, without awaiting process startup; its complete real surface SHALL replace the pending presentation as soon as its first nonblank drawn frame commits, without a fade. Blank child surfaces SHALL remain parked for any duration and SHALL NOT replace the pending Agent presentation or expose a child cursor merely because a first-draw timer elapsed. Revealed Settings and Changelog tabs SHALL retain the current content until their first nonblank drawn frame commits. An explicit create refusal, failed surface, holder loss, child exit, restart, or recovery outcome SHALL continue through its existing owned presentation rather than remain hidden behind the first-draw gate. Only a resize reveal SHALL fade. The attach client SHALL retain its last coherent frame and delay the curtain for at least 120 milliseconds after a focused resize begins. If a frame matching the latest geometry arrives before that threshold, it SHALL paint directly at full intensity without showing the curtain or running the fade. If the focused resize remains unresolved beyond the threshold, the curtain SHALL appear and, once it lifts, the whole frame including the strip SHALL draw faint for one fade interval and then at full intensity, with no cursor shown during the fade. Repeated geometry reports during one focused resize SHALL preserve the initial threshold deadline while retargeting the curtain and recovery gate to the latest geometry. A resize received while the outer terminal tab is unfocused SHALL update geometry without arming or showing the curtain; focus loss SHALL cancel any pending or visible curtain, and focus gain SHALL restore one complete coherent frame. A starting tab's chip SHALL show no spinner. One tab SHALL open at a time: while a tab this client asked for is still starting or not yet shown, a new-Agent shortcut, `+` click, or menu entry SHALL start nothing.

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

- **WHEN** a focused resize remains unresolved beyond the curtain threshold and its matching frame later arrives
- **THEN** the curtain SHALL lift into a whole-frame fade with no cursor shown, and opening a tab SHALL never fade

#### Scenario: A quick snap resize does not flash the curtain

- **WHEN** a focused terminal resize receives a frame for the latest geometry within 120 milliseconds
- **THEN** the coherent frame SHALL paint directly at full intensity
- **AND** the centered `Resize` curtain SHALL never be shown

#### Scenario: A prolonged resize retains stable feedback

- **WHEN** focused geometry reports continue beyond 120 milliseconds before a matching frame is ready
- **THEN** the curtain SHALL appear once using the latest dimensions
- **AND** later geometry reports SHALL NOT restart the initial threshold or move a brief flash to the end of the resize

#### Scenario: An inactive terminal tab does not retain resize feedback

- **WHEN** the terminal application resizes while the A1 terminal tab is unfocused
- **THEN** A1 SHALL forward the new geometry without arming or showing the curtain
- **AND** returning to the A1 terminal tab SHALL repaint a complete frame without flashing stale resize feedback

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

### Requirement: Changelog is a singleton utility tab
Bare A1 resident mode SHALL present at most one profile-global utility tab titled `Changelog` that renders the owned changelog reference screen without owning an Agent session. The palette and `tabs.changelog` SHALL show it at once: the attach client SHALL keep one Changelog tab prewarmed and hidden, as it does Settings, starting it after Settings is ready and again after a Changelog tab closes, and SHALL create one only when none is running. Every utility tab, Settings and Changelog alike, SHALL follow one set of tab bar rules: opening one that is not in the strip SHALL place it last, its toggle SHALL hide the viewed one while its process keeps running, and a resident tab whose id names a utility route SHALL present that route as its pinned screen. Its registry record SHALL have the `changelog` kind. Its chip SHALL offer Close but not Rename. Its screen SHALL be the tab: it SHALL show no `Esc close` hint, and neither `Esc` nor one `Ctrl+C` SHALL close it. Resident Agents SHALL neither advertise nor execute `/changelog`; `a1 solo` and `a1 pi` SHALL keep their existing changelog command.

#### Scenario: Open the changelog
- **WHEN** the user runs Changelog from the palette with no Changelog tab
- **THEN** one tab titled `Changelog` SHALL appear and show the changelog screen

#### Scenario: Reuse the changelog
- **WHEN** a Changelog tab exists and the user runs Changelog again
- **THEN** that tab SHALL be shown without creating another

#### Scenario: Changelog opens at once
- **WHEN** Settings and Changelog are prewarmed and the user runs Changelog
- **THEN** the hidden Changelog tab SHALL be shown without starting a process

#### Scenario: A utility tab opens last
- **WHEN** a hidden Changelog or Settings tab is opened after more Agents were added
- **THEN** it SHALL join the strip as the last tab, while one already in the strip SHALL keep its slot

#### Scenario: Closing the last Agent
- **WHEN** a hidden Changelog or Settings tab is running and the user closes the last Agent
- **THEN** the landing SHALL be shown and neither hidden tab SHALL take the view

#### Scenario: Esc keeps the Changelog tab
- **WHEN** the Changelog tab is viewed and the user presses `Esc`
- **THEN** the tab SHALL stay open and its hint line SHALL show no `Esc close`

#### Scenario: Changelog is not an Agent command
- **WHEN** a resident Agent's slash-command autocomplete lists commands or the user enters `/changelog`
- **THEN** `changelog` SHALL be absent and `/changelog` SHALL NOT open a screen in that Agent

### Requirement: Tab rename selection uses the owned selection style
While a tab is renamed inline, selected characters SHALL be drawn with the owned editor's selection background and the chip's own text color, never as reversed cells, in truecolor and palette modes alike.

#### Scenario: Select a tab name
- **WHEN** the user presses `Ctrl+A` in an inline tab rename
- **THEN** the selected name SHALL show the editor's selection background with unchanged text color

### Requirement: Tab names and session names stay in sync
A resident Agent's tab name and its Pi session name SHALL name the same thing. A strip rename or an automatic name SHALL set the session name, and a session name the Agent's session otherwise sets, or that its resumed session carries, SHALL become the tab name with a user name source so automatic naming no longer replaces it. A default session name SHALL NOT replace a tab name. Because renaming the tab renames the session, a resident Agent SHALL omit `/name` from its command suggestions and refuse it with a notice pointing to the tab rename; direct A1 SHALL keep `/name`.

#### Scenario: Rename the session from the Agent
- **WHEN** the user runs `/name what is there` in a resident Agent named `what-is this`
- **THEN** the Agent SHALL refuse it with a notice to rename the tab (`F2`), and the tab and session names SHALL stay `what-is this`
- **AND** `/name` SHALL NOT appear among the Agent's command suggestions, while direct A1 SHALL still offer and run it

#### Scenario: Rename the tab from the strip
- **WHEN** the user renames the tab to `login fix` from the strip
- **THEN** the Agent's session name SHALL become `login fix`

### Requirement: Utility tabs run without an Agent engine
A resident utility tab, Settings or Changelog, SHALL run a child process that neither loads nor starts the Pi engine, a session backend, extensions, prompt history, prompt suggestions, or draft recovery. The child SHALL choose this from its tab id before any A1 or Pi module loads. It SHALL present only the tab's pinned route screen, with the same theme, accent, background canvas, keybindings, mouse handling, interrupt chord, and controller-boundary handling as the full composition. It SHALL start the tab bridge, report its status and accent, publish the effective tab shortcuts, request the Plus Menu modal through `configure-plus`, detach the client on the double interrupt, close its tab when its screen closes, and stop on `bridge.stop`. Agent tabs, the standby, `a1 solo`, and `a1 pi` SHALL keep the full composition.

#### Scenario: A Settings tab loads no engine
- **WHEN** the client prewarms or opens the Settings tab
- **THEN** its child SHALL show the Settings screen without creating a Pi engine host or session

#### Scenario: A Changelog tab loads no engine
- **WHEN** the client prewarms or opens the Changelog tab
- **THEN** its child SHALL show the packaged changelog without creating a Pi engine host or session, and SHALL take no startup "What's New" claim

#### Scenario: Tab-bar behavior is unchanged
- **WHEN** a slim utility tab is viewed
- **THEN** tab shortcuts, `Alt+/`, `Configure` from Settings, the double interrupt, and closing the tab SHALL behave as they do for the full composition

#### Scenario: Agent tabs are unchanged
- **WHEN** the client creates an Agent tab or promotes the standby
- **THEN** its child SHALL run the full composition with the Pi engine

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

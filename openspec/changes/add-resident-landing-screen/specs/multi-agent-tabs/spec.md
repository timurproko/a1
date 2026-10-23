# multi-agent-tabs Delta

## ADDED Requirements

### Requirement: The empty resident shell presents the a1 landing
While the attach client has no tab to show and no view request pending, it SHALL keep the strip with its `+` control and clock and SHALL present the a1 landing in the body: the launch cwd, formatted and placed as an Agent tab's footer shows it (flush left on the second-to-last body row, with the home directory as `~`, in the footer's dim color), the running version as `v<version>` in the footer's dim color on the row below it, and the three-row half-block `a1` wordmark in the profile's accent color on the rows above it (omitted where half-block glyphs are unsupported or rows run out), so the folder stays in place when a tab opens or closes at either strip position. The landing body SHALL be painted with the canvas the `backgroundStyle` setting gives Agent tabs, and SHALL leave the terminal background when it is `transparent`. When the user starts an Agent from the landing, the wordmark's accent cells SHALL wipe away from the right within about 180 ms while its first cell turns white, so only the cell where the Agent's editor caret appears remains until that Agent's first frame commits; a refused creation SHALL restore the wordmark. The landing SHALL hold no input: keys, paste, and body mouse input SHALL reach no child, while tab shortcuts, the `+` launcher and its popups, strip hover, strip mouse input, and the double-`Ctrl+C` detach SHALL behave exactly as with tabs. The landing SHALL render no cursor and SHALL never be shown while a tab is viewed or requested.

#### Scenario: Last tab closes into the landing
- **WHEN** the final Agent or Settings tab closes while the attach client stays open and the strip is at the top
- **THEN** the strip SHALL show `+` and the clock and the body SHALL show the launch cwd on the row where an Agent's footer shows it, the version below it, and the wordmark above it
- **AND** no cursor SHALL show

#### Scenario: The folder does not move when a tab opens
- **WHEN** the user creates an Agent from the landing at either tab bar position
- **THEN** the Agent's footer SHALL show the cwd on the same row and column as the landing showed it

#### Scenario: Start an Agent from the landing
- **WHEN** the user presses the `New A1 tab` shortcut or chooses `+ Agent` from the launcher on the landing
- **THEN** one Agent SHALL be created and presented through the ordinary tab UI

#### Scenario: Open Settings from the landing
- **WHEN** the user presses the `Open Settings tab` shortcut or chooses `Settings` from the `+` launcher on the landing
- **THEN** the hidden Settings tab kept ready beside the landing SHALL be shown through the ordinary tab UI without starting a new process

#### Scenario: The wordmark hands over to the Agent caret
- **WHEN** the user starts an Agent from the landing
- **THEN** the wordmark SHALL wipe from the right until only a white cell remains where the Agent's caret appears
- **AND** that cell SHALL hold until the Agent's first frame commits

#### Scenario: The landing follows the background setting
- **WHEN** `backgroundStyle` is `accent` or `dark` and the landing is shown
- **THEN** every body cell SHALL use the canvas an Agent tab would use for that style and accent

#### Scenario: Small terminal
- **WHEN** the body has fewer rows or columns than the full header needs
- **THEN** the header SHALL be clipped to the body without wrapping or overflowing it

## MODIFIED Requirements

### Requirement: Bare A1 runs one resident tab when opted in
On Windows x64, macOS, and Linux, when the A1 setting `residentTabs` is enabled, bare `a1` without a session selection SHALL ensure the profile's resident server before the launch guardian starts, then run the terminal host's attach role, hosted by the Node runtime through the release's fixed role entry, as the launch instance's root instead of the direct owned UI. With no Agent tab and the `tabsStartup` setting at its default `empty`, the client SHALL open the landing and the server SHALL start no tab until the user creates one; with `tabsStartup` set to `agent`, or for a client that asks for its first Agent, as an older client does by default, the server SHALL create one A1 tab running `bin/ui.js --tab` in the client's launch cwd; with an existing tab, the client SHALL view it. Each tab process SHALL receive its own launch runtime identity, distinct from every other tab incarnation and launch instance. The attach client SHALL draw a one-row strip with the tab's status glyph and name above the tab's surface. While one client is attached, another bare `a1` of the same profile SHALL be refused with a message naming the other terminal and SHALL NOT start a direct session. When the terminal host is missing, the platform is unsupported, resident survival cannot be verified, or the server is incompatible, blocked, or cannot start, bare `a1` SHALL run the direct single-agent owned UI and show one notice naming the reason. With the setting at its default `false`, bare `a1` SHALL behave exactly as without this capability. `a1 pi` and `a1 --session` SHALL keep their direct behavior.

#### Scenario: First launch with resident tabs enabled
- **WHEN** the user enables `residentTabs` and runs bare `a1` with no resident tab
- **THEN** the landing SHALL show with the strip's `+` and clock and no tab SHALL start
- **AND** the `New A1 tab` shortcut or `+ Agent` SHALL start the full A1 UI in the launch cwd, shown starting and then idle

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

### Requirement: Resident attach starts without cursor or selection artifacts
The resident attach client SHALL hide the outer terminal cursor as part of entering its fullscreen terminal modes, before any asynchronous strip or child presentation can occur. When the server already has one or more resident Agent tabs and the launch does not request a specific tab, the attach handshake SHALL identify the first Agent in durable strip order and the client SHALL present that tab as active in its first tab-bearing frame. A profile with no existing Agent SHALL open on the landing, and a tab created from it SHALL retain the established first-draw gate.

#### Scenario: First launch waits for child presentation
- **WHEN** bare A1 enters resident fullscreen mode before a requested tab's first child surface is ready
- **THEN** no visible cursor SHALL appear in the blank child area
- **AND** the cursor SHALL remain hidden until a committed child surface places it

#### Scenario: Reattach to existing Agents
- **WHEN** one or more Agent tabs are already running and the user runs bare A1 without selecting a tab
- **THEN** the first Agent in strip order SHALL be the active tab in the first frame that shows those tabs
- **AND** the strip SHALL NOT briefly show every tab as inactive

#### Scenario: Explicit tab target remains authoritative
- **WHEN** launch requests a specific existing resident tab
- **THEN** that requested tab SHALL remain the initial active tab rather than being replaced by the first Agent


### Requirement: Bare A1 presents resident A1 sessions as tabs
Bare `a1` SHALL present a v2-style one-row tab strip at the top of the terminal and the viewed tab's terminal surface in all remaining rows. Each tab SHALL be an independent resident terminal session running the complete A1 owned UI with its own Pi agent session, extensions, transcript, editor, queue, model, thinking level, notices, and cwd. Only the viewed tab SHALL receive keyboard, paste, focus, and surface mouse input. Surface mouse reports SHALL remove the one-row tab-strip offset exactly once so the viewed child receives coordinates matching its visible rows, while mouse input on the strip SHALL remain attach-owned and SHALL NOT reach the child. The strip SHALL be present even when a single tab exists. When no tab exists, the strip SHALL keep its `+` control and clock and the surface below it SHALL show the a1 landing. The tab chip SHALL be the resident session name's visible location, and the viewed resident shell SHALL NOT repeat that name in its inner footer; direct single-agent and comparison launches without a tab strip SHALL retain their existing footer session name. Extension components using the certified text-terminal contract SHALL behave as in direct single-agent bare A1 on Windows x64, macOS arm64, and Linux x64; inline image protocols SHALL use the text fallback. `a1 solo` and `a1 pi` SHALL NOT present a tab strip.

#### Scenario: Explicit solo launch
- **WHEN** the user runs `a1 solo`
- **THEN** A1 SHALL launch one direct single-agent owned UI without resident infrastructure or a Tabs settings section

#### Scenario: First launch with no tabs
- **WHEN** the user runs bare `a1` and the profile has no resident tabs
- **THEN** A1 SHALL open the landing in the launch cwd and start no tab until the user creates one

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
- Successful create and close SHALL commit only complete final topology states.
- A newly created Agent SHALL become visible only with its first drawn frame, or after a bounded fallback when the child never draws. The prior view SHALL remain until then and no cursor SHALL show.
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
- **WHEN** a new Agent reaches its first input-ready complete surface
- **THEN** its chip, body, status bar, and editor SHALL appear together without a provisional flashing chip, blank body, stray cursor, or clear-only frame


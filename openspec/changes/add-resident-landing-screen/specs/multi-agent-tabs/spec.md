# multi-agent-tabs Delta

## ADDED Requirements

### Requirement: The empty resident shell presents the a1 landing
While the attach client has no tab to show and no view request pending, it SHALL keep the strip with its `+` control and clock and SHALL present the a1 landing in the body below it, laid out like an empty agent screen. A top-left header SHALL show the three-row half-block `a1` wordmark in the profile's accent color (omitted where half-block glyphs are unsupported) beside `a1` with the running version and, below it, the shortened launch cwd. At the bottom of the body, where the new Agent's editor appears, one prompt box SHALL mirror the flush-left owned editor: full-width rules in the accent-derived border color, text from the first column, the dim placeholder `Ask anything…` when empty, and the owned editor's caret (the cell under the cursor reversed, with the hardware cursor hidden). The effective `New A1 tab` and `Open Settings tab` shortcuts SHALL show as owned key-and-action hints on the row below the box. The header and then the hint row SHALL be dropped when rows run out, and the box alone SHALL render below three body rows. The box SHALL accept printable keys, paste including line breaks, the inline-rename editing controls, and `Esc` to clear; it SHALL grow upward to six wrapped rows and keep the cursor row visible; one `Ctrl+C` SHALL clear it and a second inside the detach window SHALL detach as today. Its text SHALL be bounded to 64 KiB, with a notice on refusal. `Enter` with non-blank text SHALL create one Agent in the launch cwd whose first prompt is that text, keep the text visible behind the accent progress spinner while creation is pending, ignore edits until the Agent's first drawn frame commits, and then present the Agent through the ordinary tab UI; `Enter` on blank text SHALL do nothing; a refused creation SHALL restore the editable text and show the existing creation failure notice. Tab shortcuts, the `+` launcher and its popups, strip hover, and strip mouse input SHALL behave exactly as with tabs; mouse input on the landing body SHALL be ignored. The landing SHALL render no hardware or child cursor and SHALL never be shown while a tab is viewed or requested.

#### Scenario: Last tab closes into the landing
- **WHEN** the final Agent or Settings tab closes while the attach client stays open
- **THEN** the strip SHALL show `+` and the clock, the body header SHALL show the wordmark, `a1` with its version, and the launch cwd, and the bottom of the body SHALL show the empty prompt box with its placeholder above the two shortcut hints
- **AND** the caret SHALL be drawn on the placeholder's first cell with the hardware cursor hidden

#### Scenario: Ask from the landing
- **WHEN** the user types `What does this repository build?` into the landing box and presses `Enter`
- **THEN** one Agent tab SHALL be created in the launch cwd, the box SHALL keep the text behind the accent progress spinner until the Agent's first frame commits, and the Agent SHALL then appear in the ordinary tab UI with that prompt submitted exactly once as its first turn

#### Scenario: Enter on an empty landing
- **WHEN** the landing box holds only whitespace and the user presses `Enter`
- **THEN** no Agent SHALL be created and the box SHALL remain empty with its placeholder

#### Scenario: Creation is refused
- **WHEN** the server refuses the landing's creation request
- **THEN** the typed text SHALL return to the editable box and the existing creation failure notice SHALL show
- **AND** the seeded prompt SHALL be dispatched nowhere

#### Scenario: Shortcuts still work on the landing
- **WHEN** the user presses the `New A1 tab` shortcut or chooses `+ Agent` from the launcher while text sits in the landing box
- **THEN** an Agent SHALL be created without a seeded prompt and the landing text SHALL be discarded with the landing

#### Scenario: Clear the landing
- **WHEN** the user presses `Esc` or one `Ctrl+C` with text in the landing box
- **THEN** the box SHALL be emptied and the client SHALL remain attached
- **AND** a second `Ctrl+C` inside the detach window SHALL detach as with tabs

#### Scenario: Paste into the landing
- **WHEN** the user pastes three lines into the landing box
- **THEN** the box SHALL show the lines wrapped within its width, keep the cursor row visible, and submit the text with its line breaks on `Enter`

#### Scenario: Small terminal
- **WHEN** the body has fewer rows than the full landing needs
- **THEN** the wordmark and then the hint row SHALL be omitted before the box, and the box SHALL remain usable

## MODIFIED Requirements

### Requirement: Bare A1 presents resident A1 sessions as tabs
Bare `a1` SHALL present a v2-style one-row tab strip at the top of the terminal and the viewed tab's terminal surface in all remaining rows. Each tab SHALL be an independent resident terminal session running the complete A1 owned UI with its own Pi agent session, extensions, transcript, editor, queue, model, thinking level, notices, and cwd. Only the viewed tab SHALL receive keyboard, paste, focus, and surface mouse input. Surface mouse reports SHALL remove the one-row tab-strip offset exactly once so the viewed child receives coordinates matching its visible rows, while mouse input on the strip SHALL remain attach-owned and SHALL NOT reach the child. The strip SHALL be present even when a single tab exists. When no tab exists, the strip SHALL keep its `+` control and clock and the surface below it SHALL show the a1 landing. The tab chip SHALL be the resident session name's visible location, and the viewed resident shell SHALL NOT repeat that name in its inner footer; direct single-agent and comparison launches without a tab strip SHALL retain their existing footer session name. Extension components using the certified text-terminal contract SHALL behave as in direct single-agent bare A1 on Windows x64, macOS arm64, and Linux x64; inline image protocols SHALL use the text fallback. `a1 solo` and `a1 pi` SHALL NOT present a tab strip.

#### Scenario: Explicit solo launch
- **WHEN** the user runs `a1 solo`
- **THEN** A1 SHALL launch one direct single-agent owned UI without resident infrastructure or a Tabs settings section

#### Scenario: First launch with no tabs
- **WHEN** the user runs bare `a1` and the profile has no resident tabs
- **THEN** A1 SHALL create one A1 tab in the launch cwd and view it

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
- **THEN** the hidden Settings tab SHALL close too and the strip SHALL show only `+` and the clock above the landing
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
- When no tabs remain, the strip SHALL show hoverable `+` and the clock, the body SHALL show the landing with its own drawn caret, and no hardware or child cursor SHALL show.
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


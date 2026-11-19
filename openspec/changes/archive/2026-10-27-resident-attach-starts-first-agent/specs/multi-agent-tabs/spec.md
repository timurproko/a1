# multi-agent-tabs Delta

## MODIFIED Requirements

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

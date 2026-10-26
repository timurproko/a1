## MODIFIED Requirements

### Requirement: Resident lifecycle mechanics remain invisible
The resident attach client SHALL keep controller, subscription, and intentional-stop mechanics invisible:
- Input during automatic transfer SHALL be delivered once after acknowledgement, or refused before any prefix.
- Pointer motion and focus reports SHALL never consume the input budget of a pending view or cause key or paste input to be refused.
- The attach client SHALL NOT render an input-delivery notice row such as `Input was not sent; try again.` beneath the strip.
- Successful create and close SHALL commit only complete final topology states; locally pending presentation SHALL NOT enter the authoritative registry.
- A user-created Agent SHALL immediately show a coherent locally pending chip and starting body, without the old child surface or a cursor. Its real child surface SHALL become visible only with its first drawn frame, or after a bounded fallback when the child never draws.
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
- **THEN** the first paint SHALL show a single pending Agent chip and a starting body without the previous child content, a blank body, a stray cursor, or a clear-only frame
- **AND** the first input-ready complete surface SHALL replace them together with the real chip, body, status bar, and editor

#### Scenario: Creation is refused
- **WHEN** a pending Agent creation fails before a tab is registered
- **THEN** its pending chip and body SHALL disappear, the prior coherent view or landing SHALL return with an actionable notice, and buffered input SHALL NOT reach the prior Agent

### Requirement: The empty resident shell presents the a1 landing
While the attach client has no tab to show and no view request pending, it SHALL keep the strip with its `+` control and clock and SHALL present the a1 landing in the body: the launch cwd, formatted and placed as an Agent tab's footer shows it (flush left on the second-to-last body row, with the home directory as `~`, in the footer's dim color), the running version as `v<version>` in the footer's dim color on the row below it, and the three-row half-block `a1` wordmark in the profile's accent color on the rows above it (omitted where half-block glyphs are unsupported or rows run out), so the folder stays in place when a tab opens or closes at either strip position. The landing body SHALL be painted with the canvas the `backgroundStyle` setting gives Agent tabs, and SHALL leave the terminal background when it is `transparent`. When an Agent is added from the landing, the pending Agent presentation SHALL replace the landing on the initiating event; the first drawn Agent frame SHALL replace that pending presentation without a wipe or fade. A hidden utility tab SHALL retain its existing first-draw handoff. The landing SHALL hold no input: keys, paste, and body mouse input SHALL reach no child, while tab shortcuts, the `+` launcher and its popups, strip hover, strip mouse input, and the double-`Ctrl+C` detach SHALL behave exactly as with tabs. The landing SHALL render no cursor and SHALL never be shown while a tab is viewed.

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

#### Scenario: Adding a tab hides the landing
- **WHEN** the user adds an Agent from the landing
- **THEN** the landing SHALL immediately give way to a coherent pending Agent presentation, which the first drawn Agent frame SHALL replace at once
- **WHEN** the user opens a utility tab from the landing
- **THEN** the landing SHALL remain until the utility tab's first drawn frame replaces it

#### Scenario: The wordmark hands over to the Agent caret
- **WHEN** the user starts an Agent from the landing
- **THEN** no wipe or fade SHALL run: the pending starting body SHALL replace the landing, then the Agent's first drawn frame SHALL replace the whole pending body at once

#### Scenario: The landing follows the background setting
- **WHEN** `backgroundStyle` is `accent` or `dark` and the landing is shown
- **THEN** every body cell SHALL use the canvas an Agent tab would use for that style and accent

#### Scenario: A lone hidden Settings tab is not an Agent
- **WHEN** bare `a1` attaches and the registry holds only a hidden Settings tab
- **THEN** the server SHALL create one A1 tab in the launch cwd and the client SHALL view it, not the Settings tab

#### Scenario: Small terminal
- **WHEN** the body has fewer rows or columns than the full header needs
- **THEN** the header SHALL be clipped to the body without wrapping or overflowing it

### Requirement: Tabs open at once and only a resize fades
The attach client SHALL present a locally pending new Agent tab and starting body on the first paint after a user create action, without awaiting process startup; its complete real surface SHALL replace the pending presentation as soon as its first drawn frame commits, without a fade. Revealed Settings and Changelog tabs SHALL retain the current content until their first drawn frame commits. A tab that never draws SHALL still show after the bounded first-draw wait. Only a resize reveal SHALL fade: once its curtain lifts the whole frame, the strip included, SHALL draw faint for one fade interval and then at full intensity, with no cursor shown during the fade. A starting tab's chip SHALL show no spinner. One tab SHALL open at a time: while a tab this client asked for is still starting or not yet shown, a new-Agent shortcut, `+` click, or menu entry SHALL start nothing.

#### Scenario: A new tab draws at once
- **WHEN** the user creates an Agent beside another tab
- **THEN** the first paint SHALL show the pending Agent and starting body, then its first complete child frame SHALL replace them together at full intensity without a fade

#### Scenario: A revealed utility tab draws at once
- **WHEN** the user opens a hidden Settings or Changelog tab whose retained screen is still blank
- **THEN** the current content SHALL stay until the tab draws, so no empty body or bare cursor shows, and the tab SHALL then show with no fade

#### Scenario: A burst of new-Agent shortcuts opens one Agent at a time
- **WHEN** the user presses the new-Agent shortcut repeatedly while an Agent is still opening
- **THEN** no further Agent SHALL start until that Agent is shown, so no Agents start in the background and the newest Agent opened is the one in view

#### Scenario: A starting tab has no spinner
- **WHEN** an Agent tab is starting
- **THEN** its chip SHALL show no glyph before its name

#### Scenario: A resize fades the whole frame
- **WHEN** a resize reveal runs
- **THEN** the whole frame SHALL fade in with no cursor shown, and opening a tab SHALL never fade

## ADDED Requirements

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

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Tabs open at once and resizes repaint without an overlay

The attach client SHALL present one locally pending new Agent chip and an empty transcript and complete idle editor/footer with a visual caret but no child cursor on the first paint after a user create action, without awaiting process startup; its complete real surface SHALL replace the pending presentation as soon as its first nonblank drawn frame commits, without a fade. Blank child surfaces SHALL remain parked for any duration and SHALL NOT replace the pending Agent presentation or expose a child cursor merely because a first-draw timer elapsed. Revealed Settings and Changelog tabs SHALL retain the current content until their first nonblank drawn frame commits. An explicit create refusal, failed surface, holder loss, child exit, restart, or recovery outcome SHALL continue through its existing owned presentation rather than remain hidden behind the first-draw gate. Every changed-size resize SHALL repaint the retained complete frame at the current geometry without a resize-only curtain, dimming, or fade. Geometry SHALL continue reaching the child immediately, and a newer complete surface SHALL replace the retained frame when available. An inactive terminal tab SHALL NOT retain resize feedback that flashes on return; focus gain SHALL repaint a complete frame. A starting tab's chip SHALL show no spinner. One tab SHALL open at a time: while a tab this client asked for is still starting or not yet shown, a new-Agent shortcut, `+` click, or menu entry SHALL start nothing.

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

#### Scenario: Resize repaints the Agent frame directly

- **WHEN** the outer terminal changes size during a quick snap or prolonged drag
- **THEN** A1 SHALL repaint the complete retained strip and child frame at the new size without a resize-only overlay or fade
- **AND** the newest complete child frame SHALL replace the retained content as it arrives

#### Scenario: Switching back after a background resize

- **WHEN** the terminal application resizes while the A1 terminal tab is unfocused and the user returns
- **THEN** A1 SHALL forward the new geometry and repaint a complete frame at full intensity without flashing any resize feedback

## REMOVED Requirements

### Requirement: Tabs open at once and only a resize fades
**Reason**: Direct resize repainting replaces the resize curtain and its fade without changing tab startup behavior.

**Migration**: Use "Tabs open at once and resizes repaint without an overlay".

## MODIFIED Requirements

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

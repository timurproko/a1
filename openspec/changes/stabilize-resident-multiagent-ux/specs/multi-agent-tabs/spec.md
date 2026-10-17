# multi-agent-tabs Delta

## ADDED Requirements

### Requirement: Resident Settings is one global utility tab
Bare A1 resident mode SHALL present at most one profile-global utility tab titled `Settings`. It SHALL render the owned global settings without owning an Agent session. The launcher and `tabs.settings` action SHALL create or activate that singleton, and closing its screen or tab SHALL remove it. Resident Agents SHALL not advertise or execute `/settings`; `a1 solo` and `a1 pi` SHALL retain their existing command behavior.

#### Scenario: Open Settings from the launcher
- **WHEN** a resident Agent is viewed and the user chooses Settings from `+`
- **THEN** one tab titled `Settings` SHALL appear and show the owned Settings screen
- **AND** the Agent tab's editor, transcript, session, and surface SHALL remain unchanged

#### Scenario: Open Settings with the shortcut
- **WHEN** the user presses the default `Alt+Period` Settings action
- **THEN** the same singleton Settings tab SHALL be created or activated
- **AND** no `/settings` text or equivalent bytes SHALL enter an Agent editor

#### Scenario: Reuse global Settings
- **WHEN** the Settings tab already exists and the menu or shortcut requests Settings again
- **THEN** A1 SHALL activate that exact tab without creating another Settings process or tab

#### Scenario: Close Settings
- **WHEN** the user closes the Settings screen or its tab
- **THEN** the Settings utility tab SHALL be removed
- **AND** the previously selected surviving tab SHALL become visible with its unchanged complete surface

#### Scenario: Discover commands in a resident Agent
- **WHEN** resident Agent slash-command autocomplete or execution resolves built-in commands
- **THEN** `settings` SHALL be absent and `/settings` SHALL NOT open a route
- **AND** `a1 solo` and `a1 pi` SHALL retain their existing Settings commands

### Requirement: Resident lifecycle mechanics remain invisible
The resident attach client SHALL keep controller, subscription, and intentional-stop mechanics invisible. Input during automatic transfer SHALL be delivered once after acknowledgement or refused before any prefix. Successful create and close SHALL commit only complete final topology states. When no tabs remain, the terminal SHALL show only hoverable `+` with the child cursor hidden.

#### Scenario: Type immediately after switching
- **WHEN** the user switches tabs and immediately types, pastes, or clicks the child surface before controller acknowledgement
- **THEN** the input SHALL reach the new tab exactly once after ownership is acknowledged
- **AND** no read-only notice or takeover prompt SHALL appear

#### Scenario: Close an Agent normally
- **WHEN** an idle or confirmed-busy Agent tab is intentionally closed
- **THEN** its chip SHALL disappear once without displaying `✗`, `X`, `read-only-viewer`, or its retained body as a failed surface

#### Scenario: Close the last tab
- **WHEN** the final Agent or Settings tab closes
- **THEN** A1 SHALL clear the prior surface once and render only `+`
- **AND** no clock, notice background, text cursor, child cursor, stale cell, or instruction SHALL remain

#### Scenario: Create a tab normally
- **WHEN** a new Agent reaches its first input-ready complete surface
- **THEN** its chip and body SHALL appear together without a provisional flashing chip or clear-only frame

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
The resident inline tab-name editor SHALL retain grapheme-safe character editing and SHALL move to the preceding or following word boundary on Ctrl+Left or Ctrl+Right. A word move SHALL never split a Unicode grapheme and SHALL preserve the text, selection rules, chip geometry, and manual-rename semantics.

#### Scenario: Move across words while renaming
- **WHEN** the user renames `fix login flow` and presses Ctrl+Left or Ctrl+Right
- **THEN** the caret SHALL move by one semantic word boundary in the requested direction without changing the name

#### Scenario: Move across Unicode text
- **WHEN** a rename contains combining characters or emoji and the user alternates character and word movement
- **THEN** every caret position SHALL remain on a grapheme boundary

## MODIFIED Requirements

### Requirement: Tabs are managed from the strip, mouse, and assignable actions
A1 SHALL create a new Agent tab in the client's launch cwd from `Alt+A`; clicking `+` SHALL open a v2-style launcher containing `+ Agent`, a disabled separator, and `Settings` with the effective Settings shortcut right-aligned. Agent SHALL use the same creation flow. Settings SHALL create or activate the singleton global Settings utility tab. `Alt+1` through `Alt+9` SHALL view those positions and `Alt+0` the tenth. Actions for next, previous, move-right, and move-left SHALL exist for assignment but have no default keys. Left click on a tab SHALL view it. Right click on a visible Agent tab SHALL open a stable two-row context menu anchored beneath the pointer and clamped to the terminal, with `Close` first and `Rename` second; a Settings tab SHALL expose Close but SHALL NOT be renameable. Popup labels SHALL use effective shortcut assignments. Escape, a click elsewhere, a tab switch, or target removal SHALL dismiss a menu without action. Dragging an Agent chip after 250 ms or one column of movement SHALL calculate insertion from chip midpoints, preview only a real move with a v2 `│` marker, and issue one reorder with the captured expected revision on release; release away from the strip SHALL cancel. No tab-management slash command SHALL be exposed. A1 SHALL impose no configured or hard user tab count and SHALL never return a `tab-limit` refusal; only a concrete launch, persistence, containment, protocol, or operating-system resource failure MAY refuse creation. Each client SHALL keep its own viewed tab.

#### Scenario: Create from keyboard
- **WHEN** the user presses `Alt+A`
- **THEN** a new default-named Agent SHALL appear with its first complete surface and become viewed

#### Scenario: Create from strip
- **WHEN** the user clicks `+`
- **THEN** a persistent popup SHALL show `+ Agent`, a separator line, and `Settings` in that order
- **AND** Agent and Settings SHALL be independently hoverable and clickable

#### Scenario: Create from the grouped launcher
- **WHEN** the user selects `+ Agent`
- **THEN** the same creation flow as `Alt+A` SHALL run

#### Scenario: Open Settings from the grouped launcher
- **WHEN** the user selects Settings with or without existing Agent tabs
- **THEN** A1 SHALL create or activate the singleton Settings tab without visible command input

#### Scenario: Open Settings from its action
- **WHEN** the user invokes `tabs.settings` under its default binding
- **THEN** A1 SHALL perform the same singleton Settings action as the launcher
- **AND** the presented shortcut label SHALL be `Alt+.`

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

### Requirement: Resident tabs make independent concurrent progress
Every resident Agent SHALL continue engine work, render scheduling, PTY draining, retained terminal-state updates, and switch-time complete-surface production independently of which tab is viewed and independently of another tab's input, rendering, lifecycle work, revision number, or slow client. Hidden Agents MAY suppress client delivery, but their holders SHALL retain every output update in current terminal state. Selecting any working Agent SHALL immediately expose a complete frame containing its newest partial reply and SHALL continue presenting later partial frames without waiting for that turn or another turn to settle.

#### Scenario: Several agents stream simultaneously
- **WHEN** at least three resident Agents generate streamed replies at the same time and the user repeatedly switches before any reply settles
- **THEN** every selected Agent SHALL show successive partial reply states and continue advancing
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

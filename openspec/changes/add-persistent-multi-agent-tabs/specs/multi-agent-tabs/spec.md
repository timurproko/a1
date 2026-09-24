## Purpose

Defines the bare-A1 tab presentation for several independent resident A1 agent sessions: tab lifecycle, naming, bridge-derived status and attention, input routing, shortcuts, commands, detach-on-quit, and reattach.

## ADDED Requirements

### Requirement: Bare A1 presents resident A1 sessions as tabs
When resident tabs are enabled, bare `a1` SHALL present a one-row tab strip at the top of the terminal and the viewed tab's terminal surface in all remaining rows. Each tab SHALL be an independent resident terminal session running the complete A1 owned UI with its own Pi agent session, extensions, transcript, editor, queue, model, thinking level, notices, and cwd. Only the viewed tab SHALL receive keyboard, paste, focus, and surface mouse input. The strip SHALL be present even when a single tab exists. `a1 pi` SHALL NOT present a tab strip.

#### Scenario: First launch with no tabs
- **WHEN** the user runs bare `a1` and the profile has no resident tabs
- **THEN** A1 SHALL create one A1 tab in the launch cwd and view it

#### Scenario: Two tabs keep separate state
- **WHEN** the user types a draft in tab 1, switches to tab 2, prompts it, and switches back
- **THEN** tab 1 SHALL show its transcript, scroll position, and draft unchanged
- **AND** the prompt SHALL have reached only the agent of tab 2

#### Scenario: Switch while both agents work
- **WHEN** the user switches tabs while both agents stream
- **THEN** only the viewed surface and input target SHALL change, and both agents SHALL continue without pause or restart

#### Scenario: Extension custom UI in a tab
- **WHEN** an extension that renders its own custom interactive component runs in a tab
- **THEN** the component SHALL behave as it does in single-agent bare A1

#### Scenario: Pi comparison profile
- **WHEN** the user runs `a1 pi`
- **THEN** no tab strip, resident server, holder, or tab bridge SHALL be involved

### Requirement: Tab chips follow the declared strip layout
Each chip SHALL render one space, an optional status glyph and space, the display name, and one space, with a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. Viewed, hovered, and other chips SHALL use distinct colors resolved from the A1 theme's declared roles. When chips do not fit, the viewed chip SHALL stay visible, remaining tabs SHALL collapse into a `…` chip that opens a keyboard-navigable menu marking the viewed tab, and a trailing `+` chip SHALL always be reserved. The strip SHALL NOT wrap to a second row.

#### Scenario: Wide names are clipped by display width
- **WHEN** a tab name contains CJK characters or emoji wider than the chip allows
- **THEN** the chip SHALL be clipped with `…` at a grapheme boundary and SHALL NOT exceed 20 columns

#### Scenario: More tabs than fit
- **WHEN** the terminal cannot fit every chip
- **THEN** the viewed chip SHALL remain visible, a `…` chip SHALL list the hidden tabs, and next, previous, and jump keys SHALL still reach hidden tabs

### Requirement: Tab status comes from the tab bridge, not the screen
Each chip SHALL show a glyph from the tab's structured status: shared progress frames while working, `●` in the warning color while an extension, trust, or permission request awaits the user, `✓` in the success color when a turn settled while no client viewed the tab and it has not been viewed since, `✗` in the error color when the last turn errored or the tab crashed or failed, dim progress frames while starting or restoring, dim `◌` while suspended, and no glyph when idle. A1 tab status SHALL be derived from engine events reported by A1 inside the tab through the authenticated tab bridge. It SHALL NOT be derived from terminal output, rendered cells, titles, or timing. A tab whose bridge is unavailable SHALL show only process-level states. Viewing a tab in any client SHALL clear its `✓` in every client.

#### Scenario: Background tab needs input
- **WHEN** an extension in a background tab requests confirmation
- **THEN** that chip SHALL show `●` until the request is answered

#### Scenario: Background tab finishes
- **WHEN** a background tab's agent completes a turn
- **THEN** its chip SHALL show `✓` until any client views it, after which the glyph SHALL clear everywhere

#### Scenario: Terminal-looking output cannot fake a status
- **WHEN** a tab prints spinner characters, `✓`, or a title containing status words
- **THEN** the chip status SHALL remain determined by the bridge only

### Requirement: Background attention can notify the user
When a background tab enters needs-input or done-unseen, A1 MAY emit one terminal bell or one terminal notification sequence according to `tabs.notify` (`off`, `bell`, or `notification`; default `off`). A1 SHALL NOT notify for the viewed tab and SHALL NOT notify more than once per transition.

#### Scenario: Bell enabled
- **WHEN** `tabs.notify` is `bell` and a background tab enters needs-input
- **THEN** A1 SHALL emit exactly one bell for that transition

### Requirement: Tabs are created, switched, and reordered from keyboard, mouse, and commands
A1 SHALL create a new A1 tab in the client's launch cwd from `Alt+A`, the `+` chip, or `/new-tab [name]`, and SHALL view it. `Alt+.` and `Alt+,` SHALL view the next and previous tab with wrap-around; `Alt+1` through `Alt+9` SHALL view that tab and `Alt+0` the tenth; `Alt+>` and `Alt+<` SHALL move the viewed tab right and left. On the strip row, a left click SHALL view a chip, dragging a chip after 250 ms or pointer movement SHALL reorder it with a `│` drop marker, and a right click SHALL open a `Rename`/`Close` menu. `/tabs` SHALL open a picker listing every tab with name, status, and cwd. Reordering SHALL use expected registry revisions. When `tabs.max` is reached, creation affordances SHALL create nothing and SHALL state the limit. A prewarmed standby tab SHALL be used for creation when available.

#### Scenario: Create from the keyboard
- **WHEN** the user presses `Alt+A`
- **THEN** a new tab SHALL appear after the last tab, named by the default naming rule, and become viewed with an empty editor

#### Scenario: Jump beyond the tab count
- **WHEN** the user presses `Alt+7` with three tabs
- **THEN** the viewed tab SHALL NOT change and the key SHALL NOT reach the tab

#### Scenario: Concurrent reorder from two terminals
- **WHEN** two attached clients reorder tabs from the same registry revision
- **THEN** exactly one reorder SHALL apply and both clients SHALL converge on the committed order

### Requirement: Tabs are renamed inline and names are the Pi session names
`F2`, the chip menu, and `/name <name>` SHALL rename a tab. `F2` and the menu SHALL open an inline chip editor in which `Enter` commits, and `Esc` or a click elsewhere cancels. A committed name SHALL be trimmed, stripped of control characters, nonempty, and at most 64 characters; invalid input SHALL keep the editor open with a concise reason. A committed name SHALL become the tab's Pi session name, SHALL be visible in every client, and SHALL be marked user-provided. New tabs SHALL be named `agent`, or `agent N` with the smallest free N. When `tabs.autoName` is enabled (default), A1 in the tab SHALL propose a lowercase hyphenated name of at most 16 characters after the first turn settles, using the tab's model with a bounded budget and a deterministic fallback from the first prompt, and SHALL never override a user-provided name.

#### Scenario: Rename inline
- **WHEN** the user presses `F2`, types `auth-refactor`, and presses `Enter`
- **THEN** every client SHALL show `auth-refactor` and the tab's Pi session name SHALL be `auth-refactor`

#### Scenario: User name survives auto-naming
- **WHEN** the user renames a tab before its first turn settles
- **THEN** auto-naming SHALL NOT change that name

### Requirement: Closing a tab stops only that session after confirmation when busy
`Alt+W`, the chip menu, and `/close` SHALL close a tab. When the tab is working, awaiting input, or reports queued input, A1 SHALL ask `Stop "<name>"? Enter stop · Esc cancel` before acting. Closing SHALL request graceful shutdown of that tab's A1 process, terminate its verified tree after a bounded deadline, remove the tab from every client, and leave its Pi session resumable. Closing the last tab SHALL leave the strip with `+` and a hint rather than quit.

#### Scenario: Close a working tab and cancel
- **WHEN** the user presses `Alt+W` on a streaming tab and then `Esc`
- **THEN** the tab SHALL remain and its agent SHALL continue

#### Scenario: Closed session remains resumable
- **WHEN** a closed tab's session is selected with `/resume` or `a1 --session`
- **THEN** its transcript SHALL open in a tab with no lost committed entries

### Requirement: Quitting bare A1 detaches from resident tabs
Inside an A1 tab, `/quit`, the second `Ctrl+C` of the clear/exit chord, and `Ctrl+D` SHALL detach the client that sent the input instead of ending the tab. `Alt+Q` SHALL detach from any tab. Detaching SHALL restore the outer terminal's screen and input modes and leave every tab running. When tabs remain running, the parent terminal SHALL show a dim `N tabs still running · run a1 to return`, singular for one. `/quit-all` SHALL stop every tab after confirmation when any is busy, then detach with the ordinary resume hint. The attach client SHALL NOT intercept `Ctrl+C`.

#### Scenario: Quit while a tab works
- **WHEN** the user quits while a background tab streams
- **THEN** the terminal SHALL be restored with the running-tabs hint and the tab SHALL finish its turn

#### Scenario: Enhanced keyboard modes do not leak
- **WHEN** the client detaches after enabling enhanced keyboard or mouse reporting
- **THEN** the parent shell SHALL receive no enhanced key or mouse sequences

### Requirement: Relaunching bare A1 reattaches every tab
Bare `a1` SHALL connect to the profile's resident server, show every tab, and view the last viewed tab from its retained terminal surface within the interactive first-paint and first-input budgets. The surface SHALL include output produced while no client was attached. A launch while the server is recovering SHALL show a non-blocking reconnecting indication rather than fail.

#### Scenario: Close the terminal mid-turn and return
- **WHEN** the terminal running `a1` closes while a tab streams, and the user later runs `a1` in a new terminal
- **THEN** the tab SHALL show the output produced while detached and the live continuation of the turn, or its completed result

#### Scenario: Two terminals at once
- **WHEN** bare `a1` runs in two terminals of one profile
- **THEN** both SHALL show the same tabs, each SHALL keep its own viewed tab, and input from either SHALL reach only its viewed tab

### Requirement: Tab failure is presented and recoverable per tab
A crashed or failed tab SHALL show its reason in its own surface with `[r] retry`, `[f] start fresh`, and `[alt+w] close`. When a restarted tab's last user prompt had no settled reply, A1 SHALL offer that prompt back into the editor and SHALL NOT resend it. Other tabs SHALL remain fully operable.

#### Scenario: One tab crashes
- **WHEN** one tab's A1 process exits unexpectedly during a turn
- **THEN** only that tab SHALL show crash and restart state, and other tabs SHALL keep streaming and accepting input

#### Scenario: Restart budget exhausted
- **WHEN** a tab crashes three times within ten minutes
- **THEN** it SHALL show failed with retry, fresh, and close actions and SHALL NOT restart automatically again

### Requirement: Tab shortcuts are declared, configurable, and conflict-checked
Tab shortcuts SHALL be declared with action identities, SHALL be configurable through a keybindings file, SHALL be checked at launch against A1's shortcut registry and user keybindings with conflicts reported, and SHALL appear in `/hotkeys` inside A1 tabs. The attach client SHALL consume a matched tab shortcut before input encoding and SHALL forward every other input to the viewed tab. Defaults SHALL NOT use `Alt+[`, `Alt+]`, `Alt+Left`, `Alt+Right`, `Ctrl+C`, `Ctrl+L`, `Alt+Up`, or `Shift+Tab`.

#### Scenario: Hotkeys listing
- **WHEN** the user opens `/hotkeys` inside an A1 tab
- **THEN** a Tabs section SHALL list the effective tab shortcuts

#### Scenario: Collision with a user binding
- **WHEN** a user keybinding assigns `Alt+A` to an A1 editor action
- **THEN** launch SHALL report the conflict rather than dispatch the key ambiguously

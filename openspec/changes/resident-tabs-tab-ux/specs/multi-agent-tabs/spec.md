## ADDED Requirements

### Requirement: Bare A1 presents resident A1 sessions as tabs
When resident tabs are enabled, bare `a1` SHALL present a one-row tab strip at the top of the terminal and the viewed tab's terminal surface in all remaining rows. Each tab SHALL be an independent resident terminal session running the complete A1 owned UI with its own Pi agent session, extensions, transcript, editor, queue, model, thinking level, notices, and cwd. Only the viewed tab SHALL receive keyboard, paste, focus, and surface mouse input. The strip SHALL be present even when a single tab exists, and SHALL remain with a `+` chip and a hint when no tab exists. Extension components that use the certified text-terminal contract SHALL behave in a tab as in direct single-agent bare A1 on Windows x64, macOS, and Linux; inline image protocols SHALL use the existing text fallback. `a1 pi` SHALL NOT present a tab strip.

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
- **WHEN** an extension renders a custom interactive component using the certified text-terminal contract
- **THEN** keyboard, mouse, paste, selection, clipboard, hyperlinks, cursor, Unicode, and alternate-screen behavior SHALL match direct single-agent bare A1 on the same platform
- **AND** an inline-image request SHALL use the existing text fallback rather than imply unsupported image-protocol parity

#### Scenario: Pi comparison profile
- **WHEN** the user runs `a1 pi`
- **THEN** no tab strip, resident server, holder, or tab bridge SHALL be involved

### Requirement: Tab chips follow the declared strip layout
Each chip SHALL render one space, an optional status glyph and space, the display name, and one space, with a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. Viewed, hovered, and other chips SHALL use distinct colors resolved from the A1 theme's declared roles, which A1 SHALL resolve from its settings at launch and pass to the attach client. When chips do not fit, the viewed chip SHALL stay visible, remaining tabs SHALL collapse into a `…` chip that opens a keyboard-navigable menu marking the viewed tab, and a trailing `+` chip SHALL always be reserved. The strip SHALL NOT wrap to a second row.

#### Scenario: Wide names are clipped by display width
- **WHEN** a tab name contains CJK characters or emoji wider than the chip allows
- **THEN** the chip SHALL be clipped with `…` at a grapheme boundary and SHALL NOT exceed 20 columns

#### Scenario: More tabs than fit
- **WHEN** the terminal cannot fit every chip
- **THEN** the viewed chip SHALL remain visible, a `…` chip SHALL list the hidden tabs, and next, previous, and jump keys SHALL still reach hidden tabs

#### Scenario: Theme change
- **WHEN** the user selects a different A1 theme and relaunches bare `a1`
- **THEN** the strip SHALL use the new theme's roles for viewed, hovered, other, warning, success, error, and dim elements

### Requirement: Tab status comes from the tab bridge, not the screen
Each chip SHALL show a glyph from the tab's structured status: shared progress frames while working, a yellow `?` in the warning color while an extension, trust, or permission request awaits the user, `✓` in the success color when a turn settled while no client viewed the tab and it has not been viewed since, `✗` in the error color when the last turn errored or the tab crashed or failed, dim progress frames while starting or restoring, dim `◌` while suspended, and no glyph when idle. A1 tab status SHALL be derived from sequenced engine events reported by A1 inside the tab through the authenticated tab bridge. It SHALL NOT be derived from terminal output, rendered cells, titles, or timing. A tab whose bridge is unavailable SHALL show only process-level states. Viewing a tab in any client SHALL clear its `✓` in every client.

#### Scenario: Background tab needs input
- **WHEN** an extension in a background tab requests confirmation
- **THEN** that chip SHALL show a yellow `?` until the request is answered

#### Scenario: Background tab finishes
- **WHEN** a background tab's agent completes a turn
- **THEN** its chip SHALL show `✓` until any client views it, after which the glyph SHALL clear everywhere

#### Scenario: Terminal-looking output cannot fake a status
- **WHEN** a tab prints spinner characters, `✓`, or a title containing status words
- **THEN** the chip status SHALL remain determined by the bridge only

#### Scenario: Out-of-order status
- **WHEN** a status report with a lower sequence number or a superseded incarnation arrives after a newer one
- **THEN** the server SHALL discard it and the chip SHALL keep the newer status

### Requirement: Tab status icons are the only attention signal
Background attention SHALL be conveyed only by the tab status icons. A1 SHALL NOT emit a terminal bell, sound, terminal notification sequence, or operating-system notification for tab status changes, and SHALL NOT forward a bell character written by a tab's program to the outer terminal. No setting SHALL enable such a signal.

#### Scenario: Background tab needs the user
- **WHEN** a background tab enters needs-input or finishes a turn
- **THEN** only its chip icon SHALL change, and no bell, sound, or notification SHALL be produced

#### Scenario: A tab's program rings the bell
- **WHEN** a program running in a tab writes a bell character
- **THEN** the outer terminal SHALL NOT receive it

### Requirement: Tabs are created, switched, and reordered from keyboard, mouse, and commands
A1 SHALL create a new A1 tab in the client's launch cwd from `Alt+A`, the `+` chip, or `/new-tab [name]`, and SHALL view it in the client that requested it. `Alt+.` and `Alt+,` SHALL view the next and previous tab with wrap-around; `Alt+1` through `Alt+9` SHALL view that tab and `Alt+0` the tenth; `Alt+>` and `Alt+<` SHALL move the viewed tab right and left. On the strip row, a left click SHALL view a chip, dragging a chip after 250 ms or pointer movement SHALL reorder it with a `│` drop marker, and a right click SHALL open a `Rename`/`Close` menu. `/tabs` SHALL open a picker listing every tab with name, status, and cwd. Reordering SHALL use expected registry revisions. When `tabsMax` is reached, creation affordances SHALL create nothing and SHALL state the limit. A prewarmed standby tab whose cwd and environment match the request SHALL be used for creation when available; otherwise the tab SHALL start normally. Each client SHALL keep its own viewed tab.

#### Scenario: Create from the keyboard
- **WHEN** the user presses `Alt+A`
- **THEN** a new tab SHALL appear after the last tab, named by the default naming rule, and become viewed with an empty editor

#### Scenario: Jump beyond the tab count
- **WHEN** the user presses `Alt+7` with three tabs
- **THEN** the viewed tab SHALL NOT change and the key SHALL NOT reach the tab

#### Scenario: Concurrent reorder from two terminals
- **WHEN** two attached clients reorder tabs from the same registry revision
- **THEN** exactly one reorder SHALL apply and both clients SHALL converge on the committed order

#### Scenario: Tab limit reached
- **WHEN** the number of tabs equals `tabsMax` and the user presses `Alt+A`
- **THEN** no tab SHALL be created and the strip SHALL state the limit

#### Scenario: Prewarmed tab is promoted
- **WHEN** a standby tab matching the client's cwd and environment is ready and the user creates a tab
- **THEN** the standby SHALL become the new visible tab and a replacement standby SHALL start later within the start limit

### Requirement: Tabs are renamed inline and names are the Pi session names
`F2`, the chip menu, and `/name <name>` SHALL rename a tab. `F2` and the menu SHALL open an inline chip editor in which `Enter` commits, and `Esc` or a click elsewhere cancels. A committed name SHALL be trimmed, stripped of control characters, nonempty, and at most 64 characters; invalid input SHALL keep the editor open with a concise reason. A committed name SHALL become the tab's Pi session name, SHALL be visible in every client, and SHALL be marked user-provided. New tabs SHALL be named `agent`, or `agent N` with the smallest free N. When `tabsAutoName` is enabled (default), A1 in the tab SHALL propose a lowercase hyphenated name of at most 16 characters after the first turn settles, using the tab's model with a bounded budget and a deterministic fallback from the first prompt, and SHALL never override a user-provided name.

#### Scenario: Rename inline
- **WHEN** the user presses `F2`, types `auth-refactor`, and presses `Enter`
- **THEN** every client SHALL show `auth-refactor` and the tab's Pi session name SHALL be `auth-refactor`

#### Scenario: User name survives auto-naming
- **WHEN** the user renames a tab before its first turn settles
- **THEN** auto-naming SHALL NOT change that name

#### Scenario: Auto-naming fails
- **WHEN** the model call for a name fails twice or exceeds its budget
- **THEN** the tab SHALL take the deterministic name derived from its first prompt and the turn SHALL be unaffected

#### Scenario: Invalid inline name
- **WHEN** the user commits an empty or whitespace-only name
- **THEN** the editor SHALL stay open with a concise reason and the name SHALL NOT change

### Requirement: Closing a tab stops only that session after confirmation when busy
`Alt+W`, the chip menu, and `/close` SHALL close a tab, including a failed tab whose banner is viewed. `/restart-tab` SHALL restart the tab from its session, with the same confirmation when busy. When the tab is working, awaiting input, or reports queued input, A1 SHALL ask `Stop "<name>"? Enter stop · Esc cancel` before acting. Closing SHALL request graceful shutdown of that tab's A1 process, terminate its verified tree after a bounded deadline, remove the tab from every client, and leave its Pi session resumable. Closing the last tab SHALL leave the strip with `+` and a hint rather than quit. `/quit-all` SHALL stop every tab, asking once for confirmation when any tab is busy, and SHALL then detach its origin client with the ordinary resume hint.

#### Scenario: Close a working tab and cancel
- **WHEN** the user presses `Alt+W` on a streaming tab and then `Esc`
- **THEN** the tab SHALL remain and its agent SHALL continue

#### Scenario: Close an idle tab
- **WHEN** the user presses `Alt+W` on an idle tab
- **THEN** the tab SHALL close without confirmation and other tabs SHALL be unaffected

#### Scenario: Closed session remains resumable
- **WHEN** a closed tab's session is selected with `/resume` or `a1 --session`
- **THEN** its transcript SHALL open in a tab with no lost committed entries

#### Scenario: Close a failed tab with a rebound key
- **WHEN** the close action is rebound and the user presses the new key on a failed tab's banner
- **THEN** the tab SHALL close without confirmation and the banner hint SHALL have shown the rebound key

#### Scenario: Child ignores graceful shutdown
- **WHEN** a closed tab's A1 process does not exit within the graceful deadline
- **THEN** its verified process tree SHALL be terminated and the tab SHALL NOT be restarted

### Requirement: Concurrent clients use one attributable input controller
Each tab SHALL have at most one input-controller client and a monotonic controller revision. Transfer SHALL use the controller-transfer barrier: freeze old-controller admission, account for accepted input in native, PTY and child buffers, and establish a child-observed causal boundary before acknowledging the new owner and admitting its input. A sideband acknowledgement alone SHALL NOT establish that boundary. Input and PTY resize messages SHALL carry the current controller revision; stale or read-only clients SHALL be rejected without delivering bytes. A read-only client SHALL show that another terminal controls the tab and how to take control. Client-scoped child requests, including `/quit`, `Ctrl+D` on an empty editor, `/new-tab`, `/tabs` selection, `/close`, `/restart-tab`, and `/quit-all`, SHALL capture an immutable origin controller identity/revision at command admission, SHALL NOT be rebound at execution, and SHALL apply only while that origin remains current. `/quit` and empty-editor `Ctrl+D` SHALL detach only their origin client. Ambiguous attribution SHALL reject the request without affecting either client and SHALL direct the user to `Ctrl+C` twice; attach-local actions SHALL remain available. A detaching client SHALL restore the outer terminal and print `N tabs still running · run a1 to return`, singular for one, or the resume hint when no tab runs. Terminal bytes and prompt content SHALL NOT enter the bridge.

#### Scenario: A second terminal takes control
- **WHEN** a second client atomically claims a tab currently controlled by another client
- **THEN** the causal boundary and new owner SHALL be acknowledged before its first terminal input is delivered, the prior client SHALL become read-only, and previously buffered commands SHALL NOT be attributed to the new controller

#### Scenario: Stale detach request arrives
- **WHEN** a bridge detach request names a controller revision that has been superseded
- **THEN** the server SHALL reject it and SHALL NOT detach either client

#### Scenario: Delayed quit from a previous controller
- **WHEN** client A submits `/quit`, the input is delayed in a PTY or child queue, and client B claims control before it executes
- **THEN** the request SHALL retain A's old generation or be rejected as ambiguous, SHALL NOT detach B, and SHALL NOT stop the tab

#### Scenario: Controller boundary cannot be proven
- **WHEN** transport loss or incomplete input-boundary evidence prevents reliable command attribution
- **THEN** client-scoped child commands SHALL remain disabled with a concise notice, terminal input SHALL remain usable, and local double-`Ctrl+C` SHALL still detach only its attach client

#### Scenario: Two terminals view different tabs
- **WHEN** bare `a1` runs in two terminals of one profile
- **THEN** both SHALL show the same tabs, each SHALL keep its own viewed tab, and only the current input controller of a tab SHALL send input or resize its PTY

#### Scenario: Quit from the controlling terminal
- **WHEN** the controlling client submits `/quit` while two tabs run
- **THEN** only that client SHALL detach, its terminal SHALL show `2 tabs still running · run a1 to return`, and the other client and both tabs SHALL be unaffected

### Requirement: Tab shortcuts are declared, configurable, and conflict-checked
Tab shortcuts SHALL be declared with action identities, SHALL be configurable through a keybindings file, SHALL be checked at launch against A1's shortcut registry and user keybindings with conflicts reported, and SHALL appear in `/hotkeys` inside A1 tabs. A conflicting tab binding SHALL be disabled and reported rather than dispatched ambiguously. The attach client SHALL consume a matched tab shortcut before input encoding and SHALL forward every other input to the viewed tab; the only `Ctrl+C` handling SHALL be the double-press detach, which SHALL forward the first press unchanged and consume a second press within A1's clear/exit interval. Defaults SHALL be `Alt+A` new tab, `Alt+W` close, `F2` rename, `Alt+1` through `Alt+9` and `Alt+0` jump, `Alt+.` and `Alt+,` next and previous, and `Alt+>` and `Alt+<` move, plus `r` retry and `f` start fresh scoped to a failed tab's banner. Defaults SHALL NOT use `Alt+[`, `Alt+]`, `Alt+Left`, `Alt+Right`, `Ctrl+L`, `Alt+Up`, or `Shift+Tab`.

#### Scenario: Hotkeys listing
- **WHEN** the user opens `/hotkeys` inside an A1 tab
- **THEN** a Tabs section SHALL list the effective tab shortcuts

#### Scenario: Collision with a user binding
- **WHEN** a user keybinding assigns `Alt+A` to an A1 editor action
- **THEN** launch SHALL report the conflict rather than dispatch the key ambiguously

#### Scenario: Rebind a tab shortcut
- **WHEN** the keybindings file assigns the new-tab action to a different free key
- **THEN** that key SHALL create a tab, `Alt+A` SHALL reach the viewed tab, and `/hotkeys` SHALL show the new key

#### Scenario: Leave with Ctrl+C twice
- **WHEN** the user presses `Ctrl+C` twice within the clear/exit interval in any tab
- **THEN** the tab SHALL receive exactly one `Ctrl+C`, the client SHALL detach, and the tab's process SHALL keep running

## Purpose

Defines the bare-A1 tab presentation for several independent resident Pi agents: tab lifecycle, naming, status and attention, input routing, shortcuts, commands, detach-on-quit, and reattach.

## ADDED Requirements

### Requirement: Bare A1 presents resident agents as tabs
When resident agents are enabled, bare `a1` SHALL present a one-row tab strip at the top of its fixed fullscreen surface, with one tab per resident agent of the selected profile, in registry order. The custom viewport and dock SHALL keep their existing contracts within the remaining rows. Each tab SHALL bind exactly one durable agent identity to its own transcript, viewport scroll state, editor draft, queued input, model, thinking level, working state, notices, and cwd. Only the active tab's agent SHALL receive editor input, commands, and viewport interaction. The strip SHALL be present even when a single agent exists. `a1 pi` SHALL NOT present a tab strip.

#### Scenario: First launch with no agents
- **WHEN** the user runs bare `a1` and the profile has no resident agents
- **THEN** A1 SHALL create one agent in the launch cwd, show one active tab, and otherwise present the same startup as the single-agent experience

#### Scenario: Two agents keep separate state
- **WHEN** the user types a draft in tab 1, switches to tab 2, prompts it, and switches back
- **THEN** tab 1 SHALL show its own transcript, scroll position, and draft unchanged
- **AND** the prompt SHALL have reached only the agent of tab 2

#### Scenario: Switch while both agents work
- **WHEN** the user switches tabs while both agents are streaming
- **THEN** A1 SHALL change only the visible view and input target, and both agents SHALL continue without pause, restart, or loss of events

#### Scenario: Pi comparison profile
- **WHEN** the user runs `a1 pi`
- **THEN** no tab strip, resident host, or agent worker SHALL be involved

### Requirement: Tab chips follow the declared strip layout
Each tab chip SHALL render one space, an optional status glyph and space, the display name, and one space, with a maximum width of 20 terminal columns. Names SHALL be clipped with `…` using grapheme-aware display width. The active chip, hovered chip, and inactive chips SHALL use distinct existing theme tokens without literal color values. When chips do not fit, A1 SHALL keep the active tab visible, collapse the remaining tabs into a `…` overflow chip that opens a keyboard-navigable menu marking the active tab, and always reserve a trailing `+` chip. Chips SHALL NOT wrap to a second row or shrink below their clipped width.

#### Scenario: Wide names are clipped by display width
- **WHEN** a tab name contains CJK characters or emoji wider than the chip allows
- **THEN** the chip SHALL be clipped with `…` at a grapheme boundary and SHALL NOT exceed 20 columns

#### Scenario: More tabs than fit
- **WHEN** the terminal cannot fit every chip
- **THEN** the active chip SHALL remain visible, a `…` chip SHALL list the hidden tabs, and next/previous and jump keys SHALL still reach hidden tabs

#### Scenario: Resize narrows the strip
- **WHEN** the terminal is narrowed while many tabs exist
- **THEN** the strip SHALL recompute overflow in the same frame as the dock without leaving stale chip cells

### Requirement: Tab status reflects structured agent state
Each chip SHALL show a status glyph derived only from typed engine and host events: the shared progress-indicator frames while working, `●` in the warning color when the agent awaits a user response to an extension, trust, or permission request, `✓` in the success color when a turn finished while no client viewed the tab and has not yet been viewed, `✗` in the error color when the last turn ended in error or the agent failed, dim progress frames while starting or restoring, dim `◌` while suspended, and no glyph when idle. Status SHALL NOT be derived from rendered text, ANSI content, or timing heuristics. Background tabs SHALL keep their glyph current without painting their transcripts.

#### Scenario: Background agent needs input
- **WHEN** a background agent's extension requests confirmation
- **THEN** its chip SHALL show `●` until a client answers the request
- **AND** the request SHALL be presented when that tab is activated

#### Scenario: Background agent finishes
- **WHEN** a background agent completes a turn successfully
- **THEN** its chip SHALL show `✓` until any client views that tab, after which the glyph SHALL clear in every attached client

#### Scenario: Terminal-looking content cannot fake a status
- **WHEN** an agent's streamed text contains spinner characters, `✓`, or escape sequences
- **THEN** the chip status SHALL remain determined by structured events only

### Requirement: Background attention can notify the user
When a non-active agent enters needs-input or finishes a turn, A1 SHALL update its chip and MAY emit a terminal bell or terminal notification sequence according to the `tabs.notify` setting (`off`, `bell`, or `notification`; default `off`). A1 SHALL NOT notify for the active tab, SHALL NOT notify more than once per agent transition, and SHALL NOT write notification sequences outside the owned output path.

#### Scenario: Notification enabled
- **WHEN** `tabs.notify` is `bell` and a background agent enters needs-input
- **THEN** A1 SHALL emit exactly one bell for that transition

#### Scenario: Active tab transitions
- **WHEN** the active tab's agent finishes a turn
- **THEN** A1 SHALL NOT emit a notification

### Requirement: Tabs are created, switched, and reordered from keyboard, mouse, and commands
A1 SHALL create a new agent tab in the client's launch cwd from `Alt+A`, the `+` chip, or `/new-tab [name]`, and SHALL activate it. `Alt+]` and `Alt+[` SHALL activate the next and previous tab with wrap-around; `Alt+1` through `Alt+9` SHALL activate that tab and `Alt+0` the tenth; `Alt+}` and `Alt+{` SHALL move the active tab right and left. A left click SHALL activate a chip; dragging a chip after 250 ms or pointer movement SHALL reorder it with a `│` drop marker; a right click SHALL open a `Rename`/`Close` menu. Reordering SHALL persist through the resident registry with expected-revision semantics. `/agents` SHALL open a picker of every agent with name, status, and cwd. When the configured agent limit is reached, creation affordances SHALL be disabled and SHALL state the limit.

#### Scenario: Create from the keyboard
- **WHEN** the user presses `Alt+A`
- **THEN** a new tab named by the default naming rule SHALL appear after the last tab and become active with an empty editor

#### Scenario: Jump beyond the tab count
- **WHEN** the user presses `Alt+7` with three tabs
- **THEN** the active tab SHALL NOT change and the key SHALL NOT reach the editor

#### Scenario: Concurrent reorder from two terminals
- **WHEN** two attached clients reorder tabs from the same registry revision
- **THEN** exactly one reorder SHALL apply and both clients SHALL converge on the committed order

#### Scenario: Limit reached
- **WHEN** the number of agents equals `agents.max`
- **THEN** `Alt+A`, `+`, and `/new-tab` SHALL create nothing and SHALL show the limit reason

### Requirement: Tabs are renamed inline and names are the Pi session names
`F2`, the chip context menu, and `/name <name>` SHALL rename the active agent. `F2` and the menu SHALL open an inline chip editor in which `Enter` commits, `Esc` cancels, and a click elsewhere cancels. A committed name SHALL be trimmed, stripped of control characters, nonempty, and at most 64 characters; invalid input SHALL keep the editor open with a concise reason. The committed name SHALL become the agent's Pi session name and SHALL be marked user-provided. New agents SHALL be named `agent`, or `agent N` with the smallest free N. When `tabs.autoName` is enabled, A1 SHALL propose a lowercase hyphenated name of at most 16 characters after the first turn settles, using the agent's model with a bounded budget and a deterministic fallback from the first prompt, and SHALL never override a user-provided name.

#### Scenario: Rename inline
- **WHEN** the user presses `F2`, types `auth-refactor`, and presses `Enter`
- **THEN** the chip SHALL show `auth-refactor`, every attached client SHALL show it, and the session's Pi name SHALL be `auth-refactor`

#### Scenario: User name survives auto-naming
- **WHEN** the user renames a tab before its first turn settles
- **THEN** auto-naming SHALL NOT change that name

#### Scenario: Duplicate default names
- **WHEN** tabs `agent` and `agent 2` exist and the user creates another tab
- **THEN** the new tab SHALL be named `agent 3`

### Requirement: Closing a tab stops only that agent after confirmation when busy
`Alt+W`, the chip menu, and `/close` SHALL close the active tab. When its agent is working, awaiting input, or holds queued input, A1 SHALL ask `Stop agent "<name>"? Enter stop · Esc cancel` in the dock before acting. Closing SHALL gracefully stop only that agent's verified worker, remove the tab from every client, and leave its Pi session resumable through `/resume` and `a1 --session`. Closing the last tab SHALL leave an empty strip with the `+` chip and a hint, not quit A1.

#### Scenario: Close an idle tab
- **WHEN** the user presses `Alt+W` on an idle agent
- **THEN** the tab SHALL close without a prompt and the neighboring tab SHALL become active

#### Scenario: Close a working tab
- **WHEN** the user presses `Alt+W` on a streaming agent and then `Esc`
- **THEN** the agent SHALL continue working and the tab SHALL remain

#### Scenario: Session remains resumable
- **WHEN** a closed agent's session is selected with `/resume`
- **THEN** its transcript SHALL open in a tab with no lost committed entries

### Requirement: Quitting bare A1 detaches from resident agents
`/quit`, the second `Ctrl+C` of the clear/exit chord, and `Ctrl+D` SHALL end the foreground client, play the existing outro, restore the terminal, and leave every resident agent running. When one or more agents remain running, the dim resume hint SHALL be replaced by `N agents still running · run a1 to return`, using the singular form for one. `/quit-all` SHALL stop every resident agent of the profile after confirmation when any is busy, then quit with the ordinary resume hint. `Ctrl+C` SHALL NOT be forwarded to an agent; `Esc` SHALL remain the interrupt.

#### Scenario: Quit while an agent works
- **WHEN** the user quits while a background agent is streaming
- **THEN** the terminal SHALL be restored, the hint SHALL report the running agents, and the agent SHALL finish its turn

#### Scenario: Stop everything
- **WHEN** the user runs `/quit-all` and confirms
- **THEN** every resident agent SHALL be stopped and no host-owned worker SHALL remain

### Requirement: Relaunching bare A1 reattaches every agent
Bare `a1` SHALL connect to the profile's resident host and show every resident agent. It SHALL select the last active tab, render that tab from an authoritative snapshot within the existing interactive first-paint and first-input budgets, and hydrate other tabs lazily. A reattached tab SHALL show its committed transcript, in-flight streaming state, pending extension requests, queued input, model, thinking level, and saved draft. Output produced while no client was attached SHALL be visible. A launch while the host is recovering SHALL show a non-blocking reconnecting indication rather than fail.

#### Scenario: Close the terminal mid-turn and return
- **WHEN** the terminal hosting `a1` is closed while an agent streams, and the user later runs `a1` in a new terminal
- **THEN** the tab SHALL show the text streamed while detached and the live continuation of the turn, or its completed result

#### Scenario: Two terminals at once
- **WHEN** bare `a1` runs in two terminals of the same profile
- **THEN** both SHALL show the same tabs, each SHALL keep its own active tab, and a prompt from either SHALL reach only the targeted agent

#### Scenario: Pending request survives detach
- **WHEN** an agent asks for confirmation while no client is attached
- **THEN** the next attached client SHALL present that request and the answer SHALL reach the agent once

### Requirement: Agent failure is presented and recoverable per tab
A crashed or failed agent SHALL be presented in its own tab only, with its reason and the actions `[r] retry`, `[f] start fresh`, and `[alt+w] close`. When an interrupted turn's user prompt had no settled reply, A1 SHALL offer that prompt back into the tab's editor and SHALL NOT resend it automatically. Other tabs SHALL remain fully operable.

#### Scenario: Worker crash in one tab
- **WHEN** one agent's worker exits unexpectedly during a turn
- **THEN** only that tab SHALL show the crash and restart state, and the other tabs SHALL keep streaming and accepting input

#### Scenario: Restart budget exhausted
- **WHEN** an agent crashes three times within ten minutes
- **THEN** its tab SHALL show failed with the retry, fresh, and close actions and SHALL NOT restart automatically again

### Requirement: Tab shortcuts are declared and conflict-free
Every tab shortcut SHALL be declared through the shared shortcut registry with an action identity, SHALL participate in conflict detection against editor, viewport, dialog, and user keybindings, and SHALL appear in `/hotkeys`. Tab shortcuts SHALL be handled before editor dispatch while the active tab's editor has focus, SHALL NOT be forwarded to agents, and SHALL NOT reuse `Alt+Left`, `Alt+Right`, `Ctrl+L`, `Alt+Up`, or `Shift+Tab`.

#### Scenario: Hotkeys listing
- **WHEN** the user opens `/hotkeys` in bare A1 with resident agents enabled
- **THEN** a Tabs section SHALL list every tab shortcut from the registry

#### Scenario: User binding collides
- **WHEN** a user keybinding assigns `Alt+A` to an editor action
- **THEN** conflict detection SHALL report the collision rather than silently dispatch both

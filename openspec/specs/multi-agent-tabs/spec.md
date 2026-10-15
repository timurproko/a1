# multi-agent-tabs Specification

## Purpose
Defines the opt-in resident-tab path that keeps bare A1 running independently of its attached terminal and restores the same retained session when the user returns.

## Requirements

### Requirement: Bare A1 runs one resident tab when opted in
On Windows x64, macOS, and Linux, when the A1 setting `residentTabs` is enabled, bare `a1` without a session selection SHALL ensure the profile's resident server before the launch guardian starts, then run the native attach client as the launch instance's root instead of the direct owned UI. With no tab, the server SHALL create one A1 tab running `bin/ui.js --tab` in the client's launch cwd; with an existing tab, the client SHALL view it. Each tab process SHALL receive its own launch runtime identity, distinct from every other tab incarnation and launch instance. The attach client SHALL draw a one-row strip with the tab's status glyph and name above the tab's surface. While one client is attached, another bare `a1` of the same profile SHALL be refused with a message naming the other terminal and SHALL NOT start a direct session. When the terminal host is missing, the platform is unsupported, resident survival cannot be verified, or the server is incompatible, blocked, or cannot start, bare `a1` SHALL run the direct single-agent owned UI and show one notice naming the reason. With the setting at its default `false`, bare `a1` SHALL behave exactly as without this capability. `a1 pi` and `a1 --session` SHALL keep their direct behavior.

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
Bare `a1` SHALL present a v2-style one-row tab strip at the top of the terminal and the viewed tab's terminal surface in all remaining rows. Each tab SHALL be an independent resident terminal session running the complete A1 owned UI with its own Pi agent session, extensions, transcript, editor, queue, model, thinking level, notices, and cwd. Only the viewed tab SHALL receive keyboard, paste, focus, and surface mouse input. Surface mouse reports SHALL remove the one-row tab-strip offset exactly once so the viewed child receives coordinates matching its visible rows, while mouse input on the strip SHALL remain attach-owned and SHALL NOT reach the child. The strip SHALL be present even when a single tab exists, and SHALL remain with a `+` chip and a hint when no tab exists. Extension components using the certified text-terminal contract SHALL behave as in direct single-agent bare A1 on Windows x64, macOS arm64, and Linux x64; inline image protocols SHALL use the text fallback. `a1 solo` and `a1 pi` SHALL NOT present a tab strip.

#### Scenario: Explicit solo launch
- **WHEN** the user runs `a1 solo`
- **THEN** A1 SHALL launch one direct single-agent owned UI without resident infrastructure or a Tabs settings section

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
The strip SHALL use the v2 default top-row presentation as fixed behavior rather than settings: normal chips SHALL use RGB background `38,38,38` with foreground `170,170,170`, hovered chips background `48,48,48`, and the viewed chip background `55,55,55` with white text, with v2's palette fallback. The empty state SHALL use the v2 wallpaper treatment and the right edge SHALL show its 12-hour clock. Each chip SHALL render one space, an optional status glyph and space, the display name, one space, an always-visible `×`, and one space, with a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. When chips do not fit, the viewed chip SHALL stay visible, remaining tabs SHALL collapse into a keyboard-navigable `…` menu, and a trailing `+` SHALL always be reserved. The strip SHALL NOT wrap.

#### Scenario: Wide names are clipped by display width
- **WHEN** a tab name contains CJK characters or emoji wider than the chip allows
- **THEN** its name SHALL clip with `…` at a grapheme boundary while the complete chip remains within 20 columns

#### Scenario: More tabs than fit
- **WHEN** the terminal cannot fit every chip
- **THEN** the viewed chip SHALL remain visible, `…` SHALL list hidden tabs, and assigned navigation or jump keys SHALL still reach them

#### Scenario: Close button is always present
- **WHEN** any visible tab chip is rendered
- **THEN** its `×` SHALL remain visible and clicking it SHALL invoke that tab's ordinary close flow

### Requirement: Tab status comes from the tab bridge, not the screen
Each chip SHALL show structured status: progress frames while working, yellow `?` while an extension, trust, or permission request awaits the user, `✓` when a turn settled while no client viewed the tab and it has not been viewed since, `✗` when the last turn errored or the tab crashed or failed, dim progress frames while starting or restoring, and no glyph when idle. Working frames SHALL use the resolved A1 accent reported by that specific tab. Status SHALL derive from sequenced engine events through the authenticated tab bridge, never terminal output, rendered cells, titles, or timing. A missing bridge SHALL degrade to process-level states and the launch accent. Viewing a tab in any client SHALL clear its `✓` everywhere. Open tabs SHALL have no suspended state or `◌` glyph.

#### Scenario: Background tab needs input
- **WHEN** an extension in a background tab requests confirmation
- **THEN** that chip SHALL show yellow `?` until the request is answered

#### Scenario: Background tab finishes
- **WHEN** a background tab's agent completes a turn
- **THEN** its chip SHALL show `✓` until any client views it, then clear everywhere

#### Scenario: Working tabs have independent accents
- **WHEN** two working tabs report different resolved A1 accents
- **THEN** each chip's progress frame SHALL use its own reported accent

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
A1 SHALL create a new A1 tab in the client's launch cwd from `Alt+A` or `+` and view it in that client. `Alt+1` through `Alt+9` SHALL view those tabs and `Alt+0` the tenth. Actions for next, previous, move-right, and move-left SHALL exist for assignment but have no default keys. Left click SHALL view, the always-visible `×` SHALL close, right click SHALL open `Rename`/`Close`, and dragging after 250 ms or one column of movement SHALL reorder with a `│` marker and expected revision. No `/new-tab`, `/close`, `/tabs`, `/quit-all`, or `/restart-tab` command SHALL be exposed. At `tabsMax`, creation SHALL do nothing and state the limit. A matching prewarmed standby SHALL be used when available. Each client SHALL keep its own viewed tab.

#### Scenario: Create from keyboard
- **WHEN** the user presses `Alt+A`
- **THEN** a new default-named tab SHALL appear after the last tab and become viewed with an empty editor

#### Scenario: Create from strip
- **WHEN** the user clicks `+`
- **THEN** the same creation flow SHALL run

#### Scenario: Jump beyond count
- **WHEN** the user presses `Alt+7` with three tabs
- **THEN** view SHALL not change and the key SHALL not reach the tab

#### Scenario: Concurrent reorder
- **WHEN** two clients reorder from the same registry revision
- **THEN** exactly one SHALL apply and both SHALL converge

#### Scenario: Tab limit reached
- **WHEN** tab count equals `tabsMax` and creation is requested
- **THEN** no tab SHALL be created and the strip SHALL state the limit

### Requirement: Tabs are renamed inline and names are Pi session names
`F2`, the chip menu, and existing `/name <name>` SHALL rename a tab. Inline rename SHALL use `Enter` to commit and `Esc` or click elsewhere to cancel. Names SHALL be trimmed, control-free, nonempty, and at most 64 characters; invalid input SHALL retain the editor with a concise reason. A committed name SHALL become the Pi session name, appear in every client, and be user-provided. Defaults SHALL be `agent` or the smallest free `agent N`. With `tabsAutoName` on by default, A1 SHALL propose a lowercase hyphenated name of at most 16 characters after the first settled turn with bounded model work and deterministic fallback, never overriding a user name. An automatic rename SHALL reproduce v2's title transition: 600 ms moving rainbow, typing at 45 ms per character, and 300 ms settle; manual renames SHALL not animate.

#### Scenario: Rename inline
- **WHEN** the user enters `auth-refactor` with `F2`
- **THEN** every client and the Pi session SHALL use `auth-refactor`

#### Scenario: User name survives auto-name
- **WHEN** the user renames before auto-naming completes
- **THEN** auto-naming SHALL NOT change it

#### Scenario: Auto-name animates
- **WHEN** an automatic name replaces a default name
- **THEN** the visible title SHALL use the v2 rainbow, typing, and settle phases

#### Scenario: Auto-name fails
- **WHEN** model naming fails twice or times out
- **THEN** deterministic prompt-derived naming SHALL be used without affecting the turn

### Requirement: Closing a tab stops only that session after confirmation when busy
`Alt+W`, `×`, and the chip menu SHALL close a tab, including a failed tab. A working tab, a tab awaiting input, or one with queued input SHALL ask `Stop "<name>"? Enter stop · Esc cancel`. Closing SHALL request graceful shutdown, terminate the verified tree after a bounded deadline, remove the tab everywhere, and leave its Pi session resumable. Closing the last tab SHALL leave `+` and a hint rather than quit. Failed/stalled UI MAY offer restart, but no restart slash command SHALL exist.

#### Scenario: Cancel closing a working tab
- **WHEN** the user closes a streaming tab and presses `Esc`
- **THEN** it SHALL remain and continue

#### Scenario: Close idle tab
- **WHEN** the user clicks `×` on an idle tab
- **THEN** it SHALL close without confirmation and other tabs SHALL be unaffected

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
Tab actions SHALL have stable identities, accept `keybindings.json` assignments, be checked against A1 and Pi bindings, and appear under Tabs in `/hotkeys`. Conflicts SHALL disable and report the assigned tab binding. The attach client SHALL consume matched actions before encoding and forward unmatched input. Defaults SHALL be `Alt+A` new, `Alt+W` close, `F2` rename, `Alt+1`…`Alt+0` jump, plus failed-banner `r` retry and `f` fresh. `tabs.next`, `tabs.previous`, `tabs.moveRight`, and `tabs.moveLeft` SHALL be unbound by default but assignable. Double `Ctrl+C` SHALL remain fixed: first press forwarded, second within A1's clear/exit interval consumed as local detach.

#### Scenario: Hotkeys listing
- **WHEN** `/hotkeys` opens inside a tab
- **THEN** assigned tab shortcuts SHALL be listed and unbound actions SHALL remain discoverable as assignable

#### Scenario: User assigns next tab
- **WHEN** `tabs.next` receives a free key assignment
- **THEN** that key SHALL switch tabs and `/hotkeys` SHALL show it

#### Scenario: Collision
- **WHEN** a tab action is assigned to an existing editor binding
- **THEN** launch SHALL report and disable the conflict

#### Scenario: Leave with Ctrl+C twice
- **WHEN** the user presses `Ctrl+C` twice within the interval
- **THEN** the tab SHALL receive exactly one press, the local attach client SHALL exit, and the tab process SHALL continue

### Requirement: Resident routing requires an interactive terminal
A bare or session-selected A1 launch SHALL take the resident route only when its standard input and standard output are both terminals. Otherwise it SHALL run the direct owned UI with the resident fallback reason `no interactive terminal`, and SHALL neither probe nor start the resident host.

#### Scenario: Piped launch with a packaged terminal host
- **WHEN** a package that carries the terminal host is launched with piped standard input or output
- **THEN** the launch SHALL run the direct owned UI and SHALL NOT start the attach client or contact the resident host

#### Scenario: Interactive launch
- **WHEN** the same package is launched from a terminal on a supported platform
- **THEN** resident routing SHALL proceed as before

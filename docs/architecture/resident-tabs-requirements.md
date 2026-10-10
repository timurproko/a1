# Resident tabs — target requirements

Status: target, not implemented. These are the requirements the six milestones in [`resident-tabs.md`](resident-tabs.md#roadmap) deliver. They are written as OpenSpec deltas against the canonical specs as of 2026-10-10. Each milestone change copies the requirements it implements into its own `specs/` delta, adjusts them to what it actually delivers, and removes them from this file, so this file shrinks to empty as the preview lands. Requirements here bind nothing until a milestone change merges them.

## Capability: `multi-agent-tabs`

### Purpose

Defines the bare-A1 tab presentation for several independent resident A1 agent sessions: tab lifecycle, naming, bridge-derived status and attention, input routing, shortcuts, commands, detach-on-quit, and reattach.

### ADDED Requirements

#### Requirement: Bare A1 presents resident A1 sessions as tabs
When resident tabs are enabled, bare `a1` SHALL present a one-row tab strip at the top of the terminal and the viewed tab's terminal surface in all remaining rows. Each tab SHALL be an independent resident terminal session running the complete A1 owned UI with its own Pi agent session, extensions, transcript, editor, queue, model, thinking level, notices, and cwd. Only the viewed tab SHALL receive keyboard, paste, focus, and surface mouse input. The strip SHALL be present even when a single tab exists. `a1 pi` SHALL NOT present a tab strip.

##### Scenario: First launch with no tabs
- **WHEN** the user runs bare `a1` and the profile has no resident tabs
- **THEN** A1 SHALL create one A1 tab in the launch cwd and view it

##### Scenario: Two tabs keep separate state
- **WHEN** the user types a draft in tab 1, switches to tab 2, prompts it, and switches back
- **THEN** tab 1 SHALL show its transcript, scroll position, and draft unchanged
- **AND** the prompt SHALL have reached only the agent of tab 2

##### Scenario: Switch while both agents work
- **WHEN** the user switches tabs while both agents stream
- **THEN** only the viewed surface and input target SHALL change, and both agents SHALL continue without pause or restart

##### Scenario: Extension custom UI in a tab
- **WHEN** an extension renders a custom interactive component using the certified text-terminal contract
- **THEN** keyboard, mouse, paste, selection, clipboard, hyperlinks, cursor, Unicode, and alternate-screen behavior SHALL match direct single-agent bare A1
- **AND** an inline-image request SHALL use the existing text fallback rather than imply unsupported image-protocol parity

##### Scenario: Pi comparison profile
- **WHEN** the user runs `a1 pi`
- **THEN** no tab strip, resident server, holder, or tab bridge SHALL be involved

#### Requirement: Tab chips follow the declared strip layout
Each chip SHALL render one space, an optional status glyph and space, the display name, and one space, with a maximum width of 20 terminal columns. Names SHALL be clipped with `…` at grapheme boundaries using display width. Viewed, hovered, and other chips SHALL use distinct colors resolved from the A1 theme's declared roles. When chips do not fit, the viewed chip SHALL stay visible, remaining tabs SHALL collapse into a `…` chip that opens a keyboard-navigable menu marking the viewed tab, and a trailing `+` chip SHALL always be reserved. The strip SHALL NOT wrap to a second row.

##### Scenario: Wide names are clipped by display width
- **WHEN** a tab name contains CJK characters or emoji wider than the chip allows
- **THEN** the chip SHALL be clipped with `…` at a grapheme boundary and SHALL NOT exceed 20 columns

##### Scenario: More tabs than fit
- **WHEN** the terminal cannot fit every chip
- **THEN** the viewed chip SHALL remain visible, a `…` chip SHALL list the hidden tabs, and next, previous, and jump keys SHALL still reach hidden tabs

#### Requirement: Tab status comes from the tab bridge, not the screen
Each chip SHALL show a glyph from the tab's structured status: shared progress frames while working, a yellow `?` in the warning color while an extension, trust, or permission request awaits the user, `✓` in the success color when a turn settled while no client viewed the tab and it has not been viewed since, `✗` in the error color when the last turn errored or the tab crashed or failed, dim progress frames while starting or restoring, dim `◌` while suspended, and no glyph when idle. A1 tab status SHALL be derived from engine events reported by A1 inside the tab through the authenticated tab bridge. It SHALL NOT be derived from terminal output, rendered cells, titles, or timing. A tab whose bridge is unavailable SHALL show only process-level states. Viewing a tab in any client SHALL clear its `✓` in every client.

##### Scenario: Background tab needs input
- **WHEN** an extension in a background tab requests confirmation
- **THEN** that chip SHALL show a yellow `?` until the request is answered

##### Scenario: Background tab finishes
- **WHEN** a background tab's agent completes a turn
- **THEN** its chip SHALL show `✓` until any client views it, after which the glyph SHALL clear everywhere

##### Scenario: Terminal-looking output cannot fake a status
- **WHEN** a tab prints spinner characters, `✓`, or a title containing status words
- **THEN** the chip status SHALL remain determined by the bridge only

#### Requirement: Tab status icons are the only attention signal
Background attention SHALL be conveyed only by the tab status icons. A1 SHALL NOT emit a terminal bell, sound, terminal notification sequence, or operating-system notification for tab status changes, and SHALL NOT forward a bell character written by a tab's program to the outer terminal.

##### Scenario: Background tab needs the user
- **WHEN** a background tab enters needs-input or finishes a turn
- **THEN** only its chip icon SHALL change, and no bell, sound, or notification SHALL be produced

##### Scenario: A tab's program rings the bell
- **WHEN** a program running in a tab writes a bell character
- **THEN** the outer terminal SHALL NOT receive it

#### Requirement: Tabs are created, switched, and reordered from keyboard, mouse, and commands
A1 SHALL create a new A1 tab in the client's launch cwd from `Alt+A`, the `+` chip, or `/new-tab [name]`, and SHALL view it. `Alt+.` and `Alt+,` SHALL view the next and previous tab with wrap-around; `Alt+1` through `Alt+9` SHALL view that tab and `Alt+0` the tenth; `Alt+>` and `Alt+<` SHALL move the viewed tab right and left. On the strip row, a left click SHALL view a chip, dragging a chip after 250 ms or pointer movement SHALL reorder it with a `│` drop marker, and a right click SHALL open a `Rename`/`Close` menu. `/tabs` SHALL open a picker listing every tab with name, status, and cwd. Reordering SHALL use expected registry revisions. When `tabs.max` is reached, creation affordances SHALL create nothing and SHALL state the limit. A prewarmed standby tab SHALL be used for creation when available.

##### Scenario: Create from the keyboard
- **WHEN** the user presses `Alt+A`
- **THEN** a new tab SHALL appear after the last tab, named by the default naming rule, and become viewed with an empty editor

##### Scenario: Jump beyond the tab count
- **WHEN** the user presses `Alt+7` with three tabs
- **THEN** the viewed tab SHALL NOT change and the key SHALL NOT reach the tab

##### Scenario: Concurrent reorder from two terminals
- **WHEN** two attached clients reorder tabs from the same registry revision
- **THEN** exactly one reorder SHALL apply and both clients SHALL converge on the committed order

#### Requirement: Tabs are renamed inline and names are the Pi session names
`F2`, the chip menu, and `/name <name>` SHALL rename a tab. `F2` and the menu SHALL open an inline chip editor in which `Enter` commits, and `Esc` or a click elsewhere cancels. A committed name SHALL be trimmed, stripped of control characters, nonempty, and at most 64 characters; invalid input SHALL keep the editor open with a concise reason. A committed name SHALL become the tab's Pi session name, SHALL be visible in every client, and SHALL be marked user-provided. New tabs SHALL be named `agent`, or `agent N` with the smallest free N. When `tabs.autoName` is enabled (default), A1 in the tab SHALL propose a lowercase hyphenated name of at most 16 characters after the first turn settles, using the tab's model with a bounded budget and a deterministic fallback from the first prompt, and SHALL never override a user-provided name.

##### Scenario: Rename inline
- **WHEN** the user presses `F2`, types `auth-refactor`, and presses `Enter`
- **THEN** every client SHALL show `auth-refactor` and the tab's Pi session name SHALL be `auth-refactor`

##### Scenario: User name survives auto-naming
- **WHEN** the user renames a tab before its first turn settles
- **THEN** auto-naming SHALL NOT change that name

#### Requirement: Closing a tab stops only that session after confirmation when busy
`Alt+W`, the chip menu, and `/close` SHALL close a tab. When the tab is working, awaiting input, or reports queued input, A1 SHALL ask `Stop "<name>"? Enter stop · Esc cancel` before acting. Closing SHALL request graceful shutdown of that tab's A1 process, terminate its verified tree after a bounded deadline, remove the tab from every client, and leave its Pi session resumable. Closing the last tab SHALL leave the strip with `+` and a hint rather than quit.

##### Scenario: Close a working tab and cancel
- **WHEN** the user presses `Alt+W` on a streaming tab and then `Esc`
- **THEN** the tab SHALL remain and its agent SHALL continue

##### Scenario: Closed session remains resumable
- **WHEN** a closed tab's session is selected with `/resume` or `a1 --session`
- **THEN** its transcript SHALL open in a tab with no lost committed entries

#### Requirement: Concurrent clients use one attributable input controller
Each tab SHALL have at most one input-controller client and a monotonic controller revision. Transfer SHALL freeze old-controller admission, account for accepted input in native, PTY and child buffers, and establish a child-observed causal boundary before acknowledging the new owner and admitting its input. A sideband acknowledgement alone SHALL NOT establish that boundary. Input and PTY resize messages SHALL carry the current controller revision; stale or read-only clients SHALL be rejected without delivering bytes. Client-scoped child requests SHALL capture an immutable origin controller identity/revision at command admission, SHALL NOT be rebound at execution, and SHALL apply only while that origin remains current. Ambiguous attribution SHALL reject the request without affecting either client; attach-local actions SHALL remain available. Terminal bytes and prompt content SHALL NOT enter the bridge.

##### Scenario: A second terminal takes control
- **WHEN** a second client atomically claims a tab currently controlled by another client
- **THEN** the causal boundary and new owner SHALL be acknowledged before its first terminal input is delivered, the prior client SHALL become read-only, and previously buffered commands SHALL NOT be attributed to the new controller

##### Scenario: Stale detach request arrives
- **WHEN** a bridge detach request names a controller revision that has been superseded
- **THEN** the server SHALL reject it and SHALL NOT detach either client

##### Scenario: Delayed quit from a previous controller
- **WHEN** client A submits `/quit`, the input is delayed in a PTY or child queue, and client B claims control before it executes
- **THEN** the request SHALL retain A's old generation or be rejected as ambiguous, SHALL NOT detach B, and SHALL NOT stop the tab

##### Scenario: Controller boundary cannot be proven
- **WHEN** transport loss or incomplete input-boundary evidence prevents reliable command attribution
- **THEN** client-scoped child commands SHALL remain disabled with a concise notice, terminal input SHALL remain usable, and local double-`Ctrl+C` SHALL still detach only its attach client

#### Requirement: Quitting bare A1 detaches from resident tabs
Pressing `Ctrl+C` twice within the existing clear/exit interval SHALL detach the local attach client from any tab. The attach client SHALL forward the first `Ctrl+C` to the viewed tab unchanged and SHALL consume a second `Ctrl+C` inside the interval as the detach request without forwarding it, so a single `Ctrl+C` keeps its ordinary meaning in the tab and a double press never ends the tab's process. Inside an A1 tab, `/quit` and `Ctrl+D` on an empty editor SHALL detach only the client identified by their immutable command-origin controller revision, and only while it is still current. When the bridge or attribution is unavailable, the child SHALL remain running and SHALL direct the user to `Ctrl+C` twice. Detaching SHALL restore the outer terminal's screen and input modes and leave every tab running. When tabs remain running, the parent terminal SHALL show a dim `N tabs still running · run a1 to return`, singular for one. `/quit-all` SHALL stop every tab after confirmation when any is busy, then detach with the ordinary resume hint.

##### Scenario: Leave with Ctrl+C twice
- **WHEN** the user presses `Ctrl+C` twice within the clear/exit interval in any tab
- **THEN** the tab SHALL receive exactly one `Ctrl+C`, the client SHALL detach, and the tab's process SHALL keep running

##### Scenario: Single Ctrl+C keeps its meaning
- **WHEN** the user presses `Ctrl+C` once in an A1 tab
- **THEN** A1 in the tab SHALL clear or copy exactly as in single-agent A1 and the client SHALL remain attached

##### Scenario: Quit while a tab works
- **WHEN** the user quits while a background tab streams
- **THEN** the terminal SHALL be restored with the running-tabs hint and the tab SHALL finish its turn

##### Scenario: Enhanced keyboard modes do not leak
- **WHEN** the client detaches after enabling enhanced keyboard or mouse reporting
- **THEN** the parent shell SHALL receive no enhanced key or mouse sequences

#### Requirement: Relaunching bare A1 reattaches every tab
Bare `a1` SHALL connect to the profile's resident server, show every tab, and view the last viewed tab from its retained terminal surface within the interactive first-paint and first-input budgets. The surface SHALL include output produced while no client was attached. A launch while the server is recovering SHALL show a non-blocking reconnecting indication rather than fail.

##### Scenario: Close the terminal mid-turn and return
- **WHEN** the terminal running `a1` closes while a tab streams, and the user later runs `a1` in a new terminal
- **THEN** the tab SHALL show the output produced while detached and the live continuation of the turn, or its completed result

##### Scenario: Two terminals at once
- **WHEN** bare `a1` runs in two terminals of one profile
- **THEN** both SHALL show the same tabs and each SHALL keep its own viewed tab
- **AND** only the current input controller of a tab SHALL send input or resize its PTY while the other client remains a read-only viewer until it claims control

#### Requirement: Tab failure is presented and recoverable per tab
A crashed or failed tab SHALL show its reason in its own surface with `[r] retry`, `[f] start fresh`, and `[alt+w] close`. When a restarted tab's last user prompt had no settled reply, A1 SHALL offer that prompt back into the editor and SHALL NOT resend it. Other tabs SHALL remain fully operable.

##### Scenario: One tab crashes
- **WHEN** one tab's A1 process exits unexpectedly during a turn
- **THEN** only that tab SHALL show crash and restart state, and other tabs SHALL keep streaming and accepting input

##### Scenario: Restart budget exhausted
- **WHEN** a tab crashes three times within ten minutes
- **THEN** it SHALL show failed with retry, fresh, and close actions and SHALL NOT restart automatically again

#### Requirement: Tab shortcuts are declared, configurable, and conflict-checked
Tab shortcuts SHALL be declared with action identities, SHALL be configurable through a keybindings file, SHALL be checked at launch against A1's shortcut registry and user keybindings with conflicts reported, and SHALL appear in `/hotkeys` inside A1 tabs. The attach client SHALL consume a matched tab shortcut before input encoding and SHALL forward every other input to the viewed tab; the only `Ctrl+C` handling SHALL be the double-press detach. Defaults SHALL NOT use `Alt+[`, `Alt+]`, `Alt+Left`, `Alt+Right`, `Ctrl+L`, `Alt+Up`, or `Shift+Tab`.

##### Scenario: Hotkeys listing
- **WHEN** the user opens `/hotkeys` inside an A1 tab
- **THEN** a Tabs section SHALL list the effective tab shortcuts

##### Scenario: Collision with a user binding
- **WHEN** a user keybinding assigns `Alt+A` to an A1 editor action
- **THEN** launch SHALL report the conflict rather than dispatch the key ambiguously

## Capability: `resident-terminal-host`

### Purpose

Defines the opt-in resident capability (Windows x64, macOS, Linux) that keeps bare-A1 tabs alive independently of any terminal: the native resident server, per-tab session holders, and attach client, together with their protocols, controller attribution, durable registry, writer authority, derived credentials, detachment, crash/reboot recovery, limits, diagnostics, and preview certification.

### ADDED Requirements

#### Requirement: One authoritative resident server serves each user profile
A1 SHALL run at most one authoritative resident terminal-host server per operating-system user and canonical A1 profile root. Its endpoint SHALL be derived from the canonical profile home and runtime directory, SHALL be independent of the release cohort, and SHALL honor hermetic overrides. The endpoint SHALL provide discovery, while an owner-only operating-system exclusive registry-writer lease SHALL provide mutation authority. A starting server that completes a handshake with a live server SHALL exit as already running and its caller SHALL join the winner. After a failed handshake, the starter SHALL verify and terminate the recorded native owner before acquiring the released lease; if ownership or lease acquisition cannot be verified, startup SHALL fail closed. A server SHALL mutate the registry or remove its endpoint/marker only while it holds the lease and the durable epoch remains current. The server SHALL execute no A1, Pi, or extension code and SHALL own no pseudoterminal.

##### Scenario: Two launches race
- **WHEN** two bare `a1` invocations of one profile start concurrently with no server running
- **THEN** exactly one server SHALL bind and both clients SHALL attach to it

##### Scenario: Stale endpoint with verified owner
- **WHEN** the endpoint does not answer and its recorded native owner verifies
- **THEN** the starter SHALL terminate that exact owner, acquire its released writer lease, increment the epoch, and only then reclaim the endpoint

##### Scenario: Stale endpoint with unverifiable owner
- **WHEN** the endpoint does not answer but its recorded owner or writer lease cannot be verified
- **THEN** A1 SHALL report recovery blocked and SHALL NOT start a second writer

##### Scenario: Different profiles
- **WHEN** bare A1 runs with two different profile roots
- **THEN** each SHALL have its own server, registry, and tabs without cross-visibility

#### Requirement: Each tab is owned by its own session holder
Each tab SHALL be owned by exactly one native session holder process that creates and owns that tab's pseudoterminal (ConPTY on Windows), child process tree, and retained libghostty-vt terminal model with bounded scrollback, and that encodes input for the child's current terminal modes. Holders SHALL keep parsing child output whether or not any client views the tab. A holder exit SHALL affect only its tab. A server exit SHALL NOT terminate holders, their children, or their retained models. At most one live tab SHALL own a given Pi session file.

##### Scenario: Server killed
- **WHEN** the server process is killed while tabs stream
- **THEN** every holder, child process, and retained screen SHALL continue unaffected

##### Scenario: Holder panics
- **WHEN** one holder fails on malformed output
- **THEN** only its tab SHALL enter crash recovery and other tabs SHALL continue

##### Scenario: Open a held session
- **WHEN** a session file already owned by a live tab is selected
- **THEN** A1 SHALL focus that tab and SHALL NOT start a second tab on the file

#### Requirement: Resident processes start outside terminal containment
The server and every holder SHALL be started through an authenticated fixed-role native resident-launch path outside the launching terminal's console and launch-instance containment. The path SHALL verify the immutable terminal-host artifact, requested role, canonical profile and request authority, SHALL NOT accept arbitrary executable/argv escape requests, and SHALL NOT enable job-wide or silent breakaway on ordinary launch-instance or tab-child jobs. On Windows it SHALL support bounded native creation outside foreign kill-on-close jobs, including WMI where necessary; on macOS and Linux it SHALL start resident roles in a new session without a controlling terminal so terminal close and hang-up do not reach them, and on macOS it SHALL keep them in the user's per-user bootstrap namespace. It and SHALL verify resulting process identity and containment before announcing resident readiness. It SHALL record the observed mode and failures. When survival cannot be established, A1 SHALL use direct fallback with one notice and preserve existing records rather than claim persistence. This lifecycle boundary SHALL NOT claim to sandbox malicious same-user code.

##### Scenario: Close Windows Terminal
- **WHEN** the Windows Terminal window running bare `a1` is closed
- **THEN** the server, holders, and tab processes SHALL keep running and a later `a1` SHALL reattach

##### Scenario: Close a macOS or Linux terminal or lose SSH
- **WHEN** the terminal or SSH session running bare `a1` on macOS or Linux closes or hangs up
- **THEN** the server, holders, and tab processes SHALL keep running and a later `a1` SHALL reattach

##### Scenario: Launch inside a kill-on-close job
- **WHEN** bare `a1` starts inside a job that kills its processes on close, such as a Windows OpenSSH session
- **THEN** the server SHALL start outside that job and survive the session's end, or A1 SHALL refuse resident readiness and use the direct fallback with a notice

##### Scenario: Ordinary descendants stay contained
- **WHEN** an ordinary process in the bare-A1 launch instance or a tab-child tree tries to leave its containment, such as `CREATE_BREAKAWAY_FROM_JOB` on Windows
- **THEN** A1 SHALL NOT grant escape, and a normal contained child SHALL still terminate with its owning tree

##### Scenario: Resident launch request names an arbitrary executable
- **WHEN** a request supplies an unapproved executable, role, profile or request identity to the resident-launch path
- **THEN** native admission SHALL reject it without spawning a process

##### Scenario: Contained client requests server recovery
- **WHEN** the server dies while a verified attach client remains in its ordinary kill-on-close job
- **THEN** the authorized native recovery path SHALL start a verified replacement outside that job without broadening the client's job permissions

#### Requirement: The native binary owns the complete terminal data path
Pseudoterminal output, child input, retained terminal state, input encoding, composition, and outer-terminal writes SHALL remain inside the native terminal-host binary's attach, server, and holder roles. Node SHALL NOT read, relay, parse, or render tab terminal bytes. The attach client SHALL answer no terminal queries on a child's behalf; the holder's model SHALL answer them. The attach client SHALL compose the strip row and the viewed tab's surface, SHALL offset mouse coordinates by the strip, SHALL forward clipboard writes, hyperlinks, and cursor shape from the child, SHALL NOT forward bells, and SHALL restore every outer terminal mode it enabled when it detaches or fails.

##### Scenario: Child enables enhanced keyboard reporting
- **WHEN** an A1 tab enables an enhanced keyboard protocol and the outer terminal supports it
- **THEN** keys SHALL reach the child encoded for its mode and tab shortcuts SHALL still be intercepted

##### Scenario: Attach client crashes
- **WHEN** the attach client exits abnormally
- **THEN** the outer terminal SHALL be restored by the surviving-owner path even when forced termination prevents in-process fatal hooks, and every tab SHALL continue

#### Requirement: Host exchanges use a generation-stable bounded protocol
Every connection SHALL begin with a handshake carrying role, protocol generation, build, features, and credentials. Within a generation, messages SHALL change only additively with defaulted optional fields and unknown-value fallbacks, guarded by frozen shape fixtures; a missing optional method SHALL disable only that operation; a generation mismatch SHALL produce a typed incompatibility outcome. Frames, input messages, and handshakes SHALL be bounded. Topology mutations SHALL carry expected revisions and SHALL apply atomically or be rejected.

##### Scenario: Newer client, same generation
- **WHEN** a client of a newer release attaches to an older server of the same generation
- **THEN** the attach SHALL succeed and only operations the server lacks SHALL be unavailable

##### Scenario: Oversized frame
- **WHEN** a peer sends a frame above its limit
- **THEN** the receiver SHALL reject it and SHALL keep unrelated tabs and connections healthy

#### Requirement: Reattach renders from retained terminal state
Viewing a tab SHALL deliver a complete retained surface of cells, attributes, hyperlinks, cursor, and modes, followed by patches against its revision. Output produced while no client viewed the tab SHALL be present because the holder's model absorbed it. Logs or replayed byte streams SHALL NOT be used to reconstruct a screen. Only viewed tabs SHALL stream surfaces to a client; status and attention SHALL stream for all tabs.

##### Scenario: Reattach after hours detached
- **WHEN** a client views a tab that produced output for hours while detached
- **THEN** it SHALL render the tab's current screen immediately without replaying the history

#### Requirement: Slow clients never stall tabs
Each client connection SHALL have a bounded reliable control lane and a single-slot render lane in which newer surface updates replace unsent ones. A client that falls behind SHALL receive a full surface once it drains. The server SHALL NOT block holders, other clients, or registry writes on a slow client, and holders SHALL NOT block children on output.

##### Scenario: Suspended terminal
- **WHEN** one attached terminal stops reading while tabs stream
- **THEN** tabs and other clients SHALL continue normally and the stalled client SHALL show the current surface when it resumes

#### Requirement: The tab bridge reports structured A1 state and controller identity
Each A1 tab process SHALL receive a derived per-tab/per-incarnation credential and SHALL connect an authenticated bridge to the server that reports sequenced status from engine events, the Pi session file and name, whether its last prompt was interrupted, and semantic requests. Before terminal input from a new controller is accepted, the holder and child SHALL establish a causal input-admission boundary covering previously accepted input in native, PTY, and child buffers and acknowledge the new owner. A sideband marker acknowledgement alone SHALL NOT be treated as proof of ordering across channels. Client-scoped requests SHALL retain immutable controller identity/revision captured at command admission and SHALL be rejected when stale or ambiguous, never rebound to the controller current at execution. The server SHALL send visibility and rename notifications through the bridge, and A1 SHALL reduce animation work while hidden. Bridge messages SHALL NOT carry prompt, transcript, or terminal input content. The child SHALL consume bridge credentials into private memory and remove them from inherited environments before extension loading or descendant spawn; reconnect SHALL NOT restore them to the environment. A missing bridge SHALL degrade status and disable client-scoped child requests without breaking terminal input or attach-local detach.

##### Scenario: Pending extension request
- **WHEN** an extension in a tab opens a confirmation
- **THEN** the bridge SHALL report needs-input until it is answered

##### Scenario: Bridge unavailable
- **WHEN** a tab's bridge cannot connect
- **THEN** the tab SHALL keep running with process-level status, terminal input and attach-local actions, while client-scoped child requests remain disabled

##### Scenario: Buffered command crosses controller transfer
- **WHEN** an old controller's command remains buffered while a new controller is acknowledged
- **THEN** its request SHALL retain the old generation or be rejected as ambiguous, SHALL NOT acquire the new identity, and SHALL affect neither client after the old generation is superseded

#### Requirement: The tab registry is durable and lease-protected
The server SHALL write the per-profile registry only while holding the owner-only OS-exclusive writer lease and current durable epoch. Every mutation SHALL recheck that authority and commit through a temporary file, write-capable file sync, atomic rename, and directory sync before acknowledgement. The registry SHALL record each tab's identity, kind, display name and name source, order, cwd, session location, desired state, lifecycle, attention and seen positions, verified holder identity/incarnation/release, controller revision, credential-derivation inputs, restart budget, last exit, registry revision, epoch, and boot identity, and SHALL retain bounded history generations. It SHALL NOT store derived credentials, environment values, prompt text, or terminal content. An unreadable registry SHALL be quarantined, the last good generation loaded, and a notice shown; if existing state has no valid recoverable generation, recovery SHALL fail closed with preserved files rather than initialize an empty registry; persistent write failure SHALL preserve live observed state in memory, reject new durable mutations without acknowledging success, and report degraded health. A failed mutation SHALL NOT become a committed revision merely because it exists in memory.

##### Scenario: Server killed right after a rename
- **WHEN** a rename is acknowledged and the server is then killed
- **THEN** the next server SHALL present the new name

##### Scenario: Corrupt registry
- **WHEN** the registry cannot be parsed
- **THEN** the server SHALL quarantine it, load the last good generation, and name both in a notice

##### Scenario: No valid registry history remains
- **WHEN** an existing registry and all retained generations fail validation
- **THEN** startup SHALL report blocked recovery, preserve the evidence, and SHALL NOT overwrite it with an empty tab set

#### Requirement: Credentials survive server replacement without entering the registry
Clients SHALL authenticate with a random owner-only client token. One random owner-only profile secret stored outside the registry SHALL derive holder and bridge credentials from tab identity and process incarnation. A replacement server SHALL reproduce the expected credential from the secret and recorded non-secret inputs, then also verify pid and native start identity before admission. Endpoint, token, secret, lease, registry, journal, and recovery-file access SHALL be restricted to the owning user. The server SHALL adopt, signal, or terminate a process only after verifying credential, recorded native identity, incarnation, and current epoch, and SHALL leave unverifiable processes untouched and reported.

##### Scenario: Process identifier reuse
- **WHEN** a recorded holder identifier now belongs to an unrelated process
- **THEN** the server SHALL NOT adopt or terminate it and SHALL treat the tab's holder as gone

##### Scenario: Another local user connects
- **WHEN** a process of another operating-system user connects
- **THEN** endpoint access control SHALL refuse it

#### Requirement: Crashed and hung tabs restart within a bounded budget
Holders SHALL detect child exit immediately and the server SHALL detect holder exit and heartbeat hangs within a bounded timeout, terminating verified hung trees gracefully then forcibly. An unrequested exit SHALL restart the tab by resuming its Pi session with increasing backoff; after three restarts within ten minutes the tab SHALL become failed and require retry, fresh start, or close. Restarts SHALL NOT resend an interrupted prompt. If child standard error is separately available, it SHALL be captured only as private bounded recovery data, not as a sanitized diagnostic log, and SHALL be excluded from the doctor bundle.

##### Scenario: Tab process killed
- **WHEN** a tab's A1 process is killed externally
- **THEN** the holder SHALL restart it from its session and the tab SHALL show its transcript again

##### Scenario: Interrupted turn after restart
- **WHEN** a tab crashed after the user's prompt was persisted but before a reply settled
- **THEN** the restarted tab SHALL be idle and SHALL offer the prompt without resubmitting it

#### Requirement: The server heals itself without losing tabs or creating split brain
When the server exits unexpectedly, attach clients SHALL show a non-blocking reconnecting indication, and any client or holder MAY start a replacement through the detach routine. The replacement SHALL acquire the released writer lease, increment the durable epoch, derive expected holder credentials, verify native identities/incarnations, and re-admit surviving holders; tabs whose holders are gone SHALL enter crash recovery. A live recorded owner SHALL be terminated only after exact identity verification, and an unverifiable owner or unavailable lease SHALL block replacement. After three starts within sixty seconds, clients SHALL show a stopped state with restart and quit actions, preserving diagnostics.

##### Scenario: Server killed with no client attached
- **WHEN** the server dies while no terminal runs `a1`
- **THEN** a holder SHALL start the replacement, and the next `a1` SHALL reattach every tab with its current screen

#### Requirement: Reboot and logout end tabs without losing sessions
Resident processes SHALL end with the operating-system session; this version SHALL NOT restore tabs after reboot or logout. When the server starts under a new boot identity, or finds desired-running tabs without live verified holders after a new OS session, it SHALL move the previous tab set to registry history instead of starting those tabs, and bare `a1` SHALL start with one new tab. Every previous Pi session SHALL stay resumable through the normal session picker or `a1 --session`. A pending journaled prompt SHALL be offered, without replay, when its session is next opened in a tab within seven days. A reserved first-turn identity whose journal proves the session file was never created SHALL be recoverable the same way rather than treated as a missing transcript.

##### Scenario: Reboot with three tabs
- **WHEN** the machine reboots with three running tabs and the user runs `a1`
- **THEN** A1 SHALL start one new tab, and all three previous sessions SHALL be listed in the session picker with every committed transcript entry

##### Scenario: First-turn session file does not yet exist
- **WHEN** a reboot leaves a durable reserved session identity and pending journal but Pi had not created the first session file
- **THEN** opening that identity SHALL offer the prompt idle rather than treat it as a missing existing transcript or automatically resend it

#### Requirement: Updates retain the active resident cohort
Installing or activating a release SHALL NOT terminate the server, holders, or tab processes. Resident binaries and tab processes SHALL run from immutable release directories, and every release used by a live verified resident process SHALL be retained. In this version a same-generation newer client MAY attach with unsupported optional operations disabled, while the existing resident cohort remains on its release until all tabs stop. A generation mismatch SHALL report that the host must be stopped explicitly and SHALL NOT kill or recycle tabs. Automatic endpoint handoff and idle release recycling require a later change.

##### Scenario: Update mid-turn
- **WHEN** `a1 update` runs while a tab streams
- **THEN** the turn and resident process identities SHALL remain uninterrupted and their immutable release SHALL remain retained

#### Requirement: Resident resources are bounded and observable
A1 SHALL enforce configurable limits on tab count, concurrent starts, scrollback, and client queues, each with a hard cap. When idle suspension is enabled (default 60 minutes), an idle tab with no pending request, queued input, or viewer SHALL stop its A1 process, show suspended, and resume its session on view or prompt. The server SHALL exit only after ten minutes with no running tabs and no clients. Logs SHALL rotate and SHALL exclude terminal content, prompt text, and credentials. `a1 tabs host status` SHALL report server identity, build, generation, detachment mode, tab count, and log locations.

##### Scenario: Idle suspension
- **WHEN** an unviewed idle tab reaches the suspension interval
- **THEN** its A1 process SHALL stop, its chip SHALL show suspended, and viewing it SHALL resume the session with no lost transcript

#### Requirement: Resident tabs have non-interactive maintenance commands
A1 SHALL provide `a1 tabs` to list tabs with identity, name, status, and cwd; `a1 tabs stop <id>` and `a1 tabs stop --all`; `a1 tabs host status` and `a1 tabs host stop`, which stops tabs gracefully before the server; and `a1 tabs doctor`, which creates a bounded redacted diagnostic bundle. These commands SHALL NOT start an interactive runtime, SHALL NOT start a server merely to report that none runs, and SHALL fail concisely with nonzero status on invalid arguments.

##### Scenario: List with no server
- **WHEN** the user runs `a1 tabs` and no server runs
- **THEN** A1 SHALL report no running tabs and SHALL NOT start a server

#### Requirement: Preview support is packaged, opt-in, certified, and reversible
The terminal-host binary SHALL ship for Windows x64, macOS, and Linux with artifact hashes, pinned source provenance, licenses, notices, and immutable-release placement verified before execution. `tabs.resident` SHALL remain `false` by default on every platform in this change and SHALL be accepted as an opt-in preview on each platform only after exact-package automated suites and manual or isolated-worker physical evidence on that platform for terminal closure, remote-session loss, input fidelity, extension text UI, recovery, and rendering. Physical automation SHALL NOT run on an active workstation. When the setting is false, the platform unsupported, or the server cannot start safely, bare `a1` SHALL run the direct single-agent owned UI, with one notice for an attempted fallback; registry records and sessions SHALL be preserved. Default-on support on any platform and each additional platform require separate approved changes and evidence.

##### Scenario: Server cannot start
- **WHEN** the terminal-host binary is missing, unverified, or fails its start budget
- **THEN** bare `a1` SHALL use the direct single-agent path with one notice, preserving records and applying the shared writer-lease check to any selected session rather than bypassing a live writer

## Capability: `resident-tab-reliability`

### Purpose

Defines the reliability contract of resident tabs: failure-domain isolation, crash-only recovery, non-blocking execution, progress supervision, the explicit data-durability guarantees, fencing, diagnostics preservation, and the verification program that gates release.

### ADDED Requirements

#### Requirement: Failure domains are isolated processes
The attach client, the resident server, each tab's session holder, and each tab's A1 process SHALL be separate operating-system processes. No process SHALL host another tab's pseudoterminal, terminal model, or A1 runtime. Termination or hang of the server SHALL NOT terminate or stall any holder or tab process; termination or hang of one holder or tab process SHALL NOT affect any other tab, the server, or any client; termination of a client SHALL NOT affect any resident process.

##### Scenario: Kill every server process repeatedly
- **WHEN** the server is killed ten times within one minute while five tabs stream
- **THEN** all five tab processes SHALL keep running with unchanged process identities and no lost output in their retained screens

##### Scenario: One tab's process tree hangs
- **WHEN** one tab's child stops responding and stops reading its input
- **THEN** every other tab SHALL keep accepting input and rendering at normal latency

#### Requirement: Resident processes are crash-only and fail fast
Every resident process SHALL be safe to terminate forcibly at any instruction. Its startup path SHALL be its recovery path, reconciling durable desired state with verified actual state. A detected internal invariant violation SHALL terminate only the affected process with a diagnostic record, and SHALL NOT be swallowed so that the process continues in an inconsistent state. Code SHALL NOT be hot-swapped into a running resident process; upgrades SHALL replace processes.

##### Scenario: Server invariant violation
- **WHEN** the server detects registry and topology state that contradict each other
- **THEN** it SHALL write a crash record and exit, and its replacement SHALL recover from the durable registry and verified holders without affecting tabs

##### Scenario: Forced termination during a registry write
- **WHEN** the server is killed at any point during a registry commit
- **THEN** the next server SHALL load either the complete prior or the complete new registry and SHALL NOT start empty

#### Requirement: Control paths never block on external work
Each resident role's state machine SHALL run on a single event loop that performs no blocking system call. Process spawn, pseudoterminal creation, process termination, identity inspection, file writes, and synchronization SHALL run off the event loop with explicit deadlines, and a missed deadline SHALL become a typed failure event. Pseudoterminal creation SHALL occur only inside that tab's holder, so a creation that never returns SHALL hang only that holder, which the server SHALL terminate and replace after its deadline. Termination of several tabs SHALL proceed concurrently and SHALL NOT delay unrelated operations.

##### Scenario: Pseudoterminal creation never returns
- **WHEN** pseudoterminal creation blocks indefinitely in a new tab's holder
- **THEN** the server SHALL remain responsive, SHALL terminate that holder after the spawn deadline, retry within the restart budget, and every other tab SHALL be unaffected

##### Scenario: Close a group of busy tabs
- **WHEN** the user stops six tabs at once
- **THEN** the server SHALL keep answering clients and heartbeats throughout, and every tab SHALL reach stopped or a reported termination failure within the bounded deadline

#### Requirement: Pseudoterminal I/O is flow-controlled and never silently lossy
Each holder SHALL read its pseudoterminal continuously on a dedicated reader so the child never blocks on output, and SHALL write input from a dedicated writer with a bounded queue so a child that stops reading never blocks the holder. When the input queue is full, A1 SHALL reject further input for that tab with a visible `not accepting input` indication and SHALL NOT silently drop, reorder, or truncate accepted input. Keystrokes sent while a tab is starting SHALL be queued in order up to the bound and delivered when it becomes ready, or rejected visibly. A paste SHALL reserve capacity for its complete bounded payload before any prefix is delivered. Admission atomicity SHALL NOT be described as atomic execution by the child: failure after admission SHALL report uncertain delivery and SHALL NOT trigger automatic replay.

##### Scenario: Paste into a stalled child
- **WHEN** the user pastes into a tab whose child is not reading input and the queue lacks capacity for the entire paste
- **THEN** admission SHALL reject the paste with a visible indication before delivering any prefix

##### Scenario: Child fails after paste admission
- **WHEN** a paste was admitted but the child dies after reading only part of it
- **THEN** A1 SHALL report uncertain delivery, SHALL NOT claim transactional child execution, and SHALL NOT replay the paste automatically

#### Requirement: Liveness and progress are supervised separately
Each resident role SHALL run an independent watchdog that detects its own event-loop stall, records diagnostics including thread state, and terminates only that process. The server SHALL supervise holders through five-second heartbeats and treat three missed ticks over a healthy supervision path as a holder timeout. Holders SHALL supervise their A1 process through bridge heartbeats emitted from its event loop. Server or bridge transport loss alone SHALL NOT be classified as a child hang or authorize child termination; child liveness SHALL be re-established before destructive recovery. An A1 process that is alive but has missed bridge heartbeats for 30 seconds SHALL be shown as unresponsive; after `tabs.unresponsiveRestartSeconds` (default 120) it SHALL be restarted from its session with its prompt journal and last screen preserved. A tab that is working but has produced no progress event for `tabs.stallNoticeSeconds` (default 300) SHALL be shown as stalled with interrupt and restart actions and SHALL NOT be terminated automatically, because long-running tools are legitimate.

##### Scenario: A1 event loop wedges
- **WHEN** a tab's A1 process stops emitting bridge heartbeats but its process is alive
- **THEN** its chip SHALL show unresponsive within 30 seconds, and after the configured interval the tab SHALL restart from its session with the pending prompt offered back

##### Scenario: Server loss interrupts bridge delivery
- **WHEN** the server dies or the bridge transport fails while a child remains alive
- **THEN** holders SHALL keep the child running, report degraded status, and SHALL NOT apply the child heartbeat restart deadline solely to the transport outage

##### Scenario: Provider stream stalls
- **WHEN** a working tab receives no model or tool progress for five minutes
- **THEN** its chip SHALL show stalled with interrupt and restart actions, and the tab SHALL NOT be killed automatically

#### Requirement: Recovery is level-triggered reconciliation
The server SHALL converge each tab's actual state toward its durable desired state through idempotent reconciliation rather than one-shot event handling. Terminal size, lifecycle, and holder presence SHALL be treated as desired state that is re-applied until observed. Every holder and tab-process incarnation SHALL carry a unique incarnation identity, and events from a superseded incarnation SHALL be discarded. Reconciliation SHALL be gated so that at most one start is in flight per tab.

##### Scenario: Late exit event from a replaced child
- **WHEN** an exit notification for a previous incarnation arrives after the tab was restarted
- **THEN** the server SHALL discard it and the new incarnation SHALL keep running

##### Scenario: Resize lost in transit
- **WHEN** a resize message is lost or reordered
- **THEN** the holder's size SHALL still converge to the latest desired size

#### Requirement: Stale servers and registry writers are fenced out
Exactly one server SHALL hold the owner-only operating-system registry-writer lease. A failed endpoint handshake SHALL NOT by itself authorize replacement: the starter SHALL verify the recorded owner's native process identity, terminate that owner, and acquire the released lease, or fail closed when verification or acquisition is unavailable. Each server start SHALL durably increment the registry epoch while holding the lease before it acts. Every registry mutation SHALL verify that the lease is still held and the durable epoch is current. Holders and bridges SHALL accept commands only from the highest epoch they have observed and SHALL reject lower epochs.

##### Scenario: A hung server resumes after replacement
- **WHEN** a verified hung server was terminated, its lease was acquired by a replacement, and stale work from the old incarnation is later delivered
- **THEN** holders and bridges SHALL reject its epoch and no stale registry mutation SHALL commit

##### Scenario: Timed-out owner cannot be verified
- **WHEN** the endpoint does not answer but the recorded owner cannot be proven and terminated by native identity
- **THEN** A1 SHALL report host recovery blocked and SHALL NOT start a second registry writer

#### Requirement: Durable data is guaranteed per class
A1 SHALL uphold these guarantees across forced termination of any process, including all resident processes at once:
- Each submitted prompt SHALL have a stable submission ID bound to its session/incarnation and SHALL be synchronized to an owner-only per-tab journal before agent dispatch. Failed or timed-out journal admission SHALL preserve the editor prompt, report the failure, and dispatch nothing. Asynchronous prompt history SHALL NOT substitute for this barrier. A journal entry SHALL be retired only after the corresponding identified session entry is synchronized; settled completion SHALL also be durably correlated so recovery does not offer a completed submission as unfinished. Recovery SHALL reconcile journal/session records by identity, offer unfinished prompts without automatic resend, and cover the first turn before Pi creates its session file.
- Committed Pi session entries SHALL never be lost on process termination. A1 SHALL synchronize the session file to stable storage after each settled turn and on graceful stop, so settled turns also survive power loss.
- A tab's session identity and file path SHALL be durably recorded in the registry before the tab accepts input.
- The editor draft SHALL be checkpointed periodically with a maximum one-second dirty interval while storage and the event loop are healthy, including continuous typing with no idle interval. A failed or late checkpoint SHALL expose degraded recovery and SHALL NOT silently retain the one-second loss guarantee.
- When a tab's A1 process dies, its holder SHALL keep the last retained screen visible as a read-only snapshot and SHALL write it with bounded scrollback to an owner-only recovery file, retained for seven days, so streamed but uncommitted output remains readable.
- Registry mutations SHALL be synchronized with write access sufficient for the platform's flush semantics, SHALL retry transient rename failures with backoff, and SHALL NOT be acknowledged as committed until their durability barrier succeeds. Persistent failure SHALL reject new durable mutations while retaining live observed state in memory, report degraded health, and never rebuild state from an older file over newer memory. Each platform's file and replacement/directory metadata durability primitives and supported-filesystem limits SHALL be specified and tested, including a write-capable flush with write-through replacement on Windows and `F_FULLFSYNC` on macOS; API-call occurrence alone SHALL NOT certify power-loss survival.

##### Scenario: Power loss after a settled turn
- **WHEN** the machine loses power after a turn has settled
- **THEN** after reboot that session SHALL contain that turn when it is resumed

##### Scenario: Crash during the first turn of a new tab
- **WHEN** a new tab's A1 process is killed before its first reply completes
- **THEN** the restarted tab SHALL offer the original prompt from the journal even though Pi had not created a session file

##### Scenario: Journal admission fails
- **WHEN** a submitted prompt cannot be durably journaled before dispatch
- **THEN** the editor SHALL retain it with a visible failure and the agent SHALL receive no submission

##### Scenario: Crash between session synchronization and journal retirement
- **WHEN** a submission's session entry is synchronized but the journal still contains its submission ID at crash time
- **THEN** recovery SHALL reconcile the records without duplicating the session entry or dispatching the prompt, and SHALL offer it only if the turn remains unfinished

##### Scenario: Continuous typing before a crash
- **WHEN** the user types continuously for thirty seconds with healthy storage and the tab is then killed
- **THEN** recovery SHALL contain all but at most the last second of draft changes without requiring an inactivity interval

##### Scenario: Draft checkpoint stalls
- **WHEN** the draft checkpoint exceeds its dirty-interval bound because storage fails or blocks
- **THEN** A1 SHALL report degraded recovery when observable and SHALL NOT claim the one-second draft-loss bound remains satisfied

##### Scenario: Crash mid-stream
- **WHEN** a tab's A1 process dies while a reply streams
- **THEN** the streamed text SHALL remain visible in the read-only last-screen snapshot and in its recovery file

##### Scenario: Antivirus holds the registry file
- **WHEN** registry rename fails transiently because another process holds the file
- **THEN** the server SHALL retry, keep serving from memory, report degraded health if the failure persists, and SHALL NOT drop or kill any tab

#### Requirement: Session exclusivity is enforced by the operating system
Every A1-owned runtime that writes a Pi session on a supported platform, whether resident, direct/fallback, or Pi-comparison, SHALL acquire the same profile-neutral native session-writer lease before opening it for writing, regardless of the resident setting. Direct modes SHALL NOT start a resident host, holder, or bridge to perform this check. The lease SHALL be an operating-system lock held by the writer process itself. Lease identity SHALL resolve case, junction/symlink, hard-link and existing-file aliases, and SHALL reserve a canonical parent/name for a new file without a gap when binding its created file identity. Lock custody SHALL follow the actual session writer lifetime; death of the holder alone SHALL NOT release exclusivity while the writer remains alive. Replacement SHALL require lease acquisition and verified exit of the previous writer/tree; unavailable proof SHALL block replacement. Session switching SHALL acquire the target before releasing the previous writer lease and preserve the old session on failed admission. Kernel cleanup SHALL release abandoned leases only once no live owner remains. Unmodified external Pi, older nonparticipating releases, and arbitrary file writers are outside this cooperative contract and SHALL NOT be claimed as covered.

##### Scenario: Orphaned child still alive during recovery
- **WHEN** recovery finds a session whose previous A1 process may still be running but cannot be verified
- **THEN** the lease SHALL prevent a second process from appending to that session, and the tab SHALL report the conflict instead of starting

##### Scenario: Holder dies before its writer exits
- **WHEN** a holder is killed but its A1 writer has not yet been proven exited
- **THEN** the writer-bound lease SHALL prevent a replacement from writing the same session, and uncertainty SHALL keep recovery blocked

##### Scenario: Direct fallback targets a held session
- **WHEN** a direct or fallback A1 runtime selects a session held by a resident writer
- **THEN** admission SHALL fail safely or offer an explicit fork, and SHALL NOT start a second writer or silently attach the direct invocation

##### Scenario: Session path alias
- **WHEN** two A1-owned runtimes select aliases of the same session file
- **THEN** both SHALL resolve the same lock authority and at most one SHALL open the session for writing

##### Scenario: Session switch conflicts
- **WHEN** a running session attempts to switch to a session already held elsewhere
- **THEN** the switch SHALL be rejected without losing the old session or its lease

#### Requirement: Concurrent tab starts do not corrupt shared profile state
Tab starts SHALL be limited by `tabs.maxConcurrentStarts` and spaced so that concurrent Pi processes do not contend on profile authentication or settings locks beyond Pi's retry budget. Tab stops SHALL request graceful shutdown before forced termination so profile locks are released normally.

##### Scenario: Start ten tabs at once
- **WHEN** ten tabs start or restart at once
- **THEN** every tab SHALL start with its configured models available

#### Requirement: Diagnostics survive the failures they describe
Resident logs SHALL rotate by size into bounded retained generations and SHALL never be deleted or truncated at startup. Every crash, watchdog termination, and unrequested child exit SHALL produce a distinct timestamped record containing role, incarnation, reason, recent structured events, and, for native processes, a backtrace, bounded in total size and age. Structured logs and crash records SHALL use allowlisted metadata and SHALL exclude credentials, prompt/transcript/terminal content, raw stderr, and arbitrary exception messages. Journals, last-screen snapshots, and optional separately captured child stderr SHALL be classified as sensitive recovery artifacts rather than sanitized diagnostics, restricted to the owner and bounded by size and age. Optional stderr SHALL retain at most three 5 MiB generations for at most seven days and SHALL NOT be inferred by scraping terminal cells. `a1 tabs doctor` SHALL export only allowlisted diagnostic data with host status, recent structured records, counters for restarts, stalls, resyncs, and degraded states, and platform detachment details; it SHALL exclude recovery content.

##### Scenario: Two crashes in a row
- **WHEN** a tab crashes, restarts, and crashes again
- **THEN** both crash records SHALL be preserved and distinguishable

##### Scenario: Extension writes sensitive stderr
- **WHEN** a child extension writes a prompt, credential-like text, or terminal control sequence to stderr
- **THEN** that raw content SHALL NOT appear in structured logs, crash records, or the doctor bundle, and any separately captured copy SHALL remain private bounded recovery data

#### Requirement: Reliability evidence matches the enablement stage
The server state machine SHALL be implemented independently of I/O and SHALL be exercised by deterministic simulation and property tests that inject arbitrary interleavings of process death, message loss, reordering, delay, stale epochs, controller transfer, client churn, and mutations, asserting that no committed mutation is lost, only one registry writer exists, no session gains two live tabs, client-scoped requests remain attributable, and every desired-running tab converges to running or failed. Every persistence and IPC step SHALL expose a failure-injection point exercised by crash-point tests. Protocol decoders and surface encoders SHALL be fuzzed, and bounded chaos/fault-injection suites on each platform SHALL gate the opt-in preview. Implementation SHALL progress through contracts and platform primitives, one persistent tab, failure isolation, crash recovery, complete UX, and packaged certification, each delivered as its own change behind `tabs.resident: false`, with evidence at each milestone before dependent behavior is enabled. Intermediate demonstrations SHALL NOT count as shipping acceptance. Historical v2/herdr results, Unix-only tests, and pending 2×2 proof records SHALL NOT substitute for exact-package resident evidence on each platform.

Before resident tabs may default on for a platform, a separately authorized isolated-worker soak on that platform of at least 24 hours SHALL exercise ten tabs under high-rate output and random termination of servers, holders, tab processes, and clients, controller and resize churn, blocked writes, pseudoterminal creation hangs, and rename denial. It SHALL assert zero lost journaled prompts, zero lost committed entries, zero orphaned processes, zero duplicate tabs, bounded memory and handle growth, reattach p95 under 300 ms, tab restart under 3 s, and server recovery under 2 s. Each later platform SHALL earn equivalent implementation and exact-package evidence before enablement; evidence SHALL NOT be inferred across platforms.

##### Scenario: Opt-in preview changes resident code
- **WHEN** the preview remains disabled by default
- **THEN** deterministic, crash-point, fuzz, bounded chaos, and exact-package physical evidence SHALL be required without claiming that the later 24-hour default-on gate has passed

##### Scenario: Prototype evidence is available
- **WHEN** a reference prototype has a passing benchmark or another platform's detach tests pass
- **THEN** A1's resident milestone and physical verdict on each platform SHALL remain unproven until its own exact-artifact evidence is recorded

##### Scenario: Default-on soak detects a leak
- **WHEN** the authorized 24-hour soak observes handle or memory growth beyond the declared bound
- **THEN** default enablement SHALL remain blocked until the growth is fixed or the bound is explicitly re-justified in a later approved plan

##### Scenario: Simulation finds a duplicate start
- **WHEN** a simulated interleaving produces two live incarnations for one tab
- **THEN** the test SHALL fail with the minimized event sequence

## Capability: `a1-shell`

### MODIFIED Requirements

#### Requirement: Interactive launch forms use the owned Pi UI pipeline
Bare `a1` SHALL launch the A1-owned product surface directly. Explicit prerelease `a1 pi` SHALL use the same owned rendering and input pipeline with A1-specific surfaces withheld and Pi's ordinary user profile selected. Profile selection SHALL NOT introduce transparent child attachment, a PTY, a terminal parser, a byte relay, or a second rendering path. The redundant `a1 ui` route SHALL NOT be exposed. On a supported platform (Windows x64, macOS, Linux), when the opt-in `tabs.resident` setting is enabled, bare `a1` SHALL instead run the native terminal-host attach client over resident tabs, each of which SHALL run the same owned product UI in its own holder-owned pseudoterminal; pseudoterminals, terminal models, and composition SHALL exist only inside the resident terminal-host capability, and `a1 pi` SHALL retain its direct presentation without resident infrastructure. Direct and Pi-comparison runtimes SHALL share only the canonical session-writer admission guard with resident runtimes; this guard SHALL NOT initialize a terminal host. This change SHALL leave `tabs.resident` disabled by default and SHALL leave unsupported platforms on the direct owned path.

##### Scenario: Launch bare A1
- **WHEN** the user runs `a1`
- **THEN** A1 SHALL start the owned product UI without requiring a profile argument

##### Scenario: Launch after a prior exit
- **WHEN** the user runs bare A1 after a previous owned foreground session exited
- **THEN** with resident tabs disabled A1 SHALL start a fresh owned session without replaying the prior retained terminal surface
- **AND** with resident tabs enabled A1 SHALL reattach to the running tabs and present their current retained surfaces

##### Scenario: Launch bare A1 with resident tabs
- **WHEN** the user runs `a1` on a supported platform with resident tabs explicitly enabled
- **THEN** every tab SHALL run the owned product UI, and Node SHALL NOT read, relay, or render tab terminal bytes

##### Scenario: Resident tabs are not enabled
- **WHEN** the setting remains at its default or the platform is unsupported
- **THEN** bare A1 SHALL use the direct single-agent owned path and SHALL NOT start the resident host

##### Scenario: Launch the Pi comparison
- **WHEN** the user runs prerelease `a1 pi`
- **THEN** A1 SHALL use the shared owned pipeline with product surfaces withheld and Pi's ordinary profile selected

##### Scenario: Request the removed development alias
- **WHEN** the user runs `a1 ui`
- **THEN** A1 SHALL reject the unsupported profile and SHALL NOT silently select another runtime

#### Requirement: Interactive launch forms share one non-detachable instance boundary
The immutable interactive launcher SHALL establish the same non-detachable launch-instance ownership boundary before selecting bare `a1` or prerelease `a1 pi`. Both forms SHALL retain the shared owned rendering and input pipeline inside that boundary. The lifecycle layer SHALL own process containment and cleanup without reading terminal input, parsing output, reconstructing display state, or selecting a second rendering path. When resident tabs are enabled, bare `a1`'s launch instance SHALL own its attach client and every ordinary descendant that client creates, without enabling job-wide breakaway, while the resident server, session holders, and tab processes SHALL belong to the explicit resident terminal-host capability.

##### Scenario: Launch owned A1
- **WHEN** the shell selects bare `a1` with resident tabs disabled or unsupported
- **THEN** the owned product UI and every process it creates SHALL belong to that command's launch instance

##### Scenario: Launch owned A1 with resident tabs
- **WHEN** the shell selects bare `a1` while resident tabs are enabled
- **THEN** the attach client SHALL belong to that command's launch instance
- **AND** the resident server, holders, and tab processes SHALL be started only through the explicit resident capability and SHALL NOT be members of the launch instance

##### Scenario: Launch the Pi comparison
- **WHEN** the shell selects prerelease `a1 pi`
- **THEN** the owned comparison UI and every process it creates SHALL belong to that command's launch instance without changing the shared rendering pipeline

##### Scenario: Another instance is active
- **WHEN** the shell launches while one or more interactive instances already exist
- **THEN** it SHALL create another independent instance rather than acquiring a product-wide foreground slot

## Capability: `launch-instance-lifecycle`

### MODIFIED Requirements

#### Requirement: A launch instance owns its complete runtime process tree
A launch instance SHALL own its selected root runtime and every agent, extension, tool, daemon, helper, and descendant process created within its declared containment boundary. Default interactive instances SHALL be non-detachable; a process that must survive instance closure requires a separately specified explicit resident capability. The resident terminal host is that explicit capability: its server and session holders SHALL be started only through the authenticated fixed-role native resident-launch path, SHALL be owned and cleaned up by the resident capability rather than by any launch instance, and SHALL NOT expose a generic escape service to other components. Ordinary launch-instance and tab-child jobs SHALL NOT enable job-wide or silent breakaway; native admission SHALL verify artifact, role, profile and request authority before resident creation. This lifecycle boundary SHALL NOT claim to sandbox malicious same-user code.

##### Scenario: Runtime starts descendants
- **WHEN** an owned UI or Pi runtime starts extension daemons, agent workers, tools, or further descendants
- **THEN** those processes SHALL remain members of the originating launch instance and SHALL NOT become unowned background runtime processes

##### Scenario: A component requests implicit detachment
- **WHEN** an instance-owned component attempts to survive the closure of its originating instance without an explicit resident capability
- **THEN** A1 SHALL retain it within terminate-on-close ownership rather than silently detaching it

##### Scenario: Resident tabs outlive a bare-A1 instance
- **WHEN** a bare-A1 launch instance with resident tabs enabled closes normally or through terminal loss
- **THEN** A1 SHALL terminate that instance's attach-client process tree and SHALL leave the resident server, holders, and tab processes running

##### Scenario: Processes started inside a tab
- **WHEN** A1 running in a resident tab starts tools or extension subprocesses
- **THEN** those processes SHALL belong to that tab's holder-owned process tree and SHALL be terminated when the tab is stopped

##### Scenario: Ordinary descendant requests job breakaway
- **WHEN** a tool or helper requests `CREATE_BREAKAWAY_FROM_JOB` inside an ordinary A1-owned job
- **THEN** A1 SHALL NOT have enabled a job-wide escape permission for it, and an ordinary contained spawn SHALL remain terminate-on-close

##### Scenario: Forced attach termination
- **WHEN** an attach client is killed without running its own cleanup hooks
- **THEN** the surviving terminal-restoration owner SHALL restore the invoking terminal, while guardians remain lifecycle-only and resident tabs continue

#### Requirement: Explicit session selection belongs to the originating launch instance
A supported session launch SHALL carry its validated target and effective session-directory selection intact through release selection, bootstrap, containment, and owned runtime startup. A supported retry or handoff SHALL preserve that same selection. Launch metadata SHALL remain per invocation, SHALL NOT become a supervisor-wide default or leak through inherited stale session metadata, and SHALL NOT require terminal parsing or shell command evaluation. Session launch failures SHALL retain the existing instance cleanup guarantees. When resident tabs are enabled, a bare-A1 session launch SHALL deliver its selection to the resident server, which SHALL open it as a tab or focus the tab already holding it.

##### Scenario: Launch an explicit session through an immutable release
- **WHEN** the installed command selects a persisted session and launches an approved immutable release
- **THEN** the contained owned runtime SHALL receive the same target and directory selection rather than start a fresh session

##### Scenario: Retry the launch path
- **WHEN** a supported launch retry or release handoff occurs after session selection
- **THEN** the replacement launch attempt SHALL preserve the original selection

##### Scenario: Resume two distinct sessions concurrently
- **WHEN** separate invocations select different saved sessions using the same profile and supervisor
- **THEN** each owned runtime SHALL receive only its invocation's selection and closing one SHALL leave the other active

##### Scenario: Start bare A1 after a resume invocation
- **WHEN** a bare launch follows an explicit resume launch or inherits unrelated session metadata from its parent environment
- **THEN** it SHALL NOT reuse the previous selection implicitly
- **AND** with resident tabs disabled it SHALL start a fresh session, while with resident tabs enabled it SHALL reattach to the existing tabs or create one fresh tab when none exist

##### Scenario: Resume fails after containment starts
- **WHEN** target resolution or runtime initialization fails within an owned launch instance
- **THEN** the failure SHALL propagate to the invoking command and the instance's processes SHALL be cleaned up without affecting other instances

##### Scenario: Select a session held by a resident tab
- **WHEN** resident tabs are enabled and `a1 --session <id>` names a session already owned by a live resident tab
- **THEN** A1 SHALL focus that tab and SHALL NOT open the session in a second tab

## Capability: `launch-profiles`

### MODIFIED Requirements

#### Requirement: Interactive launch forms are concurrently independent
A1 SHALL permit multiple simultaneous instances of bare `a1`, prerelease `a1 pi`, or both. Profile selection, profile data, lifecycle state, process containment, and closure SHALL remain scoped to the originating invocation rather than a product-wide foreground slot. When resident tabs are enabled, concurrent bare-A1 instances of the same profile SHALL attach to that profile's single resident terminal host as independent clients; closing one client SHALL NOT affect another client or any resident tab. A1-owned runtimes in either profile SHALL share the native session-writer admission guard only when selecting the same canonical session file, regardless of the resident setting. The guard SHALL be independent of resident initialization: `a1 pi` and direct A1 SHALL start no host, holder, strip or bridge. Different session files SHALL remain independently writable, and unmodified external Pi or older nonparticipating builds SHALL NOT be claimed as covered.

##### Scenario: Start the same profile twice
- **WHEN** the user starts two instances of the same retained profile
- **THEN** both SHALL launch independently without sharing foreground ownership

##### Scenario: Start both profile forms
- **WHEN** owned A1 or Pi-comparison instances are already active and another supported form is launched
- **THEN** the new invocation SHALL start independently without requiring an existing instance to exit

##### Scenario: Two bare A1 clients share resident tabs
- **WHEN** two bare `a1` instances of one profile run with resident tabs enabled and one of them exits
- **THEN** the remaining instance SHALL keep its tabs, active selection, and input unaffected, and every resident tab SHALL keep running

##### Scenario: Comparison profile selects a session held by a tab
- **WHEN** a Pi-comparison runtime selects the canonical file already held by a resident A1 tab
- **THEN** the shared writer guard SHALL reject duplicate writing without starting resident infrastructure or changing the comparison UI into a tab client

##### Scenario: Different session files across profiles
- **WHEN** bare-A1 and Pi-comparison runtimes select distinct unheld session files
- **THEN** both SHALL proceed concurrently without a product-wide foreground lock

## Capability: `cli-session-resume`

### MODIFIED Requirements

#### Requirement: Normal A1 accepts explicit session selection
Stable and prerelease builds SHALL support `a1 --session <path|id>` with an optional `--session-dir <dir>` before or after `--session`. Each option SHALL occur at most once and require a nonempty value. `--session-dir` alone, missing values, duplicate options, unknown trailing options, and extra positional arguments in this recognized grammar SHALL fail with a focused diagnostic and nonzero exit status before supervisor or interactive startup. Help SHALL list the supported forms. With resident tabs disabled, bare `a1` SHALL continue to start a fresh session. With resident tabs enabled, bare `a1` SHALL reattach to the profile's resident tabs, creating one fresh tab only when none exist, and a session launch SHALL open the selected session as a new tab or focus the tab already holding it. Every A1-owned session launch and in-runtime session switch on a supported platform SHALL honor the shared canonical session-writer lease, including direct/fallback launches with resident tabs disabled. A direct conflict SHALL fail safely or offer an explicit fork, not silently attach, overwrite, or start another writer. Failed switches SHALL preserve the old session and its lease; direct lease checks SHALL NOT initialize a resident host.

##### Scenario: Select an existing session by ID
- **WHEN** the user supplies `a1 --session <id>` for a saved A1 session
- **THEN** A1 SHALL execute an interactive session launch rather than return a silent successful no-op

##### Scenario: Supply a custom directory in either order
- **WHEN** the user supplies one valid `--session` and one valid `--session-dir` in either order
- **THEN** both invocations SHALL select the same target and effective session directory

##### Scenario: Malformed session launch
- **WHEN** a recognized session launch has a missing or empty value, duplicate option, unrecognized additional option, extra argument, or no `--session` target
- **THEN** A1 SHALL report one concise error, exit nonzero, and start no supervisor or interactive runtime

##### Scenario: Inspect help without launching
- **WHEN** the user runs `a1 --help` or `a1 -h`
- **THEN** help SHALL include both supported session-selection forms without launching an interactive runtime

##### Scenario: Bare launch with resident tabs running
- **WHEN** resident tabs are enabled, two tabs are running, and the user runs bare `a1`
- **THEN** A1 SHALL show both tabs and SHALL NOT create a third tab

##### Scenario: Session launch with resident tabs running
- **WHEN** resident tabs are enabled and the user runs `a1 --session <id>` for a session no participating writer holds
- **THEN** A1 SHALL acquire its lease, add a tab resuming that session alongside the existing tabs, and activate it

##### Scenario: Disable tabs while a selected session remains live
- **WHEN** the user disables resident tabs and directly selects a session still held by a live tab
- **THEN** direct launch SHALL report the writer conflict without starting another writer or altering the resident session

##### Scenario: Resume an aliased session
- **WHEN** a session selected by ID, path, or filesystem alias resolves to the same held file
- **THEN** admission SHALL consult the same native writer lease rather than create an independent path-string lease

## Capability: `owned-pi-ui-foundation`

### MODIFIED Requirements

#### Requirement: Graceful user quit returns control to the parent shell
The owned interactive UI SHALL treat `/quit` and the second `Ctrl+C` in the existing clear/exit chord as complete graceful-exit requests. Each route SHALL stop the agent session, dispose the owned presentation, restore all terminal modes and screen state owned by A1, terminate the interactive A1 process successfully, and return control to the invoking shell without requiring another signal or keystroke. When the owned UI runs inside a resident tab, the attach client SHALL consume the second `Ctrl+C` of the chord as a local detach request, and `/quit` and `Ctrl+D` SHALL request through the tab bridge that only the client named by the immutable command-origin input-controller revision detach, and only while that revision is current; stale, ambiguous or unavailable attribution SHALL keep the tab process running and direct the user to `Ctrl+C` twice. The tab's agent session and A1 process SHALL keep running, and the detached client SHALL complete terminal restoration and parent-shell return. The built-in quit command's autocomplete description SHALL be exactly `Quit`.

##### Scenario: Quit with the slash command
- **WHEN** the user submits `/quit` from an active owned interactive session
- **THEN** A1 SHALL complete graceful shutdown, restore the terminal, exit successfully, and make the invoking shell prompt available
- **AND** no inactive or blank A1 fullscreen surface SHALL remain

##### Scenario: Quit with the clear/exit chord
- **WHEN** the user presses `Ctrl+C` twice within the existing clear/exit interval
- **THEN** the second press SHALL complete the same graceful shutdown, terminal restoration, successful process exit, and parent-shell return as `/quit`

##### Scenario: Quit inside a resident tab
- **WHEN** the user submits `/quit` or presses `Ctrl+C` twice inside a resident A1 tab
- **THEN** the attach client SHALL restore the terminal and exit successfully, and the tab's agent session SHALL keep running
- **AND** `a1 pi` SHALL continue to stop its single agent session on quit

##### Scenario: Resident tab bridge is unavailable
- **WHEN** a quit route runs inside a resident tab whose bridge is unavailable
- **THEN** A1 SHALL NOT exit the tab process and SHALL show a concise notice that pressing `Ctrl+C` twice leaves

##### Scenario: Quit execution is delayed across control transfer
- **WHEN** a quit command admitted under an old controller executes after control transfers
- **THEN** A1 SHALL reject its stale or ambiguous origin without detaching the new controller or exiting the tab, and SHALL offer attach-local double-`Ctrl+C` as the safe exit route

##### Scenario: An extension retains an event-loop handle
- **WHEN** owned UI cleanup has completed but a loaded extension leaves a server, timer, or comparable event-loop handle active
- **THEN** the interactive A1 executable SHALL preserve completed terminal restoration and configured exit output
- **AND** it SHALL still terminate successfully and return control to the parent shell

##### Scenario: Repository-local quit returns promptly
- **WHEN** a user quits an interactive A1 session launched through the supported repository-local development command
- **THEN** development-only cache persistence SHALL NOT introduce a visible post-restoration pause before the parent-shell prompt appears
- **AND** production compile-cache behavior and completed owned cleanup SHALL remain unchanged

##### Scenario: Describe the quit command
- **WHEN** slash-command autocomplete presents the built-in `quit` command
- **THEN** its description SHALL be `Quit`
- **AND** the description SHALL NOT include `Pi`, `A1`, or another product qualifier

## Capability: `agent-supervision`

### ADDED Requirements

#### Requirement: Cohort updates and retention preserve resident tabs
Cohort update coordination SHALL stop and drain launch instances only. It SHALL NOT terminate the resident terminal-host server, session holders, or tab processes. In this opt-in version a compatible resident cohort remains on its immutable release until all of its tabs stop; automatic server handoff and idle-boundary recycling are deferred. Immutable release retention SHALL treat the recorded release of every live verified resident server, holder, and tab process as current ownership, and SHALL NOT collect that release while any such process uses it. A superseded supervisor cohort SHALL retire according to its own launch-instance work regardless of resident tabs.

##### Scenario: Update with resident tabs running
- **WHEN** an update activates a new release while resident processes run from the previous release
- **THEN** supervision SHALL drain the previous cohort's launch instances without terminating resident processes

##### Scenario: Garbage collection with a tab on an old release
- **WHEN** release cleanup evaluates a release still used by a live verified holder or tab process
- **THEN** that release SHALL be retained until the process is recycled or stopped

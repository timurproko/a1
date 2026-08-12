## Purpose

Defines the cross-platform virtual terminal runtime that hosts Native Pi, interactive shells, Claude Code, Codex, and arbitrary command-line programs while isolating child terminal protocols from the physical terminal and preserving direct-observable behavior.

## ADDED Requirements

### Requirement: AddOne can launch arbitrary commands in isolated terminal sessions
The terminal driver SHALL launch a configured executable with explicit arguments, environment, working directory, terminal type, dimensions, and runtime identity inside a platform PTY. A terminal session SHALL support either an exact direct executable or an interactive shell that can launch successive foreground commands without creating another AddOne PTY for each command.

#### Scenario: Launch a supported native agent
- **WHEN** the user creates a terminal agent using a configured Claude Code, Codex, or Native Pi profile
- **THEN** AddOne SHALL launch the exact configured executable and arguments in an isolated terminal session and present its terminal surface in the selected view

#### Scenario: Launch the initial vanilla Pi profile
- **WHEN** AddOne creates the initial Native Pi generation
- **THEN** it SHALL launch the selected Pi executable in Pi's default interactive mode without forcing an alternate fullscreen interaction mode, deferred v2 migration extension profile, private host bridge, semantic screen scraper, or AddOne rendering substitute for Pi's interface

#### Scenario: Launch an interactive shell session
- **WHEN** the user creates a generic terminal session without a direct command profile
- **THEN** AddOne SHALL start the configured platform shell and allow that shell to run Pi and other CLIs sequentially in the same terminal session

#### Scenario: Foreground command returns to its shell
- **WHEN** a command launched by an interactive shell exits
- **THEN** the existing shell SHALL regain control of the same terminal session without changing the physical host-terminal ownership

### Requirement: Terminal sessions have cross-platform behavioral parity
Terminal session spawn, input, output, resize, screen state, terminal modes, exit, and cleanup behavior required by Native Pi SHALL be release-gated on Windows 11 x64 with system ConPTY, current Ubuntu LTS x64 with a native PTY, and current and previous macOS arm64 with a native PTY. Platform-specific implementations MAY differ internally, but required Native Pi behavior SHALL NOT silently degrade by platform.

#### Scenario: Platform backend is available
- **WHEN** AddOne starts a terminal session on a release-gated platform
- **THEN** it SHALL select the native platform PTY and host-input behavior while exposing the same terminal-session contract to the supervisor and UI

#### Scenario: Required platform behavior is unavailable
- **WHEN** a platform backend cannot provide a Native Pi behavior required by this specification
- **THEN** AddOne SHALL fail the applicable certification or launch with an actionable unsupported-platform result rather than claiming fullscreen parity

### Requirement: Child terminal protocols are isolated from the physical terminal
All child output SHALL terminate in an AddOne-owned virtual terminal. Child requests that change primary or alternate screens, mouse reporting, keyboard enhancement, application cursor or keypad behavior, bracketed paste, focus reporting, synchronized output, line wrapping, cursor state, title, palette, clipboard, or platform console input mode SHALL update virtual session state or an explicitly mediated capability and SHALL NOT be replayed as raw child control sequences against the physical terminal.

#### Scenario: Child enters or leaves its alternate screen
- **WHEN** Native Pi emits an alternate-screen transition
- **THEN** only the virtual terminal's active screen SHALL change and AddOne SHALL render the resulting cells without entering or leaving the AddOne-owned outer screen on the child's behalf

#### Scenario: Child enables mouse or keyboard modes
- **WHEN** a child requests supported mouse tracking, alternate scroll, Kitty keyboard, modifyOtherKeys, bracketed paste, focus, or Win32 input mode
- **THEN** the terminal session SHALL record or mediate the effective child mode without enabling that child-owned mode directly on the physical terminal

#### Scenario: Child emits an unsupported host-affecting control
- **WHEN** a child emits a control sequence that is unsupported or not approved for mediation
- **THEN** AddOne SHALL contain it within the terminal session and SHALL NOT print its payload visibly or pass it through to the parent terminal

### Requirement: Virtual terminal surfaces preserve terminal behavior and presentation
The terminal runtime SHALL preserve visible cells, indexed and truecolor foregrounds and backgrounds, default colors, supported text attributes, Unicode grapheme widths, cursor visibility, shape and position, primary and alternate screens, bounded scrollback, erase and scroll behavior, application modes, and synchronized-output behavior produced by the child terminal.

#### Scenario: Native Pi renders styled content
- **WHEN** Native Pi emits indexed or truecolor cells, backgrounds, text attributes, Unicode graphemes, cursor changes, erase operations, or scroll operations
- **THEN** the AddOne-hosted surface SHALL be visibly equivalent to Native Pi running directly with the same terminal capabilities and dimensions

#### Scenario: Resize a fullscreen terminal
- **WHEN** the outer terminal changes size during the initial fullscreen iteration
- **THEN** the runtime SHALL resize the child PTY and virtual terminal to the complete outer dimensions and publish a matching surface without chrome offsets

#### Scenario: Child uses synchronized output
- **WHEN** the child begins a synchronized-output transaction
- **THEN** AddOne SHALL withhold incomplete visual state and reveal the resulting update without an intermediate blank or partially committed frame

### Requirement: Terminal rendering is application-agnostic and transaction-based
The terminal runtime and host renderer SHALL select behavior only from terminal-session policy, parsed terminal protocols, dimensions, capabilities, virtual state, and host state. They SHALL NOT inspect an executable name, argument vector, environment variable naming a CLI, or visible terminal content to choose projection, mouse fallback, frame boundaries, scrolling, or damage behavior. PTY transport chunks SHALL NOT be treated as visual frames. Explicit synchronized-output boundaries, adjacent same-I/O-turn output, and trailing cursor or mode epilogues SHALL be assembled into generic correlated render transactions, with a bounded application-independent fallback for unsynchronized output.

#### Scenario: Different CLIs produce the same terminal protocol
- **WHEN** Pi, another agent, a shell application, or a deterministic fixture produces the same terminal operation and timing sequence
- **THEN** the terminal core SHALL produce the same virtual state and host render transactions without a CLI-specific branch

#### Scenario: One application commit spans multiple PTY reads
- **WHEN** one visual update is delivered across synchronized content, transport fragments, and trailing cursor or mode writes
- **THEN** AddOne SHALL publish at most one visible host transaction for that source commit rather than exposing each PTY read as a frame

#### Scenario: Unsynchronized application emits a burst
- **WHEN** an application does not use synchronized output and emits adjacent output within one PTY I/O burst
- **THEN** AddOne SHALL coalesce that burst through a bounded generic rule without introducing an application-specific delay or waiting for application text

### Requirement: Physical input is delivered according to effective child terminal state
AddOne SHALL decode physical keyboard, paste, focus, and mouse input into distinct events and encode each accepted event exactly once for the focused terminal session according to its effective application, keyboard, paste, focus, mouse, and alternate-scroll state. Effective state SHALL include state absorbed or represented by a platform PTY transport. Host and child byte representations MAY differ, but the child-observable input and resulting behavior SHALL be equivalent to direct execution.

#### Scenario: Keyboard protocol differs between host and child
- **WHEN** the physical terminal reports a key through one supported keyboard protocol and the child has negotiated another
- **THEN** AddOne SHALL encode one equivalent child key event with its modifiers and press, repeat, or release semantics preserved

#### Scenario: Bracketed paste is active
- **WHEN** the user pastes text while the child has enabled bracketed paste
- **THEN** AddOne SHALL deliver one complete bracketed paste with its UTF-8 content intact and SHALL NOT submit embedded lines as separate key events

#### Scenario: Focus reporting is inactive
- **WHEN** the physical terminal reports a focus change and the child has not enabled focus reporting
- **THEN** AddOne SHALL consume the host event without injecting focus-report bytes into the child

### Requirement: Mouse wheel and arrow-key routing remain distinct
For every physical wheel event, AddOne SHALL first send a protocol-correct mouse report when the effective child state requests mouse reporting; otherwise it SHALL send alternate-scroll input only when the child is on its alternate screen and has enabled alternate scroll; otherwise it SHALL scroll AddOne's virtual terminal viewport. Physical Up and Down keys SHALL remain keyboard events and SHALL never be inferred from wheel input outside the explicit child-requested alternate-scroll case.

#### Scenario: Native Pi requests mouse reporting
- **WHEN** fullscreen Native Pi effectively requests supported mouse reporting and the user rotates the physical wheel over its viewport
- **THEN** AddOne SHALL deliver one correctly encoded wheel report at child-relative coordinates and Native Pi SHALL scroll its transcript without recalling editor history

#### Scenario: Child requests alternate scroll without mouse reporting
- **WHEN** an alternate-screen child has enabled alternate scroll but has not enabled mouse reporting
- **THEN** AddOne SHALL encode the wheel as the corresponding application cursor input for that child

#### Scenario: Normal shell transcript receives wheel input
- **WHEN** a primary-screen shell has not requested mouse reporting
- **THEN** AddOne SHALL scroll retained virtual terminal history without injecting arrow or mouse bytes into the shell

#### Scenario: User presses Up or Down in Pi
- **WHEN** the user presses Up or Down while Native Pi's editor is focused
- **THEN** Native Pi SHALL receive one protocol-correct keyboard event and navigate editor-message history as it does during direct execution

### Requirement: Terminal-generated replies return to the child
When a child queries supported terminal identity, device attributes, cursor position, size, colors, capabilities, keyboard state, or other terminal-owned state, AddOne SHALL return the virtual terminal's ordered protocol response through the child PTY rather than querying or exposing unrelated physical-terminal state.

#### Scenario: Child requests cursor position
- **WHEN** a child emits a supported cursor-position query
- **THEN** the virtual terminal SHALL return its current child-local cursor position through the PTY in output order

#### Scenario: Child requests terminal colors or capabilities
- **WHEN** a child emits a supported color or capability query
- **THEN** AddOne SHALL provide a deterministic response consistent with the terminal capabilities advertised to that child

### Requirement: Generic terminal output is semantically opaque
AddOne SHALL not infer tool execution, model state, settled state, conversation state, or successful work from terminal text or screen position unless a specialized driver supplies that information through an explicit supported channel. Terminal escape parsing required to emulate terminal behavior SHALL NOT be treated as agent-semantic screen parsing.

#### Scenario: Terminal prints success-like text
- **WHEN** a generic terminal displays text containing words such as `done` or `success`
- **THEN** AddOne SHALL not convert that text into a semantic successful-agent status

#### Scenario: Specialized driver reports status
- **WHEN** a specialized terminal driver supplies an authenticated or documented structured status event
- **THEN** AddOne MAY present that status according to the advertised capability without deriving it from screen text

### Requirement: Native Pi provides the full interactive compatibility path
A Native Pi terminal profile SHALL run Pi's normal interactive fullscreen TUI so its editor, shortcuts, mouse interactions, themes, built-in dialogs, custom TUI extensions, editor replacements, and other interactive flows operate under the selected Pi runtime's own compatibility rules. AddOne SHALL publish no application content before Pi's first ready frame, and the hosted path SHALL otherwise be observably equivalent to direct Pi from launch until the parent terminal is restored.

#### Scenario: Compare direct and AddOne-hosted Native Pi
- **WHEN** the same interaction is run with the same absolute Pi executable, arguments including fullscreen mode, environment, terminal capabilities, dimensions, and physical input timeline directly and through AddOne
- **THEN** both paths SHALL produce equivalent recognizable Pi content, cells, styles, cursor, active child screen, input effects, dialogs, resize behavior, timing stability, and process outcome at stable checkpoints

#### Scenario: Pi extension uses a native TUI component
- **WHEN** an enabled Pi extension uses supported native custom components, editor replacement, terminal input, themes, overlays, or dialogs
- **THEN** the component SHALL behave through the Native Pi terminal profile as it does in the same directly launched Pi profile

#### Scenario: Use Pi editor and native dialog
- **WHEN** the user types editor text, opens and interacts with a built-in Pi dialog, and returns to the editor through AddOne
- **THEN** the resulting visible states, focus, cursor, and input effects SHALL be equivalent to the direct run

#### Scenario: Select vanilla Pi text
- **WHEN** the user selects transcript or editor text using the same pointer interaction used with directly launched vanilla Pi
- **THEN** the host terminal SHALL paint the same selection without color inversion differences, AddOne SHALL NOT introduce a selection-copy operation or `Copied!` flash, and the selected text SHALL remain subject to the host terminal's normal copy behavior

#### Scenario: Selected content moves when vanilla Pi appends output
- **WHEN** host-selected vanilla Pi content moves upward because Pi generates additional transcript rows
- **THEN** the selection SHALL remain attached to that content and move with the terminal scroll operation rather than remaining painted at stale viewport coordinates

#### Scenario: Vanilla Pi exposes native terminal scrollback
- **WHEN** default-mode Pi content exceeds the visible viewport
- **THEN** the physical terminal SHALL expose its normal scrollbar and scrollback behavior, with the same content movement and wheel distance as directly launched Pi

#### Scenario: Press Ctrl+C over a host selection
- **WHEN** vanilla Pi editor text is selected by the host terminal and the user presses Ctrl+C
- **THEN** the host terminal SHALL dismiss the selection as in direct Pi and Pi SHALL NOT receive that Ctrl+C or clear the underlying editor text

#### Scenario: Compare rapid editor input
- **WHEN** the same rapid typing burst is sent directly and through AddOne
- **THEN** visible editor updates SHALL remain responsive within the direct run's bounded refresh behavior and SHALL NOT incur an AddOne-specific fixed 50 millisecond delay

#### Scenario: Compare one wheel notch
- **WHEN** the user rotates one wheel notch over a vanilla Pi transcript
- **THEN** direct and AddOne-hosted Pi SHALL move the visible transcript by the same three rows

#### Scenario: Compare the later v2 extension profile
- **WHEN** the same catalogued interaction is run using an exactly identified Pi executable and pinned v2 extension profile directly and through AddOne
- **THEN** AddOne SHALL preserve the extension-owned interface and terminal behavior at stable executable checkpoints without importing its private host bridge

### Requirement: Fullscreen terminal rendering is visibly stable
The fullscreen terminal path SHALL render every supported CLI through the same virtual-terminal and host-rendering pipeline without timer-driven whole-screen repainting, visible clearing between frames, stale overwrites, redundant redraws, transport-chunk frames, or child control-sequence passthrough that is observably different from direct execution. Zero visible partial repaint frames is a release requirement: text, status/footer rows, input rows, and final cursor state belonging to one source commit SHALL become visible together. Native Pi is a mandatory parity workload but SHALL receive no rendering-specific production branch.

The accepted Windows ConPTY baseline SHALL apply cadence-derived transport quiescence after every synchronized source commit, bounded at 32 milliseconds with a 1.75× measured inter-burst margin, and SHALL write the host synchronized-output end boundary only after payload write completion followed by one I/O turn. These values MAY change only when permanent direct-versus-hosted evidence proves zero cursor/mode-only, blank, mixed, stale, shifted, or partial repaint frames under the replacement policy; latency-only optimization SHALL NOT weaken visible atomicity.

#### Scenario: Native Pi streams rapid updates
- **WHEN** Native Pi emits multiple output chunks within one visual refresh interval
- **THEN** AddOne SHALL preserve their order and present the latest committed state without exposing an intermediate blank or stale whole-screen frame

#### Scenario: Terminal is idle
- **WHEN** Native Pi produces no output and no resize or terminal-state change occurs
- **THEN** AddOne SHALL not periodically repaint the unchanged fullscreen surface

#### Scenario: Small region changes
- **WHEN** a Native Pi update changes only part of the visible surface
- **THEN** AddOne SHALL not clear and repaint unrelated unchanged regions in a way visibly distinguishable from direct Pi

#### Scenario: Vanilla Pi appends transcript rows
- **WHEN** default-mode Pi scrolls existing content upward to reveal newly generated rows
- **THEN** AddOne SHALL render one corresponding host scroll operation and only the newly exposed or independently changed rows, without repainting every shifted row or visibly flickering

#### Scenario: Generated content updates a fixed row
- **WHEN** one committed terminal-application update scrolls content and redraws generated text, a fixed footer, progress or status row, and the cursor
- **THEN** AddOne SHALL make the host scroll and all associated damage visible as one AddOne-owned synchronized-output transaction, without exposing an intermediate shifted, blank, stale, or partially redrawn state and without adding a timer-based input delay

#### Scenario: Resize resynchronization moves fixed rows
- **WHEN** a resize or reconnect snapshot moves footer, status, editor, or other fixed rows and their former physical rows are now blank
- **THEN** AddOne SHALL atomically replace those former rows with the snapshot's blank cells and SHALL expose exactly one copy of each fixed row without a stale duplicate, whole-screen flicker, or CLI-specific cleanup

#### Scenario: ConPTY releases one synchronized repaint in delayed bursts
- **WHEN** ConPTY delivers synchronized markers, cursor-hide or mode prefixes, printable cells, footer/input cells, cursor restoration, or the remainder of a large repaint in separate transport bursts
- **THEN** AddOne SHALL retain one pending source transaction through cadence-derived quiescence and SHALL NOT publish a marker-only, cursor-only, mixed old/new, or truncated text frame

#### Scenario: Fifty-question conversation repaint baseline
- **WHEN** the deterministic normal-screen conversation workload submits 50 questions and produces accepted, thinking, generating, and completed states for every question
- **THEN** the hosted path SHALL publish exactly 201 content-bearing conversation transactions, zero cursor/mode-only transactions, keep the status row and input row at their fixed coordinates in every committed outer frame, preserve direct-equivalent final cells and cursor state, and expose no clear, blank, stale, duplicate, mixed, shifted, or partial repaint frame

### Requirement: Terminal exit restores a usable parent terminal
Child process exit and AddOne client exit SHALL be separate lifecycle events. When the initial direct-executable Pi session ends, AddOne SHALL stop input, commit its final virtual state, restore the exact physical input/cursor state, retain default-mode Pi's normal-screen output, scrollback, final cursor position, and line spacing as direct Pi does, restore pre-launch normal-screen content for an explicitly fullscreen alternate projection, and exit with Pi's outcome. Child cleanup sequences SHALL remain virtual and SHALL NOT be relied upon to restore the physical terminal. AddOne SHALL NOT append, remove, redistribute, or otherwise compensate for child-produced spaces or line breaks during normal-screen restoration.

#### Scenario: Pi prints a resume hint with surrounding blank rows
- **WHEN** Native Pi leaves one blank row before and one blank row after its `To resume this session:` message in an otherwise identical direct execution
- **THEN** AddOne-hosted Pi SHALL retain those exact child-produced rows and the parent prompt SHALL begin at the same relative row without an AddOne-generated newline

#### Scenario: Pi prints a resume hint after a full final frame
- **WHEN** Native Pi's direct final TUI occupies the row immediately before `To resume this session:` while retaining a child-produced blank row after it
- **THEN** AddOne-hosted Pi SHALL preserve that adjacency and trailing blank row without inventing preceding whitespace

#### Scenario: Clear and exit with repeated Ctrl+C
- **WHEN** the user invokes Native Pi's repeated Ctrl+C clear-and-exit interaction
- **THEN** Pi SHALL clear and exit as in the direct run, AddOne SHALL restore the pre-launch terminal without a normal-screen clear, and no Pi, AddOne, Win32-input, or terminal-control payload SHALL be visibly printed afterward

#### Scenario: Parent shell resumes after AddOne
- **WHEN** the initial fullscreen AddOne process returns to its parent shell
- **THEN** the user SHALL be able to type text, move through the line, use Backspace and Delete, submit a command, and observe its output exactly as before AddOne launched, with the parent terminal's default cursor shape and visibility restored

#### Scenario: Child exits without cleaning up
- **WHEN** a child crashes while its virtual alternate screen, mouse, keyboard, paste, focus, or cursor modes remain active
- **THEN** AddOne SHALL discard those virtual modes and restore the captured host state without propagating the stale child modes to the parent terminal

### Requirement: Terminal failures are contained
The terminal driver SHALL report spawn errors, exits, signals, and transport failures without terminating the later AddOne shell or unrelated agents.

#### Scenario: Executable is missing
- **WHEN** a configured executable cannot be found or started
- **THEN** the logical agent SHALL enter an actionable error state and sibling agents SHALL remain available

#### Scenario: Child exits with failure
- **WHEN** a terminal child exits with a non-zero status
- **THEN** AddOne SHALL retain the final virtual terminal surface and report the exit status according to the active shell lifecycle policy

### Requirement: Resume guarantees are driver-specific
Each terminal profile SHALL declare whether it supports session discovery and exact resume, best-effort resume, or no resume, and AddOne SHALL present recovery behavior consistent with that declaration.

#### Scenario: Specialized exact resume
- **WHEN** a Native Pi profile records a valid exact session and advertises exact resume
- **THEN** its recovery path SHALL validate and resume that session according to the profile contract

#### Scenario: Generic terminal process is lost
- **WHEN** an opaque generic terminal process exits and has no resume capability
- **THEN** AddOne SHALL report the session as non-recoverable rather than silently launching a fresh process as the same continuous conversation

### Requirement: Terminal views can reconnect to resident virtual state
When a UI client reconnects while a supervised terminal session remains resident, the supervisor SHALL provide its current bounded virtual terminal state before newer ordered updates. Reconnection SHALL NOT replay the child's historical raw control stream against the new physical terminal.

#### Scenario: Restart AddOne UI with live terminal session
- **WHEN** the UI restarts while a terminal agent remains alive under the supervisor
- **THEN** the restored view SHALL display an equivalent resident surface and continue accepting input without restarting the child

#### Scenario: Update arrives during snapshot handoff
- **WHEN** child output changes after the reconnect snapshot boundary but before the UI finishes presenting it
- **THEN** AddOne SHALL apply only later correlated updates or resynchronize on a gap, without duplicating historical child controls

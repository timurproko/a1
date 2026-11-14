## MODIFIED Requirements

### Requirement: Herdr-hosted clipboard operations target the user's terminal

Bare A1 SHALL classify a session with a nonempty `HC_TERMINAL_ID` or `TERM_PROGRAM=herdr` as having a terminal-owned clipboard for text copy, regardless of SSH markers or native clipboard availability. A nonempty Herdr terminal identity SHALL retain this classification when `TERM_PROGRAM` names another emulator or is absent. Owned text-copy operations SHALL use the existing bounded terminal clipboard route and SHALL NOT write the agent host's native or platform clipboard instead of, or in addition to, that route. Terminal submission SHALL retain its unverified delivery classification. Existing non-Herdr destination decisions, payload limits, cancellation, ordering, and comparison-profile behavior SHALL remain unchanged.

Paste acquisition SHALL have an independent policy rather than using the text-copy destination as a complete read-access decision. Nonempty terminal-provided paste SHALL retain its existing exactly-once payload handling without a redundant native clipboard read. Supplied image-file paths SHALL use their destination-side file preparation route without native clipboard acquisition. A failure to prepare supplied content SHALL NOT trigger host-clipboard acquisition. Explicit injected clipboard ports SHALL retain their existing precedence, predecessor, and cancellation contract.

For an owned raw Herdr paste gesture without supplied content or an explicit clipboard port, A1 SHALL refuse native acquisition when a conventional SSH, WSL, tmux, or screen marker applies. Otherwise A1 SHALL permit image-only acquisition from the process host through its existing isolated helper, without native text or file-drop fallback. This raw-gesture exception SHALL NOT be described as proof of viewer locality: a markerless remote raw gesture can read the process host's image, whereas supplied remote image paths and text SHALL never use that exception. The raw exception SHALL require no setting and SHALL NOT alter copy routing. A non-Herdr local paste SHALL retain full native image/file/text acquisition.

#### Scenario: Copy from a remote Herdr session without SSH markers

- **WHEN** a reader copies selected text in a Herdr-hosted A1 session on another machine without SSH environment markers
- **THEN** A1 SHALL submit the complete selected payload once through the user's terminal clipboard route
- **AND** SHALL NOT write the agent host's clipboard even if that native writer would succeed

#### Scenario: Herdr identity survives emulator metadata changes

- **WHEN** a session has a nonempty `HC_TERMINAL_ID` and `TERM_PROGRAM` is absent or names another emulator
- **THEN** owned copy SHALL use the terminal clipboard route
- **AND** SHALL NOT require `TERM_PROGRAM=herdr` or an SSH marker

#### Scenario: Herdr terminal-program marker identifies the route independently

- **WHEN** `TERM_PROGRAM=herdr` and no nonempty `HC_TERMINAL_ID` is available
- **THEN** owned copy SHALL still use the terminal clipboard route instead of the host-native clipboard

#### Scenario: Empty or unrelated metadata preserves ordinary routing

- **WHEN** Herdr identity values are empty or absent, the terminal-program marker is unrelated, and no existing remote or multiplexer marker applies
- **THEN** A1 SHALL preserve its existing local native clipboard route

#### Scenario: Selection autocopy and explicit copy share the destination

- **WHEN** a reader completes an autocopied selection or explicitly copies a selection in a Herdr-hosted session
- **THEN** each admitted copy SHALL use the shared terminal-owned destination policy
- **AND** SHALL preserve its existing selected-text payload and bounded delivery behavior

#### Scenario: An unavailable terminal writer does not select a different host

- **WHEN** the terminal clipboard route is unavailable for a Herdr-hosted copy
- **THEN** A1 SHALL retain its existing recoverable failure behavior
- **AND** SHALL NOT substitute a successful write to the agent host's unrelated clipboard

#### Scenario: Herdr supplies the paste text

- **WHEN** Herdr sends a nonempty bracketed-paste payload to A1
- **THEN** A1 SHALL insert or prepare that supplied text exactly once through its established paste path
- **AND** SHALL NOT reread the agent host's native clipboard

#### Scenario: A raw paste gesture cannot acquire the remote host clipboard

- **WHEN** A1 receives an owned raw Herdr paste gesture and a conventional SSH, WSL, tmux, or screen marker applies
- **THEN** A1 SHALL refuse host-native acquisition
- **AND** terminal-provided paste SHALL remain supported

#### Scenario: A local Herdr screenshot uses isolated image-only acquisition

- **WHEN** a raw paste gesture reaches a local Herdr A1 session without supplied content, a provided clipboard port, or conventional remote/multiplexer markers
- **THEN** A1 SHALL acquire the host clipboard's image through its isolated helper and prepare one usable image chip
- **AND** SHALL NOT acquire native text or file-drop fallback content in that image-only mode

#### Scenario: A markerless remote raw gesture is not a locality guarantee

- **WHEN** a remote Herdr viewer sends a raw paste gesture with no supplied content and the agent has no conventional remote/multiplexer markers
- **THEN** the same image-only host acquisition policy SHALL apply
- **AND** A1 SHALL NOT claim that it has verified the clipboard belongs to that viewer

#### Scenario: Supplied content failure does not become a host read

- **WHEN** supplied text or a supplied image path fails preparation or validation
- **THEN** A1 SHALL preserve recoverable preparation failure behavior without attempting native host acquisition

#### Scenario: Raw Herdr paste has no image representation

- **WHEN** image-only host acquisition finds no supported image representation
- **THEN** A1 SHALL leave unrelated draft content unchanged and report “Couldn’t paste screenshot—try again.” without falling back to native text or file-drop contents

## ADDED Requirements

### Requirement: Herdr-hosted clipboard operations target the user's terminal

Bare A1 SHALL classify a session with a nonempty `HC_TERMINAL_ID` or `TERM_PROGRAM=herdr` as having a terminal-owned clipboard, regardless of SSH markers or native clipboard availability. A nonempty Herdr terminal identity SHALL retain this classification when `TERM_PROGRAM` names another emulator or is absent. Owned text-copy operations SHALL use the existing bounded terminal clipboard route and SHALL NOT write the agent host's native or platform clipboard instead of, or in addition to, that route. Terminal submission SHALL retain its unverified delivery classification. Existing non-Herdr destination decisions, payload limits, cancellation, ordering, and comparison-profile behavior SHALL remain unchanged.

The shared paste policy SHALL NOT read an unrelated host-native clipboard for a Herdr-hosted session. Nonempty terminal-provided paste SHALL retain its existing exactly-once payload handling without a redundant native clipboard read. Explicit injected clipboard ports SHALL retain their existing contract.

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

- **WHEN** A1 receives an owned paste gesture in a Herdr-hosted session without supplied clipboard text or an explicit clipboard port
- **THEN** A1 SHALL retain unavailable-native-paste behavior rather than read the agent host's clipboard
- **AND** terminal-provided paste SHALL remain supported

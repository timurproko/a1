## MODIFIED Requirements

### Requirement: Completed compactions participate in ordinary prompt navigation

While the custom transcript owns prompt-navigation input, Ctrl+Shift+Up and Ctrl+Shift+Down SHALL navigate one shared chronological sequence of submitted prompts and completed compactions. Existing previous/next source targeting, document-opening behavior, and movement past the newest anchor to the live bottom SHALL remain in effect. Navigation SHALL NOT submit, recall into the editor, or rewrite a compaction as a user prompt. Shift-only and Ctrl-only Up/Down SHALL NOT invoke transcript prompt jumps. Shortcut help SHALL advertise the effective Ctrl+Shift chords, and supported terminal encodings SHALL preserve exact modifier ownership. The independent `a1 pi` comparison route SHALL retain its existing behavior.

#### Scenario: Navigate a mixed transcript in both directions
- **WHEN** the reader uses Ctrl+Shift+Up and Ctrl+Shift+Down through a transcript containing user prompts, assistant/tool output, and multiple completed compactions
- **THEN** the navigation SHALL visit prompts and compactions in document order without skipping compactions or stopping on assistant/tool output
- **AND** each compaction target SHALL expose its full source block just like an ordinary prompt target
- **AND** the editor draft SHALL remain unchanged

#### Scenario: Navigate sequence boundaries
- **WHEN** the reader navigates backward beyond the earliest anchor or forward beyond the newest anchor
- **THEN** backward navigation SHALL retain the document-opening position and forward navigation SHALL return to the live bottom using the existing prompt boundary behavior

#### Scenario: Preserve focused input ownership
- **WHEN** a selector, modal, overlay, or replacement editor owns an input event
- **THEN** compaction navigation SHALL NOT steal that event

#### Scenario: Do not jump on former shortcut aliases
- **WHEN** the transcript receives Shift+Up/Down or Ctrl+Up/Down without both Ctrl and Shift
- **THEN** it SHALL NOT perform a prompt or completed-compaction jump
- **AND** ordinary editor behavior SHALL remain owned by its effective editing bindings

## ADDED Requirements

### Requirement: Persistent prompt history is a declared bare-A1 editor replacement
Bare A1 SHALL declare enabled persistent prompt history as a replacement for the pinned editor's current-session history source, duplicate policy, recalled-entry caret placement, and browsing border presentation. That replacement SHALL follow the `persistent-prompt-history` capability and SHALL NOT change other editor, submission, transcript, viewport, extension, or session behavior. The `a1 pi` comparison SHALL keep pinned current-session history semantics and SHALL NOT initialize A1's durable-history storage or presentation. When persistence is disabled, bare A1 SHALL retain existing current-session recall without the persistent-history replacement.

#### Scenario: Browse saved history in bare A1
- **WHEN** the user starts bare A1 with persistence enabled and recalls a prior-session prompt
- **THEN** the declared replacement SHALL provide v2-style global unique recall, directional caret placement, and the history border indicator
- **AND** it SHALL keep draft restoration and existing local input recovery reachable

#### Scenario: Compare against pinned Pi
- **WHEN** `a1 pi` is launched with A1 history files present
- **THEN** its history ordering, adjacent-duplicate handling, navigation placement, and ordinary border SHALL match pinned Pi
- **AND** A1 history files, workers, polling, settings effects, and cross-session recall SHALL remain unused

#### Scenario: Evaluate the replacement boundary
- **WHEN** independent parity and v2 behavior evidence are evaluated
- **THEN** only the history differences named by this declaration SHALL be classified as expected bare-A1 customization
- **AND** multiline cursor movement, autocomplete, selection, undo, prompt execution, suggestions, viewport behavior, and unrelated surfaces SHALL retain their existing contracts

#### Scenario: Disable persistence
- **WHEN** bare A1 starts with history persistence disabled
- **THEN** current-session prompt recall and recovery SHALL remain available without loading prior-session durable entries
- **AND** no persistent-history indicator or directional-caret replacement SHALL be applied

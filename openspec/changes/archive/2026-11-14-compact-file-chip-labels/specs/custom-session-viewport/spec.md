## ADDED Requirements

### Requirement: Attachment chip labels omit internal identity metadata

Bare A1 SHALL present file, folder, and filename-bearing image chips using their attachment icon immediately followed by the basename, with no inserted space, parent path, or internal identity/hash suffix. This presentation SHALL apply consistently to the live editor, queued input, and submitted user prompts, including supported legacy chip labels. Literal filename punctuation and spaces SHALL remain part of the filename.

The compact presentation SHALL NOT rewrite source chip identities, backing paths, durable image payload keys, collision distinctions, history persistence, copy expansion, or model-facing submission values. Same-basename attachments SHALL remain independently resolvable. Atomic editing, cursor and selection mapping, width-bounded wrapping, and the pinned Pi comparison route SHALL retain their existing semantics.

#### Scenario: Pasted file displays only its compact name

- **WHEN** a pasted file chip retains a full path or identity suffix internally
- **THEN** its visible label SHALL contain only the attachment icon immediately followed by its basename inside the chip framing
- **AND** copying or submitting it SHALL retain the original resolved value

#### Scenario: Duplicate basenames retain independent identity

- **WHEN** two attachments have the same basename but different backing paths or image payload keys
- **THEN** both SHALL use compact filename labels without exposing identity metadata
- **AND** each occurrence SHALL resolve to its own original backing value

#### Scenario: Legacy image labels remain functional

- **WHEN** a supported existing filename-bearing image tag is recalled from history
- **THEN** the UI SHALL hide its identity suffix and icon separator
- **AND** its durable image payload key SHALL remain available for rehydration

#### Scenario: Compact labels preserve geometry

- **WHEN** a user navigates, selects, or deletes a compact chip, or the chip wraps in a queued or submitted prompt
- **THEN** source/display mapping SHALL preserve atomic editing and width-bounded presentation without exposing hidden metadata

## ADDED Requirements

### Requirement: Input and drawing units keep one concern each
The session viewport SHALL route keyboard shortcuts itself and SHALL delegate pointer gestures to one collaborator that owns every gesture latch. Transcript frame composition SHALL run as named phases, with row painting and its caches owned by one collaborator. Bracketed paste SHALL be assembled by one framer shared by every editor paste path. The settings model dialog SHALL live outside the settings screen.

#### Scenario: A pointer gesture crosses surfaces
- **WHEN** the user presses on the scrollbar rail, drags over the transcript and releases over the editor
- **THEN** the gesture SHALL stay latched to the rail until release
- **AND** the transcript selection and the editor SHALL receive no part of it

#### Scenario: A bracketed paste arrives in pieces
- **WHEN** the terminal delivers a bracketed paste whose end marker is split across two input chunks, with typed text before and after it
- **THEN** the editor SHALL receive the typed text before the paste, then the whole pasted text once, then the typed text after it
- **AND** when paste is disabled, the typed text SHALL still reach the editor and the pasted text SHALL be dropped

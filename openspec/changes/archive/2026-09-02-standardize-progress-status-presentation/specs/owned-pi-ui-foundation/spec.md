## ADDED Requirements

### Requirement: Bare A1 progress indicators use the shared component presentation
Bare A1 SHALL present every built-in working, retrying, and compacting state and every extension-provided working state through the shared spinner-backed progress-text rule. The visible labels SHALL therefore use exactly three ASCII periods (`...`) while preserving each state's semantic wording, spinner frames and cadence, color, placement, replacement behavior, and lifecycle. This SHALL be a declared bare-A1 presentation difference and SHALL NOT alter the regular `a1 pi` route, vanilla Pi, installed Pi packages, or source-synchronized Pi components.

#### Scenario: Move between built-in progress states
- **WHEN** a run moves among working, retrying, and compacting states
- **THEN** bare A1 SHALL show `Working...`, `Retrying...`, or `Compacting...` beside the active spinner
- **AND** no state transition SHALL display a Unicode ellipsis or require state-specific punctuation logic

#### Scenario: Present an extension working message
- **WHEN** an extension supplies `Indexing sources` as the active working message
- **THEN** the shared spinner-backed status surface SHALL display `Indexing sources...`
- **AND** clearing or replacing the extension message SHALL retain the existing lifecycle and restoration behavior

#### Scenario: Preserve status presentation other than punctuation
- **WHEN** the component canonicalizes a built-in or extension progress message
- **THEN** the spinner animation, theme roles, row geometry, prompt-relative position, replacement timing, and terminal cleanup SHALL remain unchanged

#### Scenario: Use a comparison or upstream route
- **WHEN** the same session is run through `a1 pi` or vanilla Pi
- **THEN** that route's status text and component implementation SHALL remain untouched

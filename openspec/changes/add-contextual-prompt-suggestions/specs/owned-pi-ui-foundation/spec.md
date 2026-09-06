## ADDED Requirements

### Requirement: Contextual prompt suggestions are a declared bare-A1 addition
Contextual prompt suggestions SHALL be classified as an A1-owned addition to the ordinary editor in bare A1. The addition SHALL preserve the existing transcript, dock, editor, autocomplete, extension, input-responsiveness, lifecycle, and terminal-restoration contracts except for the explicitly declared empty-editor ghost text and its acceptance behavior. The explicit `a1 pi` comparison route and untouched pinned Pi SHALL remain unchanged and SHALL not perform suggestion requests on A1's behalf.

#### Scenario: Use contextual suggestions in bare A1
- **WHEN** bare A1 is running and contextual suggestion requirements make a suggestion visible
- **THEN** the owned editor SHALL present and accept the declared ghost-text addition
- **AND** all unaffected shell surfaces and interactions SHALL retain their existing behavior

#### Scenario: Run the comparison profile
- **WHEN** the user runs `a1 pi`
- **THEN** A1's contextual suggestion generation, state, rendering, and key interception SHALL be absent
- **AND** the selected upstream Pi experience SHALL remain untouched

#### Scenario: Type while suggestion generation is pending
- **WHEN** keyboard input arrives while an asynchronous suggestion request is pending before or after run settlement
- **THEN** the input SHALL retain the immediate current-state presentation guarantees
- **AND** suggestion generation SHALL not add a pending presentation or synchronous event batch ahead of that input

#### Scenario: Settle while a suggestion is prepared
- **WHEN** background generation has prepared a valid suggestion before the agent run settles
- **THEN** settlement SHALL clear the ordinary working state as before and make the complete suggestion eligible in the same presentation cycle
- **AND** no retained working indicator, generation-status row, or staged text animation SHALL extend the run's visible busy state

#### Scenario: Use an extension-provided editor or autocomplete provider
- **WHEN** an extension replaces the editor or provides an active autocomplete result
- **THEN** the extension surface SHALL retain its existing rendering and input ownership
- **AND** the contextual suggestion addition SHALL neither paint into nor intercept input from that surface

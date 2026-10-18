# Spec Delta

## ADDED Requirements

### Requirement: Resident clipboard delivery reaches the active user's standard clipboard

Resident A1 SHALL preserve the same standard-clipboard result as direct solo A1 for every admitted copy from the viewed tab. A valid bounded clipboard effect from the viewed child SHALL be forwarded exactly once to the outer terminal even when the child process cannot identify that route from Node TTY metadata. Clipboard effects from hidden, stale, switched-away, detached, failed, or replaced child revisions SHALL NOT change the user's clipboard. Internal route failures SHALL NOT be rendered into the child session as clipboard-unavailable status, warning, error, or notice text.

#### Scenario: Viewed tab copies selected text
- **WHEN** the active resident child admits automatic or explicit selection copy
- **THEN** the selected payload SHALL reach the outer user's standard clipboard exactly once
- **AND** resident transport SHALL NOT expose the control as visible cells or diagnostic content

#### Scenario: Process TTY classification hides the resident route
- **WHEN** a viewed child runs behind a pseudoterminal or pipe whose Node `stdout` metadata does not advertise asynchronous terminal output
- **THEN** the owned terminal-host contract SHALL still expose the certified clipboard submission route
- **AND** the triggering copy SHALL NOT fall back to a generic unavailable result

#### Scenario: Tab visibility changes during copy
- **WHEN** a clipboard effect belongs to a child revision that is hidden, switched away, detached, failed, or replaced before delivery authority is established
- **THEN** resident fencing SHALL refuse that stale effect
- **AND** SHALL NOT duplicate it when another tab becomes visible

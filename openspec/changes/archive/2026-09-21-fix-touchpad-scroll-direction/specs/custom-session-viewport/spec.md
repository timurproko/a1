## ADDED Requirements

### Requirement: Touchpad transcript scrolling remains directionally stable
Bare A1 SHALL move the transcript only for vertical wheel input and in the direction reported by that input. Horizontal wheel reports interleaved by a touchpad SHALL NOT move the transcript, change follow state, or activate viewport controls.

#### Scenario: Scroll downward with diagonal touchpad noise
- **WHEN** downward vertical wheel reports are interleaved with horizontal wheel reports over exposed transcript content
- **THEN** the transcript SHALL move only downward by the configured distance for each vertical report
- **AND** the horizontal reports SHALL NOT move the transcript in either direction

#### Scenario: Scroll upward with diagonal touchpad noise
- **WHEN** upward vertical wheel reports are interleaved with horizontal wheel reports over exposed transcript content
- **THEN** the transcript SHALL move only upward by the configured distance for each vertical report
- **AND** the horizontal reports SHALL NOT change end-following or viewport-control state

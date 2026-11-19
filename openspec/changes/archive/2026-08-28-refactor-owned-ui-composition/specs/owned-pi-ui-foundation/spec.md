## ADDED Requirements

### Requirement: Session viewport interaction has a focused owner
The Pi-backed owned shell SHALL keep custom-viewport interaction state and input policy in a focused viewport controller separate from the shell root that composes transcript document and dock rows. The extraction SHALL preserve the accepted bare-A1 frame, follow/detach behavior, prompt navigation, scrollbar, pointer selection, copy, editor pointer handling, modal bypass, resize, and terminal-restoration behavior. The pinned comparison path SHALL remain unchanged.

#### Scenario: Render bare A1 after extraction
- **WHEN** bare A1 renders the custom session viewport for the same session, terminal, theme, and settings state
- **THEN** the complete frame and hit regions SHALL remain the accepted custom-viewport result
- **AND** the viewport controller SHALL own the interaction state used to produce it

#### Scenario: Route input after extraction
- **WHEN** the viewport receives wheel, pointer, transcript-copy, prompt-navigation, editor, or unrelated keyboard input
- **THEN** its consume/transform result and resulting state SHALL remain unchanged
- **AND** unrelated input SHALL still reach the focused Pi surface

#### Scenario: Use the pinned comparison profile
- **WHEN** the same shell runs without the custom viewport
- **THEN** the pinned root/layout and input behavior SHALL remain unchanged
- **AND** the extracted viewport controller SHALL not claim pinned-profile interaction

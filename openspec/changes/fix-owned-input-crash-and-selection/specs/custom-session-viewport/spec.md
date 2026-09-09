## ADDED Requirements

### Requirement: Bare A1 retains selection ownership when content is not selectable
On the default bare-A1 screen, a pointer sequence that cannot begin an A1 transcript or editor selection SHALL NOT fall through to the underlying fullscreen runtime's selection or copy behavior. A sequence begun on an empty or otherwise non-selectable region SHALL remain suppressed through motion and release, including when selectable content arrives during the drag. Suppression SHALL prevent fallback selection painting, clipboard writes, and fallback copy notifications without suppressing unrelated keyboard input. Active modal and replacement surfaces SHALL retain their existing pointer ownership; the pinned comparison profile SHALL retain its existing selection behavior.

#### Scenario: Drag in an empty session
- **WHEN** the user presses, drags, and releases the left mouse button in an empty bare-A1 transcript
- **THEN** no white fullscreen selection SHALL appear
- **AND** no clipboard write or fallback `Copied!` notification SHALL occur
- **AND** the editor SHALL remain focused and usable

#### Scenario: Content arrives during a suppressed drag
- **WHEN** a drag begins without selectable content and a transcript update arrives before release
- **THEN** the whole drag SHALL remain suppressed rather than turning into A1 or fallback selection
- **AND** a subsequent fresh drag on selectable content SHALL use A1 selection normally

#### Scenario: Reports arrive in mixed input chunks
- **WHEN** pointer reports from a suppressed sequence share an input chunk with keyboard bytes
- **THEN** only the owned pointer reports SHALL be consumed
- **AND** keyboard input SHALL be delivered exactly once and in order

#### Scenario: Session is cleared during pointer interaction
- **WHEN** a session is reset, replaced, or emptied during pointer interaction
- **THEN** stale pointer-selection state SHALL be cleared
- **AND** subsequent empty-surface reports SHALL not activate fallback selection or copy

#### Scenario: Select actual transcript or editor content
- **WHEN** a fresh pointer sequence targets selectable transcript or editor text
- **THEN** existing A1 selection endpoints, dark-blue transcript highlighting, copy shortcuts, and editor behavior SHALL remain unchanged
- **AND** scrollbar, wheel, navigation, and link interactions SHALL retain their declared behavior

#### Scenario: Modal or replacement surface owns the pointer
- **WHEN** an overlay, dialog, settings surface, or replacement editor owns input
- **THEN** empty-transcript suppression SHALL not intercept that surface's valid pointer actions

#### Scenario: Use the comparison profile
- **WHEN** the user launches `a1 pi` and uses fullscreen selection
- **THEN** the comparison profile SHALL retain its pinned selection and copy behavior without the bare-A1 suppression policy

## ADDED Requirements

### Requirement: Settings section jumps use Ctrl+Shift arrows

Bare A1 Settings SHALL bind previous-section navigation to Ctrl+Shift+Up and next-section navigation to Ctrl+Shift+Down. Active shortcut hints and help SHALL describe those effective chords. Supported terminal encodings SHALL invoke the same section-jump behavior without treating Shift-only, Ctrl-only, or additionally modified arrows as the new chord. Ordinary row navigation, search editing, boundary jumps, modal ownership, and existing section ordering SHALL remain unchanged.

#### Scenario: Jump between Settings sections
- **WHEN** Settings owns a Ctrl+Shift+Up or Ctrl+Shift+Down event
- **THEN** it SHALL move to the previous or next section using the existing section targeting and boundary rules
- **AND** its active hint SHALL advertise Ctrl+Shift+Up/Down rather than Shift+Up/Down

#### Scenario: Do not jump on the former shortcut
- **WHEN** Settings receives Shift+Up or Shift+Down
- **THEN** it SHALL NOT perform a section jump

#### Scenario: Preserve modal ownership
- **WHEN** a Settings modal or value editor owns an arrow event
- **THEN** section navigation SHALL NOT steal that event

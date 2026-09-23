## ADDED Requirements

### Requirement: Modal frames place titles directly below their top rule

The component layer SHALL provide reusable modal-frame chrome whose title row immediately follows its top rule. A titled modal SHALL NOT render an empty row between that rule and the title, and an individual modal producer SHALL NOT recreate top-title spacing outside the shared frame boundary. The frame MAY retain separately declared spacing after the title and elsewhere in its body.

Removing the top-title gap SHALL remove exactly one rendered row while preserving title styling and horizontal placement, body insets, shortcut placement, lower chrome, clipping, and wrapping. Untitled or extension-owned custom surfaces SHALL remain unchanged rather than receiving an inferred title or having rendered blank rows removed heuristically.

#### Scenario: Render a titled modal frame

- **WHEN** a modal frame renders a top rule and a title
- **THEN** the title SHALL be the next rendered row after the rule
- **AND** there SHALL be no empty row between them

#### Scenario: Preserve spacing below the title

- **WHEN** a modal declares separation between its title and body
- **THEN** that separation SHALL remain below the title
- **AND** removing the top-title gap SHALL NOT compact body sections or shortcut chrome

#### Scenario: Render an untitled custom surface

- **WHEN** a modal-like surface has no A1-authored title or owns its own extension-provided geometry
- **THEN** the shared frame policy SHALL NOT infer a title or remove a row by inspecting rendered text

#### Scenario: Resize a compact modal

- **WHEN** a titled modal is rendered at a narrow width or after a terminal resize
- **THEN** top-rule/title adjacency SHALL remain in effect
- **AND** title styling, horizontal inset, clipping, wrapping, and content geometry SHALL otherwise follow the modal's existing policy

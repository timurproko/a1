## ADDED Requirements

### Requirement: Modal frames place titles directly below their top rule

The component layer SHALL provide reusable modal-frame chrome whose title row immediately follows its top rule. A titled modal SHALL NOT render an empty row between that rule and the title, and an individual modal producer SHALL NOT recreate top-title spacing outside the shared frame boundary. The frame MAY retain separately declared spacing after the title and elsewhere in its body.

The same frame SHALL give every semantic content row a one-cell global left inset while rendering its top, bottom, and explicitly declared separator rules at full width. Titles, search/input components, selectable content, descriptions, status rows, and shortcut rows SHALL inherit that outer inset from the frame rather than independently encoding it. Existing row-authored spaces MAY express relative indentation inside the content area. Child components SHALL render against the reduced content width so clipping, wrapping, carets, and pointer geometry agree with the visible inset.

Removing the top-title gap SHALL remove exactly one rendered row while preserving title styling, relative body indentation, lower chrome, and vertical spacing. Unframed or extension-owned custom surfaces SHALL remain unchanged rather than receiving inferred semantic slots or having rendered rows rewritten heuristically.

#### Scenario: Render a titled modal frame

- **WHEN** a modal frame renders a top rule and a title
- **THEN** the title SHALL be the next rendered row after the rule
- **AND** there SHALL be no empty row between them

#### Scenario: Inset modal content

- **WHEN** a modal frame renders its title, input, list rows, descriptions, status, and shortcuts
- **THEN** each semantic content row SHALL begin within the frame's one-cell global left inset
- **AND** relative indentation authored inside those rows SHALL remain relative to that inset

#### Scenario: Keep rules full width

- **WHEN** a padded modal frame renders a top, bottom, or declared separator rule
- **THEN** that rule SHALL continue to occupy the frame width
- **AND** the content inset SHALL NOT shorten or shift it

#### Scenario: Preserve spacing below the title

- **WHEN** a modal declares separation between its title and body
- **THEN** that separation SHALL remain below the title
- **AND** removing the top-title gap and applying the global inset SHALL NOT compact body sections or shortcut chrome

#### Scenario: Render an untitled custom surface

- **WHEN** a modal-like surface has no A1-authored title or owns its own extension-provided geometry
- **THEN** the shared frame policy SHALL NOT infer a title or remove a row by inspecting rendered text

#### Scenario: Resize a compact modal

- **WHEN** a titled modal is rendered at a narrow width or after a terminal resize
- **THEN** top-rule/title adjacency and the one-cell global content inset SHALL remain in effect
- **AND** child content SHALL receive the reduced width so title styling, clipping, wrapping, caret placement, and pointer geometry remain coherent

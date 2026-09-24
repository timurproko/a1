## ADDED Requirements

### Requirement: Bare-A1 titled modals use compact shared top chrome

Every A1-authored framed modal reachable in the bare-A1 modal transition graph SHALL use the shared modal-frame boundary, SHALL render its title directly beneath its top rule when titled, and SHALL place all semantic content within the frame's one-cell global left inset. This SHALL cover top-level, nested, startup, authentication, and extension-hosted modal families rather than only the dialog that exposed the inconsistency. New applicable bare-A1 modal producers SHALL adopt the same component boundary instead of independently composing a top spacer or outer content indent.

Top, bottom, and declared separator rules SHALL remain full width. The change SHALL preserve modal wording and controller behavior, relative list/form/description indentation, spacing below the title, focus, navigation, editing, completion, cancellation, nesting, resize, pointer ownership, restoration, and disposal. The explicit `a1 pi` comparison profile SHALL continue to construct and render the pinned modal presentation unchanged.

#### Scenario: Open any titled bare-A1 modal

- **WHEN** a user opens an A1-authored titled modal in bare A1
- **THEN** its top rule SHALL be followed immediately by its title
- **AND** its title and remaining semantic content SHALL use the shared one-cell global left inset
- **AND** the modal SHALL receive both dimensions from the shared modal-frame boundary

#### Scenario: Traverse a nested modal flow

- **WHEN** a user moves between parent, confirmation, input, editor, or authentication modal states
- **THEN** every titled A1-authored state SHALL omit the empty row above its title
- **AND** every A1-authored framed state SHALL apply the same global content inset while retaining full-width rules
- **AND** completion, back, cancellation, focus restoration, and disposal SHALL remain unchanged

#### Scenario: Present an untitled framed modal

- **WHEN** an A1-authored framed modal has no title
- **THEN** its body content SHALL still use the shared one-cell global left inset
- **AND** its rules and vertical spacing SHALL remain intact

#### Scenario: Present an extension-owned custom surface

- **WHEN** an inventoried modal node supplies extension-owned custom geometry rather than A1-authored frame slots
- **THEN** it SHALL retain that geometry
- **AND** inventory coverage SHALL record why the shared frame rule does not apply

#### Scenario: Use the pinned comparison profile

- **WHEN** the equivalent modal is opened through `a1 pi`
- **THEN** the pinned component and its spacing SHALL remain unchanged
- **AND** no bare-A1 compact-frame adapter SHALL alter its output

#### Scenario: Add a titled bare-A1 modal

- **WHEN** source or inventory coverage discovers a new A1-authored titled modal producer
- **THEN** validation SHALL require it to use the shared compact padded frame
- **AND** a producer that independently restores a top-title spacer or outer content inset SHALL fail the coverage gate

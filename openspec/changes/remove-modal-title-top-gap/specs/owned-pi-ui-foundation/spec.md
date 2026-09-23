## ADDED Requirements

### Requirement: Bare-A1 titled modals use compact shared top chrome

Every A1-authored titled modal reachable in the bare-A1 modal transition graph SHALL use the shared modal-frame boundary and SHALL render its title directly beneath its top rule without an intervening empty row. This SHALL cover top-level, nested, startup, authentication, and extension-hosted modal families rather than only the dialog that exposed the inconsistency. New applicable bare-A1 modal producers SHALL adopt the same component boundary instead of independently composing a top spacer.

The change SHALL preserve modal content and controller behavior, title and shortcut horizontal alignment, spacing below the title, focus, navigation, editing, completion, cancellation, nesting, resize, pointer ownership, restoration, and disposal. The explicit `a1 pi` comparison profile SHALL continue to construct and render the pinned modal presentation unchanged.

#### Scenario: Open any titled bare-A1 modal

- **WHEN** a user opens an A1-authored titled modal in bare A1
- **THEN** its top rule SHALL be followed immediately by its title
- **AND** the modal SHALL receive that geometry from the shared modal-frame boundary

#### Scenario: Traverse a nested modal flow

- **WHEN** a user moves between parent, confirmation, input, editor, or authentication modal states
- **THEN** every titled A1-authored state SHALL omit the empty row above its title
- **AND** completion, back, cancellation, focus restoration, and disposal SHALL remain unchanged

#### Scenario: Present an untitled or extension-owned custom surface

- **WHEN** an inventoried modal node has no A1-authored title or supplies extension-owned custom geometry
- **THEN** it SHALL retain that geometry
- **AND** inventory coverage SHALL record why the shared titled-frame rule does not apply

#### Scenario: Use the pinned comparison profile

- **WHEN** the equivalent modal is opened through `a1 pi`
- **THEN** the pinned component and its spacing SHALL remain unchanged
- **AND** no bare-A1 compact-frame adapter SHALL alter its output

#### Scenario: Add a titled bare-A1 modal

- **WHEN** source or inventory coverage discovers a new A1-authored titled modal producer
- **THEN** validation SHALL require it to use the shared compact frame
- **AND** a producer that independently restores a top-title spacer SHALL fail the coverage gate

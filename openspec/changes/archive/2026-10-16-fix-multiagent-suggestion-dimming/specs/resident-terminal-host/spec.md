## ADDED Requirements

### Requirement: Resident frame composition preserves terminal intensity

The resident terminal host SHALL preserve each unselected cell's bold and faint intensity when it composes retained libghostty state into an initial paint, patch, full repaint, or reattached surface. A style transition from faint content to ordinary content SHALL clear faint intensity before the ordinary cells are emitted. Host-owned selected-cell presentation MAY replace child intensity with its uniform selection style, but SHALL NOT leak that replacement or a prior faint attribute into following unselected cells.

#### Scenario: Contextual suggestion is repainted through a resident tab

- **WHEN** the bare-A1 editor emits an unaccepted contextual suggestion using faint ghost-text styling through a resident tab
- **THEN** the attached terminal SHALL display the suggestion with faint intensity rather than ordinary white prompt-text intensity
- **AND** retained repaint or reattach SHALL preserve the same faint presentation

#### Scenario: Tab accepts a contextual suggestion

- **WHEN** the user accepts the faint contextual suggestion with the configured Tab action and the editor repaints it as ordinary editable text
- **THEN** resident frame composition SHALL clear faint intensity before that text
- **AND** the accepted text SHALL use the same normal intensity as typed prompt text

#### Scenario: Selection overrides a faint cell

- **WHEN** the native host paints a selected region containing faint child cells
- **THEN** the region SHALL use the host's uniform selection style
- **AND** following unselected cells SHALL recover their own intensity without inheriting selection or stale faint state

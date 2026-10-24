## ADDED Requirements

### Requirement: Resident tab activation reapplies current controller geometry

Whenever an attach client requests a resident tab view, A1 SHALL route that client's current terminal geometry to the newly selected holder in the same ordered activation flow. This SHALL include switching to a tab that was hidden during an outer-terminal resize and attaching directly to an already-running tab. The selected child SHALL publish a complete surface for the current controller geometry without requiring another user input, model event, or terminal resize. A1 SHALL NOT broadcast one client's dimensions to unrelated hidden tabs or let a read-only spectator replace the input controller's geometry authority.

#### Scenario: Switch to a tab hidden during resize

- **WHEN** the outer terminal changes size while one resident tab is viewed and the user then switches to another tab that retained the previous dimensions
- **THEN** the newly selected holder SHALL receive the current controller columns and rows
- **AND** the switched tab SHALL commit a complete surface fitted to those dimensions without another resize or input event

#### Scenario: Reattach at a different size

- **WHEN** an attach client opens an already-running resident tab from a terminal whose current dimensions differ from the tab's retained geometry
- **THEN** activation SHALL resize that holder to the attaching controller's current geometry before a fresh replacement surface commits

#### Scenario: Differently sized spectator remains non-authoritative

- **WHEN** a read-only client views a tab whose input controller uses different terminal dimensions
- **THEN** the spectator SHALL fit the controller-sized presentation and SHALL NOT resize the shared child

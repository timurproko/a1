## ADDED Requirements

### Requirement: Resident right-side items expose configuration controls

Physically rendered Version and Time text on the resident strip SHALL each have an explicit hover and hit range. Hovering either SHALL provide strip-control feedback. Right-clicking either SHALL open a context menu containing `Configure`; activating it SHALL open the native searchable multi-select titled `Right Side`, where Version and Time toggle independently and persist in fixed order. Omitted narrow items SHALL have no hit range and SHALL not consume child input.

The right-side foreground SHALL use the resident status/footer dim color. This text styling SHALL remain independent of tab chips, popups, overflow, drag targets, and child-surface input.

#### Scenario: Configure Version from the strip

- **WHEN** the user right-clicks the rendered Version item and chooses `Configure`
- **THEN** the native `Right Side` multi-select SHALL open with Version and Time rows
- **AND** toggling a row SHALL persist the ordered `tabBarRightItems` subset and repaint the strip live

#### Scenario: Narrow strip omits Version

- **WHEN** the strip is too narrow to render Version beside the required controls and Time
- **THEN** Version SHALL have no visible or clickable hit range
- **AND** Time, tabs, overflow, plus, and child input SHALL retain valid geometry

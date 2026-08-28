## ADDED Requirements

### Requirement: Active abstractions have one owner and one runtime path
A1 SHALL use one canonical lifecycle contract for an internal presentation component and adapter-specific component contracts SHALL extend it only with capabilities their adapter actually consumes. A vendor-neutral seam SHALL live with the neutral owner whose lifecycle it represents rather than with the first vendor integration that happens to use it. A production abstraction SHALL either participate in the active runtime path or explicitly remain a compatibility contract; A1 SHALL NOT present an unused parallel abstraction as the composition authority.

#### Scenario: Adapt a component to a vendor runtime
- **WHEN** a component is mounted through a vendor presentation adapter
- **THEN** its render, input, invalidation, focus, and disposal lifecycle SHALL satisfy the canonical presentation component contract
- **AND** the vendor adapter SHALL declare only its additional capabilities

#### Scenario: Route an owned application through a vendor-backed shell
- **WHEN** a shell asks whether an A1-owned application claims a route and mounts its surface
- **THEN** that route contract SHALL come from the neutral application owner
- **AND** neither composition nor the application SHALL depend on the vendor integration's private route types

### Requirement: Stateful interaction policy is separate from surface composition
A render root that composes owned UI surfaces SHALL assemble semantic content, component rows, layout inputs, and theme roles. Stateful interaction policy with its own latches, timers, pointer ownership, or navigation state SHALL have a focused controller and SHALL NOT be stored in the render root. The controller SHALL consume only the component operations and callbacks needed for that interaction and SHALL NOT learn workflows, vendor constructors, or unrelated surface data.

#### Scenario: Compose the session viewport
- **WHEN** the shell renders transcript document rows above dock rows
- **THEN** the render root SHALL provide rows, semantic prompt anchors, dimensions, and theme roles to the viewport controller
- **AND** the controller SHALL own follow state, scrollbar interaction, selection, and transient pointer state

#### Scenario: Route viewport input
- **WHEN** keyboard or pointer input reaches the custom session viewport
- **THEN** the viewport controller SHALL decide what it consumes or transforms
- **AND** the render root SHALL only forward the call and request the resulting frame

#### Scenario: End the viewport lifecycle
- **WHEN** a session is replaced or the shell is disposed
- **THEN** the viewport controller SHALL clear its timers, selections, hover, drag, and editor-pointer ownership
- **AND** no transient viewport state SHALL remain in the render root

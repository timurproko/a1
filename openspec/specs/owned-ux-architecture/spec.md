# owned-ux-architecture Specification

## Purpose
The standing rules for how A1 builds what a reader sees: A1 owns the experience, the engine supplies
the data behind it, and neither one is allowed to be copied by hand into the other. These rules apply
to every screen and every vendor-backed surface, so they are stated once here rather than restated for
each feature.
## Requirements
### Requirement: A1 owns the experience and derives the vendor's data
A1 SHALL own how a surface looks and behaves. Where a surface presents data that belongs to a vendor
engine — its wording, its ordering, the values it offers, the limits it accepts, or which of its
settings open a dialog — A1 SHALL derive that data from the vendor's own source rather than
transcribing it. A hand-written copy of vendor data SHALL NOT be introduced, and an existing one SHALL
be replaced by a derived one when the surface it feeds is next changed.

#### Scenario: Present vendor data
- **WHEN** an A1 surface shows wording, ordering, offered values, or limits that originate with the
  vendor engine
- **THEN** those SHALL come from a generated artefact read from the vendor's source
- **AND** a governance test SHALL fail when the generated artefact no longer matches that source

#### Scenario: Vendor data cannot be derived
- **WHEN** a fact about the vendor cannot be read from its source or its public API
- **THEN** the surface SHALL state that fact in one declared place with the reason recorded
- **AND** that place SHALL be governed by a test that fails when the vendor's own answer changes

### Requirement: An unabsorbed vendor change fails the build by name
A1 SHALL fail the build when a vendor change has not been absorbed, and the failure SHALL name what
changed. A vendor capability A1 presents SHALL NOT be able to disappear, gain an unhandled sibling, or
be renamed without a build failure. A1 SHALL NOT rely on a runtime exception or a missing row to
report an unabsorbed vendor change.

#### Scenario: The vendor adds a capability
- **WHEN** the vendor declares a setting, command, or surface A1 does not handle
- **THEN** validation SHALL fail and name the unhandled item

#### Scenario: The vendor removes or renames a capability
- **WHEN** A1 handles an item the vendor no longer declares
- **THEN** validation SHALL fail and name the stale item

### Requirement: Vendor knowledge stays behind the vendor boundary
Knowledge of a vendor's shapes, grammars, key names, and value encodings SHALL live in the adapter
layer that owns that vendor. A composition or wiring layer SHALL connect owners without interpreting
vendor data, and a feature SHALL read vendor-backed data only through a vendor-neutral contract. Where
a value list can only be resolved while running, the boundary SHALL expose it through a declared
provider rather than by wrapping a port in a layer above it.

#### Scenario: A vendor value has a composite grammar
- **WHEN** a vendor encodes more than one meaning in a single value
- **THEN** parsing and composing that value SHALL happen inside the vendor's adapter
- **AND** the layers above SHALL see the parts as ordinary contract fields

#### Scenario: A value list is only known at runtime
- **WHEN** the values a setting accepts depend on what is installed or configured when it is read
- **THEN** the boundary SHALL resolve them through a declared provider
- **AND** no layer above SHALL decorate the port to supply them

### Requirement: A screen composes shared components and draws no chrome of its own
A screen SHALL be built by composing components from the shared component layer. A screen SHALL NOT
implement list layout, selection and hover behaviour, menus, dialogs, controls, input rows, or status
lines of its own. When a second screen needs a behaviour that exists inside the first, that behaviour
SHALL be extracted into the shared layer with its own tests before the second screen is built rather
than copied.

#### Scenario: Build a screen
- **WHEN** a new screen needs a list, a menu, a dialog, a control, an input row, or a status line
- **THEN** it SHALL compose the shared component
- **AND** it SHALL supply only what the data means and what an accepted change does

#### Scenario: A screen needs a behaviour the layer does not have
- **WHEN** a screen requires presentation behaviour the shared layer does not provide
- **THEN** the behaviour SHALL be added to the shared layer with tests
- **AND** the screen SHALL consume it rather than holding a private copy

### Requirement: State is shown, not narrated
A surface SHALL express what it can and cannot do through what it draws. Where an action is
unavailable, the control for it SHALL read as unavailable and SHALL do nothing when used; A1 SHALL
NOT report the unavailability as a message. A message SHALL be reserved for something a reader could
not otherwise know, such as a failure that already happened.

#### Scenario: An action is unavailable
- **WHEN** a control cannot act, because a value is at the end of its range or the surface does not
  accept the change
- **THEN** the control SHALL be drawn in the declared unavailable role and SHALL do nothing
- **AND** no message SHALL be emitted

#### Scenario: An action fails
- **WHEN** an action was attempted and the underlying write failed
- **THEN** A1 SHALL report the failure with what failed and why

### Requirement: Colour and emphasis come from declared theme roles
Every painted element SHALL take its colour and emphasis from a declared theme role. A component SHALL
NOT write terminal escapes or literal colours at the point of use, so one theme decides how a surface
reads. Roles SHALL cover at least ordinary text, quiet text, accent, borders, and unavailable
controls.

#### Scenario: Paint an element
- **WHEN** a component paints text, a border, or a control
- **THEN** it SHALL name a theme role
- **AND** it SHALL NOT contain a literal colour or escape sequence of its own

### Requirement: One declaration answers both dispatch and description
A screen SHALL declare its keyboard shortcuts once, and both what the screen does with a key and what
it tells the reader about that key SHALL be read from that declaration. A hint line, a help listing,
or any other description of the keys SHALL NOT be maintained separately from the bindings.

#### Scenario: A screen gains a shortcut
- **WHEN** a shortcut is added to a screen's declaration
- **THEN** dispatch SHALL handle it and the screen's own hint SHALL include it without a second edit

#### Scenario: A description disagrees with a binding
- **WHEN** any surface describes a key that the declaration does not bind
- **THEN** validation SHALL fail

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

## ADDED Requirements

### Requirement: Profile capabilities are resolved once in composition
The composition root SHALL resolve the launch profile into one capabilities record that names each product surface and behaviour the profile enables or withholds. Every module that behaves differently per profile SHALL receive the field it needs from that record as data. No module outside composition SHALL read the profile identifier, a product-mode string, or an owned-surfaces flag to decide behaviour.

#### Scenario: A comparison profile is composed
- **WHEN** composition builds the application for the comparison profile
- **THEN** it SHALL build one capabilities record that withholds every owned surface
- **AND** the engine host, settings bridge, resource catalog, shell, and trust prompt SHALL each receive their field from that record

#### Scenario: A new profile-dependent behaviour is added
- **WHEN** a change makes a surface depend on the launch profile
- **THEN** it SHALL add a field to the capabilities record and read that field
- **AND** it SHALL NOT branch on the profile identifier or product mode

## MODIFIED Requirements

### Requirement: Vendor knowledge stays behind the vendor boundary
Knowledge of a vendor's shapes, grammars, key names, and value encodings SHALL live in the adapter
layer that owns that vendor. A composition or wiring layer SHALL connect owners without interpreting
vendor data, and a feature SHALL read vendor-backed data only through a vendor-neutral contract. Where
a value list can only be resolved while running, the boundary SHALL expose it through a declared
provider rather than by wrapping a port in a layer above it. The application layer SHALL reach vendor presentation only through a declared record of vendor-neutral presentation ports that composition injects; it SHALL NOT import a vendor adapter module, a vendored source port, or a vendor-named type, and the architecture gate SHALL reject such an import without exemption.

#### Scenario: A vendor value has a composite grammar
- **WHEN** a vendor encodes more than one meaning in a single value
- **THEN** parsing and composing that value SHALL happen inside the vendor's adapter
- **AND** the layers above SHALL see the parts as ordinary contract fields

#### Scenario: A value list is only known at runtime
- **WHEN** the values a setting accepts depend on what is installed or configured when it is read
- **THEN** the boundary SHALL resolve them through a declared provider
- **AND** no layer above SHALL decorate the port to supply them

#### Scenario: The shell needs a vendor-rendered component
- **WHEN** the session shell needs an editor, dialog, selector, status reporter, or input classification that the vendor adapter renders
- **THEN** it SHALL obtain it from the injected presentation ports
- **AND** the architecture gate SHALL fail if any module under the application layer imports the vendor adapter directly

### Requirement: Colour and emphasis come from declared theme roles
Every painted element SHALL take its colour and emphasis from a declared theme role. A component SHALL
NOT write terminal escapes or literal colours at the point of use, so one theme decides how a surface
reads. Roles SHALL cover at least ordinary text, quiet text, accent, borders, and unavailable
controls. One vendor-neutral theme contract SHALL be the only theme module imported outside the vendor adapters; the vendor adapter SHALL map its theme into that contract's roles and SHALL NOT re-export the vendor theme whole. A generated palette SHALL exist once and be imported from one module.

#### Scenario: Paint an element
- **WHEN** a component paints text, a border, or a control
- **THEN** it SHALL name a theme role
- **AND** it SHALL NOT contain a literal colour or escape sequence of its own

#### Scenario: The vendor theme changes
- **WHEN** the vendor theme is reconfigured while the shell runs
- **THEN** the vendor adapter SHALL publish the change through the neutral theme source
- **AND** no module outside the adapter SHALL subscribe to the vendor theme directly

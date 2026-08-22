## ADDED Requirements

### Requirement: Everything A1 shows about a Pi setting is derived from Pi
A1 SHALL derive the wording, presentation order, offered values, numeric limits, and dialog contents
of every Pi setting it presents from the pinned Pi source, through the generated settings metadata,
and SHALL NOT hold a hand-written copy of any of them. Where Pi states values in a submenu rather than
in its item list, those values SHALL be extracted from that submenu on the same route.

#### Scenario: Pi changes what a setting offers
- **WHEN** the pinned Pi source changes the values, wording, order, or limits of a setting
- **THEN** the governance test SHALL fail until the metadata is regenerated
- **AND** regenerating it SHALL be the only edit required for A1 to present the change

#### Scenario: Values come from a submenu
- **WHEN** Pi offers a setting's values through a submenu rather than an inline list
- **THEN** those values SHALL be extracted from that submenu into the generated metadata

### Requirement: The exposed Pi setting inventory is governed
The set of Pi settings A1 exposes SHALL be checked against the inventory Pi itself presents. A setting
Pi presents that A1 does not map SHALL fail validation and SHALL be named. A setting A1 maps that Pi
no longer presents SHALL fail validation and SHALL be named. The read and write pairing for a setting
SHALL remain written against Pi's typed API rather than resolved by name at runtime, so a renamed Pi
method fails to compile.

#### Scenario: Pi adds a setting
- **WHEN** the pinned Pi presents a setting A1 does not map
- **THEN** validation SHALL fail naming that setting

#### Scenario: Pi removes a setting
- **WHEN** A1 maps a setting the pinned Pi no longer presents
- **THEN** validation SHALL fail naming that setting

### Requirement: Pi value grammar and runtime value lists live on the boundary
Composite Pi values — a single stored value carrying more than one meaning, such as a theme setting
naming one theme per terminal appearance — SHALL be parsed and composed inside the Pi adapter and
SHALL reach the layers above as ordinary contract fields. A value list that can only be resolved while
running, such as the installed themes, SHALL be supplied through a provider declared on the settings
contract. No layer above the boundary SHALL wrap the settings port to add, translate, or interpret Pi
values.

#### Scenario: A Pi setting carries a composite value
- **WHEN** a stored Pi setting encodes more than one meaning
- **THEN** the adapter SHALL present its parts through the contract
- **AND** composition SHALL wire the port without interpreting the value

#### Scenario: Offered values depend on what is installed
- **WHEN** the values a Pi setting accepts depend on what is installed when it is read
- **THEN** the adapter SHALL resolve them through the declared provider at read time

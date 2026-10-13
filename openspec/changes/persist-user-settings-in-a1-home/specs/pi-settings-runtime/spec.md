# Spec Delta

## ADDED Requirements

### Requirement: Pi writes preserve the product settings object
The pinned Pi global settings manager used by normal A1 SHALL preserve the complete reserved product object whenever it persists Pi-owned root settings. A1 SHALL leave Pi's manager and storage construction unchanged. Product writes SHALL use a compatible cross-process lock, reread current JSON while locked, replace only the product object, and atomically preserve every Pi-owned root property.

#### Scenario: Pi writes a root setting
- **WHEN** the pinned settings manager persists and flushes a Pi setting while the global document contains the product object
- **THEN** every product property SHALL remain unchanged
- **AND** the Pi setting SHALL retain its pinned root representation

#### Scenario: A1 writes its object
- **WHEN** the product settings manager persists an A1 setting
- **THEN** every Pi-owned root property SHALL remain unchanged
- **AND** only the reserved product object SHALL be replaced or removed

#### Scenario: Writers overlap
- **WHEN** Pi and A1 settings writes overlap in one or multiple processes
- **THEN** the resulting valid JSON document SHALL contain both accepted updates
- **AND** neither writer SHALL lose an unrelated root or product property

#### Scenario: Package operation persists settings
- **WHEN** an A1 package operation changes Pi's root package settings while the product object exists
- **THEN** the package update SHALL use Pi's unchanged settings path
- **AND** the product object SHALL remain unchanged

#### Scenario: Upgrade pinned Pi
- **WHEN** a candidate pinned Pi version is evaluated
- **THEN** file-backed conformance SHALL prove representative Pi writes preserve an unknown product-object fixture
- **AND** a failure SHALL block the candidate rather than introduce a replacement Pi storage layer

### Requirement: The reserved product namespace cannot collide with Pi settings
The reserved root key SHALL be derived from validated product identity rather than embedded in internal type or helper names. Compatibility validation SHALL compare it with the complete pinned Pi root setting inventory and SHALL fail before release if Pi claims that key. Runtime product storage SHALL refuse an existing reserved property that is not an object rather than choosing one owner's data.

#### Scenario: Current Pi has no collision
- **WHEN** compatibility validation inspects the pinned Pi settings schema
- **THEN** the product identity key SHALL be absent from Pi's root setting names
- **AND** shared-file persistence MAY proceed

#### Scenario: A Pi upgrade adds the reserved key
- **WHEN** a candidate Pi version declares a root setting equal to the product namespace key
- **THEN** the Pi compatibility gate SHALL fail and name the collision
- **AND** the candidate SHALL not be released until the namespace design is explicitly revised

#### Scenario: Runtime encounters a colliding property
- **WHEN** the global document contains the reserved root key with a non-object value
- **THEN** the product writer SHALL reject its update without changing the settings file

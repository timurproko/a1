## MODIFIED Requirements

### Requirement: A1 settings have a declared shape, defaults, and validation
Every A1 setting SHALL have a declared identifier, type, allowed values, and default. Application-owned services SHALL resolve defaults over accepted product-namespace values, preserve unknown fields and isolate session-only values. Invalid persisted values SHALL fall back individually. The Settings UI and public API SHALL use the same application authority for validation, resolution and mutation; UI grouping/projection SHALL remain presentation-owned. A1 settings SHALL remain distinct from Pi root fields and engine descriptors. Engine-backed effects and durability SHALL continue through the existing settings port/coordinator.

#### Scenario: Resolve settings with no stored file
- **WHEN** no product namespace exists
- **THEN** declared defaults apply without startup failure

#### Scenario: Resolve settings with a partial stored file
- **WHEN** only some valid values are stored
- **THEN** they apply and omitted settings use defaults

#### Scenario: Reject an out-of-range stored value
- **WHEN** a stored value is invalid
- **THEN** that value falls back individually and reports a notice

#### Scenario: Encounter an unknown stored key
- **WHEN** an unknown property is encountered
- **THEN** it is preserved on writes but not exposed as a setting

#### Scenario: Read a declared setting through its typed getter
- **WHEN** code reads a declared ID
- **THEN** its typed effective value is never absent

#### Scenario: Resolve a partial or invalid stored object
- **WHEN** some declared values are valid, others invalid or absent, and unknown fields exist
- **THEN** valid values apply, invalid or absent values use declared defaults, and unknown fields survive subsequent writes

#### Scenario: Read from API and UI
- **WHEN** either surface changes a supported live setting
- **THEN** both observe the same effective application-owned value without a second settings store or engine writer

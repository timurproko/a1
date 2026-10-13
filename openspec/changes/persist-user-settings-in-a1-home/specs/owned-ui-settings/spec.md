# Spec Delta

## MODIFIED Requirements

### Requirement: A1 settings have a declared shape, defaults, and validation
Every A1 setting SHALL have a declared identifier, type, allowed values, and default. A1 SHALL resolve a complete value set from defaults overlaid with accepted values in the product-owned namespace of the selected global agent settings document. Invalid values SHALL fall back individually. A1 settings SHALL remain logically distinct from Pi settings: they SHALL NOT become Pi root fields or engine descriptors. One manager SHALL own declaration-derived resolution, migration, persistence, sections, and typed getters.

#### Scenario: Resolve settings with no stored file
- **WHEN** the owned UI starts and the global agent settings document has no product-owned section
- **THEN** every A1 setting SHALL resolve to its declared default and A1 SHALL start normally without reporting an error

#### Scenario: Resolve settings with a partial stored file
- **WHEN** the stored product section supplies accepted values for some declared settings and omits others
- **THEN** the supplied values SHALL apply and every omitted setting SHALL resolve to its declared default

#### Scenario: Reject an out-of-range stored value
- **WHEN** a stored product value is present but violates its setting's declared type or allowed values
- **THEN** that setting SHALL resolve to its declared default, the remaining accepted values SHALL still apply, and A1 SHALL report the rejected setting once without failing startup

#### Scenario: Encounter an unknown stored key
- **WHEN** the product section contains a key that matches no declared setting
- **THEN** A1 SHALL ignore that key, SHALL preserve it on the next write so a downgrade does not destroy a newer version's value, and SHALL NOT expose it as a setting

#### Scenario: Read a declared setting through its typed getter
- **WHEN** production code reads a declared A1 setting by id
- **THEN** the value SHALL be typed by that setting's allowed values, SHALL be the value in effect for the running session, and SHALL never be absent

### Requirement: A1 settings persist profile-local and survive restart
A1 SHALL persist non-default A1 values in a reserved, versioned product section of `<effective-home>/.a1/agent/settings.json`, scoped to the normal A1 profile. Pi-owned settings SHALL remain root properties of the same document. A stored value SHALL survive process restart, update, reinstall, and materialized-release replacement. Shared-file writes SHALL be coordinated and atomic so interruption or another writer cannot produce a partially combined document.

#### Scenario: Change a setting and restart
- **WHEN** the user changes an A1 setting away from its default, the setting is stored, and A1 restarts with the same profile
- **THEN** the changed value SHALL resolve from the product section on the next start

#### Scenario: Return a setting to its default
- **WHEN** the user changes an A1 setting back to its declared default
- **THEN** A1 SHALL remove that setting's key from the product section
- **AND** the default SHALL resolve from its declaration on the next start

#### Scenario: Replace the installed package
- **WHEN** the user stores settings and then updates, reinstalls, or launches another A1 version under the same effective home
- **THEN** every version implementing this contract SHALL resolve the same global agent settings document
- **AND** no setting SHALL depend on the package root or materialized release directory

#### Scenario: Keep profiles isolated
- **WHEN** two A1 profiles have different stored values for the same setting
- **THEN** each profile SHALL resolve only its own stored value, and neither SHALL inherit from the other, from a prior process, or from Pi profile state

#### Scenario: Keep logical backends isolated
- **WHEN** the shared document contains Pi root settings and A1 namespaced settings
- **THEN** each backend SHALL resolve and modify only its owned portion
- **AND** neither backend SHALL interpret the other's keys as its own settings

#### Scenario: Vanilla Pi profile is untouched
- **WHEN** normal A1 writes its shared settings document
- **THEN** the contents and layout of `~/.pi/agent` SHALL be unchanged

#### Scenario: Interrupt a settings write
- **WHEN** a shared settings write is interrupted before completion
- **THEN** the next start SHALL resolve either the complete previous document or the complete new one
- **AND** it SHALL NOT resolve a truncated combination as authoritative

## ADDED Requirements

### Requirement: The product section is a versioned document inside global agent settings
The reserved root key SHALL equal the validated product command identity (`a1` for this product). Its value SHALL contain the A1 settings version and `values` object. In this capability, “A1 settings document” means that nested object, while “Pi settings storage” or “Agent settings” means engine-owned root properties; sharing a physical file SHALL NOT transfer backend ownership or routing.

#### Scenario: Inspect the shared settings file
- **WHEN** Pi settings and non-default A1 settings are stored
- **THEN** Pi settings SHALL remain at their established root keys
- **AND** A1 settings SHALL appear only below `a1.values` with an A1 version beside them

#### Scenario: Change an A1-owned entry
- **WHEN** the user accepts a change through an A1-owned Settings entry
- **THEN** the namespaced product document SHALL change without sending that value through the engine settings port
- **AND** every Pi-owned root property SHALL remain unchanged

#### Scenario: Change an Agent entry
- **WHEN** the user accepts a change through an Agent-backed Settings entry
- **THEN** the engine settings port SHALL update its root property without adding that value to the product namespace
- **AND** the complete product namespace SHALL remain unchanged

#### Scenario: Store only deviations
- **WHEN** all declared A1 settings equal their defaults and the product section has no preserved unknown value
- **THEN** the shared file SHALL omit the product section entirely

### Requirement: Former standalone A1 settings remain a non-destructive fallback
When the shared global agent settings document has no product section, A1 SHALL read the former standalone profile document as a compatibility fallback. A shared product section SHALL always win. The fallback file SHALL remain unchanged, and the next accepted A1 change SHALL write non-default resolved values and unknown keys into the shared section. If neither source exists, defaults SHALL apply.

#### Scenario: Read settings written before consolidation
- **WHEN** the shared file has no product section and the former standalone A1 settings document exists
- **THEN** A1 SHALL resolve accepted values from the former document without modifying either file during startup

#### Scenario: Prefer the shared product section
- **WHEN** both a shared product section and a former standalone document exist
- **THEN** A1 SHALL use only the shared product section, even when their values differ

#### Scenario: Persist after compatibility fallback
- **WHEN** A1 resolved a former standalone document and the user accepts an A1-owned setting change
- **THEN** A1 SHALL atomically write all non-default resolved values and preserved unknown keys into the shared product section
- **AND** it SHALL leave the former document unchanged

#### Scenario: Do not bypass an unreadable shared section
- **WHEN** the shared product section exists but cannot be interpreted
- **THEN** A1 SHALL apply the existing unreadable-settings behavior to that section
- **AND** it SHALL NOT resurrect values from the former standalone document

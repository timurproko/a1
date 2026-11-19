# Spec Delta

## MODIFIED Requirements

### Requirement: A1 settings have a declared shape, defaults, and validation
Every A1 setting SHALL have a declared identifier, type, allowed values, and default. A1 SHALL resolve a complete value set from defaults overlaid with accepted properties in the product-owned object of the selected global agent settings document. Invalid values SHALL fall back individually. A1 settings SHALL remain logically distinct from Pi settings: they SHALL NOT become Pi root fields or engine descriptors. One manager SHALL own declaration-derived resolution, compatibility transforms, persistence, sections, and typed getters.

#### Scenario: Resolve settings with no stored file
- **WHEN** the owned UI starts and the global agent settings document has no product-owned object
- **THEN** every A1 setting SHALL resolve to its declared default and A1 SHALL start normally without reporting an error

#### Scenario: Resolve settings with a partial stored file
- **WHEN** the stored product object supplies accepted values for some declared settings and omits others
- **THEN** the supplied values SHALL apply and every omitted setting SHALL resolve to its declared default

#### Scenario: Reject an out-of-range stored value
- **WHEN** a stored product value is present but violates its setting's declared type or allowed values
- **THEN** that setting SHALL resolve to its declared default, the remaining accepted values SHALL still apply, and A1 SHALL report the rejected setting once without failing startup

#### Scenario: Encounter an unknown stored key
- **WHEN** the product object contains a key that matches no declared setting
- **THEN** A1 SHALL ignore that key, SHALL preserve it on the next write so a downgrade does not destroy a newer release's value, and SHALL NOT expose it as a setting

#### Scenario: Read a declared setting through its typed getter
- **WHEN** production code reads a declared A1 setting by id
- **THEN** the value SHALL be typed by that setting's allowed values, SHALL be the value in effect for the running session, and SHALL never be absent

### Requirement: A1 settings persist profile-local and survive restart
A1 SHALL persist non-default A1 values as direct properties of a reserved product object in `<effective-home>/.a1/agent/settings.json`, scoped to the normal A1 profile. That object SHALL contain no schema version, `values` wrapper, or other implementation metadata. Pi-owned settings SHALL remain root properties. Shared-file writes SHALL be coordinated and atomic, and stored choices SHALL survive restart, update, reinstall, and materialized-release replacement.

#### Scenario: Change a setting and restart
- **WHEN** the user changes an A1 setting away from its default, the setting is stored, and A1 restarts with the same profile
- **THEN** the changed value SHALL resolve from the product object on the next start

#### Scenario: Return a setting to its default
- **WHEN** the user changes an A1 setting back to its declared default
- **THEN** A1 SHALL remove that setting's property from the product object
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

### Requirement: Unreadable or unsupported settings never block startup
A1 SHALL treat a global settings file or product object it cannot read, parse, or interpret as absent for A1-owned resolution. Startup SHALL continue with declared defaults, report the condition through diagnostics without replacing Settings footer guidance, and preserve unreadable content unless bounded leading-prefix recovery proves that the remaining bytes are exactly one JSON object. Unknown product properties SHALL be preserved as forward-compatible data rather than requiring a schema-version decision.

#### Scenario: Recover harmless leading corruption
- **WHEN** the global settings file has a bounded non-JSON prefix and removing that prefix leaves exactly one valid JSON object
- **THEN** A1 SHALL atomically rewrite the complete object before the engine loads settings
- **AND** every parsed root property SHALL be preserved
- **AND** the Settings footer SHALL remain on shortcut hints

#### Scenario: Corrupt settings file
- **WHEN** the global settings file or product object cannot be parsed and does not satisfy bounded leading-prefix recovery
- **THEN** A1 SHALL start with declared defaults, SHALL preserve the original bytes, and SHALL NOT exit or present a broken settings surface

#### Scenario: Settings file from a newer version
- **WHEN** the product object contains unknown properties written by a newer A1 release
- **THEN** the running A1 SHALL apply every recognized valid property, preserve every unknown property, and use declared defaults for omitted settings
- **AND** it SHALL NOT require or write a schema version to make that decision

#### Scenario: Settings location is not writable
- **WHEN** the shared settings location cannot be written
- **THEN** the session SHALL continue with resolved values, the failed change outcome SHALL remain authoritative, the optimistic change SHALL roll back, and the surface SHALL NOT claim the change was saved or replace shortcut hints

### Requirement: Stored settings migrate forward on read
The embedded product object SHALL carry no schema version. A1 SHALL migrate recognizable legacy keys or value shapes through ordered, idempotent compatibility transforms, preserve the user's intent, and persist the normalized non-default form on the next accepted change. A transform SHALL be selected by the legacy shape it recognizes, SHALL leave current or unknown data unchanged, and SHALL fail safely when the shape is ambiguous.

#### Scenario: Read an older supported version
- **WHEN** stored product data contains a recognized legacy key or value shape
- **THEN** the normalized value SHALL apply and the resolved set SHALL match what the user last chose

#### Scenario: Migrate a renamed setting
- **WHEN** a compatibility transform recognizes a renamed or restructured setting the user had changed
- **THEN** the user's value SHALL appear under the current declaration rather than reverting to the default

#### Scenario: Migration cannot complete
- **WHEN** legacy product data is ambiguous or a required compatibility transform fails
- **THEN** A1 SHALL resolve safe declared defaults for affected settings, report the condition, and preserve the original properties

## ADDED Requirements

### Requirement: Settings footer always presents shortcut guidance
The Settings status row SHALL always render the active shortcut hints. Save results, unavailable-entry feedback, document diagnostics, and interrupt confirmation SHALL NOT replace those hints.

#### Scenario: A setting change fails
- **WHEN** an A1-owned or Agent-backed change cannot be stored or applied
- **THEN** any optimistic value SHALL roll back as appropriate
- **AND** the footer SHALL continue showing the same shortcut hints

#### Scenario: A setting cannot be changed from the surface
- **WHEN** the user attempts an unavailable or non-editable setting action
- **THEN** the footer SHALL remain unchanged and SHALL NOT display a transient message

### Requirement: The product section is a flat object inside global agent settings
The reserved root key SHALL equal the validated product command identity (`a1` for this product). Its value SHALL directly map setting identifiers to non-default values, with no version or `values` subsection. In this capability, “A1 settings document” means that object, while “Pi settings storage” or “Agent settings” means engine-owned root properties; sharing a physical file SHALL NOT transfer backend ownership or routing.

#### Scenario: Inspect the shared settings file
- **WHEN** Pi settings and non-default A1 settings are stored
- **THEN** Pi settings SHALL remain at their established root keys
- **AND** each A1 setting SHALL appear directly below the `a1` root object
- **AND** no A1 schema metadata or nested values object SHALL appear

#### Scenario: Change an A1-owned entry
- **WHEN** the user accepts a change through an A1-owned Settings entry
- **THEN** the namespaced product object SHALL change without sending that value through the engine settings port
- **AND** every Pi-owned root property SHALL remain unchanged

#### Scenario: Change an Agent entry
- **WHEN** the user accepts a change through an Agent-backed Settings entry
- **THEN** the engine settings port SHALL update its root property without adding that value to the product object
- **AND** the complete product object SHALL remain unchanged

#### Scenario: Store only deviations
- **WHEN** all declared A1 settings equal their defaults and the product object has no preserved unknown property
- **THEN** the shared file SHALL omit the product object entirely

### Requirement: Former standalone A1 settings remain a non-destructive fallback
When the shared global agent settings document has no product object, A1 SHALL read the former standalone profile document as a compatibility fallback, including its historical version metadata internally during import. A shared product object SHALL always win. The fallback file SHALL remain unchanged, and the next accepted A1 change SHALL write only normalized non-default values and unknown keys into the flat shared object. If neither source exists, defaults SHALL apply.

#### Scenario: Read settings written before consolidation
- **WHEN** the shared file has no product object and the former standalone A1 settings document exists
- **THEN** A1 SHALL resolve accepted values from the former document without modifying either file during startup

#### Scenario: Prefer the shared product section
- **WHEN** both a shared product object and a former standalone document exist
- **THEN** A1 SHALL use only the shared product object, even when their values differ

#### Scenario: Persist after compatibility fallback
- **WHEN** A1 resolved a former standalone document and the user accepts an A1-owned setting change
- **THEN** A1 SHALL atomically write normalized non-default values and preserved unknown keys directly into the shared product object
- **AND** it SHALL leave the former document unchanged

#### Scenario: Do not bypass an unreadable shared section
- **WHEN** the shared product object exists but cannot be interpreted
- **THEN** A1 SHALL apply the existing unreadable-settings behavior to that object
- **AND** it SHALL NOT resurrect values from the former standalone document

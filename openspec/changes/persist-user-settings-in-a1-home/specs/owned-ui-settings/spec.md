# Spec Delta

## MODIFIED Requirements

### Requirement: A1 settings persist profile-local and survive restart
For a normal launch without an explicit configuration override, A1 SHALL store each A1-owned profile document at `<effective-home>/.a1/settings/<profile-id>.json`, separate from Pi-owned settings under the selected agent profile. An explicit `A1_CONFIG_DIR` SHALL relocate the A1-owned document to `<A1_CONFIG_DIR>/settings/<profile-id>.json`. Stored values SHALL survive process restart, package update, reinstall, and materialized-release replacement, and writes SHALL be atomic.

#### Scenario: Change a setting and restart
- **WHEN** the user changes a setting, the setting is stored, and A1 is restarted with the same profile
- **THEN** the changed value SHALL resolve on the next start

#### Scenario: Replace the installed package
- **WHEN** the user stores A1-owned settings and then updates, reinstalls, or launches another A1 package version under the same effective home
- **THEN** every version using this contract SHALL resolve the same `<effective-home>/.a1` settings document
- **AND** no setting SHALL depend on the package root or materialized release directory

#### Scenario: Keep profiles isolated
- **WHEN** two A1 profiles have different stored values for the same setting
- **THEN** each profile SHALL resolve only its own stored value, and neither SHALL inherit from the other, from a prior process, or from Pi profile state

#### Scenario: Preserve an explicit settings root
- **WHEN** `A1_CONFIG_DIR` names an explicit configuration root
- **THEN** A1 SHALL read and write the profile document only below that root
- **AND** it SHALL NOT read the effective home's default A1-owned settings document

#### Scenario: Vanilla Pi profile is untouched
- **WHEN** A1 writes its settings
- **THEN** the contents and layout of `~/.pi/agent` SHALL be unchanged
- **AND** Pi-backed Agent settings in `~/.a1/agent/settings.json` SHALL remain owned by the engine rather than copied into the A1-owned document

#### Scenario: Interrupt a settings write
- **WHEN** a settings write is interrupted before completion
- **THEN** the next start SHALL resolve either the complete previous value set or the complete new one, and SHALL NOT resolve a truncated file as authoritative

## ADDED Requirements

### Requirement: Former configuration settings remain a non-destructive fallback
When no explicit `A1_CONFIG_DIR` is set and the `.a1` A1-owned settings document is absent, A1 SHALL read the former platform configuration document as a compatibility fallback. An existing `.a1` document SHALL always win. A fallback document SHALL remain unchanged, and the next accepted A1-owned change SHALL write the complete resolved document, including unknown keys, to `.a1`. If neither document exists, declared defaults SHALL apply.

#### Scenario: Read settings written before relocation
- **WHEN** `<effective-home>/.a1/settings/<profile-id>.json` is absent and the former platform configuration document exists
- **THEN** A1 SHALL resolve accepted values from the former document without modifying it during startup

#### Scenario: Prefer the stable home document
- **WHEN** both the `.a1` document and the former platform configuration document exist
- **THEN** A1 SHALL use only the `.a1` document, even when their values differ

#### Scenario: Persist after compatibility fallback
- **WHEN** A1 resolved a former configuration document and the user accepts an A1-owned setting change
- **THEN** A1 SHALL atomically write the resolved values and preserved unknown keys to the `.a1` document
- **AND** it SHALL leave the former document unchanged

#### Scenario: Resolve a new profile
- **WHEN** neither the `.a1` document nor the former platform configuration document exists
- **THEN** every A1-owned setting SHALL resolve to its declared default

#### Scenario: Do not bypass an unreadable primary document
- **WHEN** the `.a1` document exists but cannot be read, parsed, or interpreted
- **THEN** A1 SHALL apply the existing unreadable-settings behavior to that document
- **AND** it SHALL NOT resurrect values from the former configuration document

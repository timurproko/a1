# Spec Delta

## MODIFIED Requirements

### Requirement: Launch profiles use separate user roots
The normal A1 profile SHALL use `<home>/.a1/agent`, including one global `settings.json` containing Pi-owned root settings and an A1-owned namespaced section. The Pi comparison SHALL leave Pi's configuration-root override unset so Pi preserves its ordinary `<home>/.pi/agent` behavior and SHALL NOT consume the A1-owned section. Path resolution SHALL use the effective user home consistently, remain independent of installed package and materialized release roots, and remain overrideable in hermetic tests.

#### Scenario: Bare A1 resolves its profile
- **WHEN** A1 launches with user home `H`
- **THEN** the pinned Pi engine and A1-owned settings manager SHALL use `H/.a1/agent/settings.json`
- **AND** each SHALL read only its owned portion of that document

#### Scenario: Pi comparison resolves its profile
- **WHEN** the comparison launches with user home `H`
- **THEN** A1 SHALL leave the configuration-root override unset so Pi resolves `H/.pi/agent`
- **AND** it SHALL NOT read or apply the product namespace from `H/.a1/agent/settings.json`

#### Scenario: Launch another installed version
- **WHEN** another A1 version or replacement installation launches under the same effective user home
- **THEN** it SHALL resolve the same normal-profile `settings.json`
- **AND** that file SHALL NOT be selected from the package or materialized release directory

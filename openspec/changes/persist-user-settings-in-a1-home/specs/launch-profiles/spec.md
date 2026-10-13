# Spec Delta

## MODIFIED Requirements

### Requirement: Launch profiles use separate user roots
The normal A1 profile SHALL use `<home>/.a1/agent` for Pi-owned agent state and `<home>/.a1/settings` for A1-owned preference documents. The Pi comparison SHALL leave Pi's configuration-root override unset so Pi preserves its ordinary `<home>/.pi/agent` behavior and SHALL NOT consume A1-owned preferences. Path resolution SHALL use the effective user home consistently, remain independent of the installed package and materialized release roots, and remain overrideable in hermetic tests.

#### Scenario: Bare A1 resolves its profile
- **WHEN** A1 launches with user home `H`
- **THEN** the pinned Pi engine SHALL use `H/.a1/agent` as its configuration root
- **AND** A1-owned preferences SHALL resolve under `H/.a1/settings`

#### Scenario: Pi comparison resolves its profile
- **WHEN** the comparison launches with user home `H`
- **THEN** A1 SHALL leave the configuration-root override unset so Pi resolves `H/.pi/agent`
- **AND** it SHALL NOT read or apply A1-owned preferences under `H/.a1/settings`

#### Scenario: Launch another installed version
- **WHEN** another A1 version or replacement installation launches under the same effective user home
- **THEN** it SHALL resolve the same A1-owned and Pi-owned normal-profile roots
- **AND** neither root SHALL be selected from that version's package or materialized release directory

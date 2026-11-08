## ADDED Requirements

### Requirement: Repository scripts have a reference
Every `scripts/**/*.mjs` file SHALL be referenced by `package.json`, a workflow under `.github/`, current documentation (`docs/`, `openspec/specs/`, `README.md`, `AGENTS.md`), or another file under `scripts/`, `bin/`, `src/`, or `test/`. Archived OpenSpec changes SHALL NOT count as references. The architecture gate SHALL fail naming each script with no reference.

#### Scenario: A script loses its last reference
- **WHEN** a change removes the last reference to a script
- **THEN** the architecture gate SHALL fail and name the script
- **AND** the change SHALL delete the script or document how it is run

#### Scenario: A script is mentioned only in an archived change
- **WHEN** the only mention of a script is under `openspec/changes/archive/`
- **THEN** the architecture gate SHALL treat the script as unreferenced

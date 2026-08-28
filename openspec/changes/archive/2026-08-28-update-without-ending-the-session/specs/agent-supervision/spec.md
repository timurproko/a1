## MODIFIED Requirements

### Requirement: Immediate package replacement is ownership-safe and atomic
Stable and preview updates SHALL coordinate npm installation, immutable materialization,
certification, stale-generation reconciliation, active-reference commit, and rollback through
one durable transaction. The npm tag SHALL select only the exact target and SHALL NOT weaken
ownership or rollback semantics.

Ownership SHALL be coordinated by moving the active reference rather than by ending a live
cohort. An update SHALL NOT stop, drain, or terminate a cohort that is running from retained
immutable release content, and SHALL NOT require that nothing is running before it replaces
the mutable package. A cohort running from the mutable installation is the exception: its files
are what the installation replaces, so the update SHALL request its bounded shutdown, and the
session SHALL be told that an update ended it rather than being left to discover it.

#### Scenario: Verified foreground generations exist
- **WHEN** update starts while a verified cohort with live instances owns foreground generations
  from retained immutable release content
- **THEN** A1 SHALL install, materialize, certify, and commit the new active reference while that
  cohort keeps running
- **AND** the live instances SHALL continue on the release they started on

#### Scenario: A live cohort runs from the mutable installation
- **WHEN** update starts while a live cohort runs from the mutable package rather than from
  retained immutable content
- **THEN** A1 SHALL request bounded shutdown and verify ownership release before replacing the
  package
- **AND** the ended session SHALL report that an update ended it

#### Scenario: Installation or activation fails
- **WHEN** installation, materialization, certification, or activation fails
- **THEN** A1 SHALL retain diagnostics, avoid mixed ownership, and retain or restore one verified
  runnable cohort when possible
- **AND** rollback SHALL re-point the active reference without stopping a cohort that survived
  the update

### Requirement: Live A1 processes use one immutable release cohort
Every live A1 bootstrap, supervisor, and A1-owned runtime process SHALL execute from retained
immutable release content with package-derived identity. Installing a candidate SHALL NOT
overwrite files used by a live cohort or connect incompatible releases.

Each process SHALL stay on the cohort it started on for its whole life. More than one cohort MAY
be live at once, and each live cohort SHALL be addressable on its own endpoint identity so two
cohorts never contend for one. A new launch SHALL follow the active reference.

#### Scenario: Launch encounters an older live supervisor
- **WHEN** the mutable command entry encounters a verified older live A1 cohort
- **THEN** A1 SHALL use that cohort's retained release or complete a verified replacement before
  connecting

#### Scenario: Safe cohort activation
- **WHEN** active foreground ownership is released
- **THEN** A1 SHALL verify release identity, atomically activate the candidate, and avoid
  duplicate supervisor ownership of one endpoint identity

#### Scenario: A launch arrives while a superseded cohort is still working
- **WHEN** a new launch starts while an older cohort still has live instances
- **THEN** the launch SHALL start on the active cohort
- **AND** the older cohort SHALL keep serving the instances it already has

## ADDED Requirements

### Requirement: A superseded cohort retires when its work finishes
A cohort that is no longer the active one SHALL keep serving the instances it already has, and
SHALL accept no new ones. When its last instance exits it SHALL exit and remove its own endpoint
artifacts, leaving nothing for a later launch to reconcile.

Retained release content SHALL NOT be pruned while a live cohort runs from it. Reconciliation
SHALL validate each cohort's endpoint on its own identity, and SHALL NOT treat a second live
cohort as stale ownership.

#### Scenario: The last instance of a superseded cohort exits
- **WHEN** the final live instance of a cohort that is not the active one exits
- **THEN** that cohort SHALL exit and remove its endpoint artifacts

#### Scenario: Pruning considers what is running
- **WHEN** retained releases are pruned while a superseded cohort is still working
- **THEN** the release that cohort runs from SHALL be retained until it exits

#### Scenario: Reconciliation sees two live cohorts
- **WHEN** reconciliation runs while the active cohort and a superseded cohort are both live
- **THEN** each SHALL be validated on its own endpoint identity and neither SHALL be removed as
  stale

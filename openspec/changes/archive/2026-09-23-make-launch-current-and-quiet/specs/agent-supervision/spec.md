## MODIFIED Requirements

### Requirement: Live A1 processes use one immutable release cohort
Every live A1 bootstrap, supervisor, and A1-owned runtime process SHALL execute from retained
immutable release content with package-derived identity. Installing a candidate SHALL NOT
overwrite files used by a live cohort or connect incompatible releases.

Each process SHALL stay on the cohort it started on for its whole life. More than one cohort MAY
be live at once, and each live cohort SHALL be addressable on its own endpoint identity so two
cohorts never contend for one. A new launch SHALL follow the newest eligible release between the
verified active reference and the verified package installation used by that invocation. Ordinary
launch SHALL NOT replace a newer active reference with an older installed candidate; an explicit
update or rollback MAY atomically select its exact verified target.

#### Scenario: Launch encounters an older live supervisor
- **WHEN** the mutable command entry encounters a verified older live A1 cohort and a newer eligible installed release
- **THEN** A1 SHALL atomically select and launch the newer release for the new instance
- **AND** the older cohort SHALL continue serving its existing instances without interruption

#### Scenario: Invocation comes from an older installation
- **WHEN** an ordinary launch from an older compatible package installation observes a newer verified active release
- **THEN** A1 SHALL launch the newer active release
- **AND** SHALL NOT move the active reference backward

#### Scenario: Safe cohort activation
- **WHEN** a verified newer candidate becomes eligible for new launches
- **THEN** A1 SHALL atomically activate the candidate and establish or reuse only its matching verified supervisor
- **AND** SHALL avoid duplicate ownership of any endpoint identity

#### Scenario: A launch arrives while a superseded cohort is still working
- **WHEN** a new launch starts while an older cohort still has live instances
- **THEN** the launch SHALL start on the active cohort
- **AND** the older cohort SHALL keep serving the instances it already has

#### Scenario: Concurrent activation changes during launch
- **WHEN** the active reference changes after release selection but before a new launch instance is admitted
- **THEN** A1 SHALL revalidate ownership and converge through a bounded internal reselection
- **AND** SHALL preserve the invocation's profile and explicit session selection

## ADDED Requirements

### Requirement: Expected release coordination and SQLite notices stay off the interactive terminal
A successful interactive launch SHALL NOT print release activation, superseded-cohort handoff,
or SQLite experimental-stability notices. A1 SHALL NOT suppress unrelated Node warnings or
non-recoverable launch failures to satisfy this requirement.

#### Scenario: SQLite runtime reports experimental stability
- **WHEN** an A1-owned SQLite boundary runs on a supported Node build that emits the `SQLite is an experimental feature` warning
- **THEN** that warning SHALL NOT reach the interactive terminal
- **AND** unrelated Node warning classes SHALL retain their normal observability

#### Scenario: Superseded admission is recovered internally
- **WHEN** a selected supervisor reports that another release became active and bounded reselection succeeds
- **THEN** A1 SHALL launch the selected active release without printing the internal superseded-release diagnostic

#### Scenario: Reselection cannot converge
- **WHEN** bounded reselection cannot establish one eligible active launch target
- **THEN** A1 SHALL exit with a concise actionable failure
- **AND** SHALL NOT require the user to close retained sessions, restart the machine, delete state, or discover process identifiers

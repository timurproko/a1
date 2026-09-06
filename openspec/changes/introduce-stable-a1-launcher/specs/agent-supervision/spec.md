## ADDED Requirements

### Requirement: Supervised runtimes are bound to launcher compatibility
Every immutable runtime release record and supervisor endpoint SHALL identify the launcher protocol requirements under which that runtime may start. The stable launcher SHALL validate compatibility before starting a supervisor, and live cohorts SHALL remain bound to the launcher/runtime contract under which they started.

#### Scenario: Compatible runtime starts
- **WHEN** the launcher selects a verified runtime whose required launcher features are supported
- **THEN** the supervisor SHALL publish that runtime and launcher compatibility identity with its cohort endpoint

#### Scenario: Incompatible runtime is selected
- **WHEN** a runtime requires unsupported launcher behavior
- **THEN** no runtime process SHALL start and the previous compatible cohort SHALL remain selected

#### Scenario: Launcher upgrade occurs while an older cohort is live
- **WHEN** the stable launcher is upgraded while a compatible older cohort still owns live instances
- **THEN** that cohort SHALL continue under its original runtime contract and new launches SHALL use only a mutually compatible active runtime

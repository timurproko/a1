## ADDED Requirements

### Requirement: Startup budget enforcement is declared per channel
Validation SHALL select startup budget enforcement through the `A1_STARTUP_BUDGET_ENFORCEMENT` contract. The value `fail` SHALL enforce the declared budgets by failing the gate on an overrun. The value `record` SHALL retain every measurement, record each overrun as evidence and as a run annotation, and allow the run to succeed. An absent or unrecognized value SHALL mean `fail`.

Development publication and ordinary pull-request validation SHALL run in `record` mode. Nightly publication, stable publication, and complete regression SHALL run in `fail` mode, and the complete regression workflow SHALL state its mode explicitly rather than rely on the default. No mode SHALL reduce the measured profiles or launch kinds, retry a measurement, or suppress a launch that never became input-ready.

The startup performance evidence SHALL name the enforcement mode it was produced under and SHALL list every recorded violation with its profile, launch kind, measured elapsed time, applicable budget, and dominant phases. Publication lanes SHALL upload that evidence with their platform outcomes and SHALL summarize each measurement, its budget, and its status in the run summary.

#### Scenario: A development preview lane records an overrun
- **WHEN** a publication lane resolves the development channel and an exact packaged launch exceeds its budget
- **THEN** the lane SHALL receive `record`, annotate the run, upload the violation with its platform outcomes, and succeed

#### Scenario: A publication lane enforces an overrun
- **WHEN** a publication lane resolves the nightly or stable channel and the same launch exceeds the same budget
- **THEN** the lane SHALL receive `fail` and block publication with the dominant measured phases

#### Scenario: A pull request measures startup
- **WHEN** the pull-request startup owner runs on a shared runner
- **THEN** it SHALL measure every declared scenario in `record` mode and SHALL NOT fail the required aggregate on a timing overrun alone

#### Scenario: The contract is unset
- **WHEN** the exact-package startup gate runs with no enforcement variable, an empty value, or an unrecognized value
- **THEN** it SHALL enforce the budgets

## ADDED Requirements

### Requirement: Cohort updates and retention preserve resident agents
Cohort update coordination SHALL stop and drain launch instances only. It SHALL NOT terminate the resident agent host or its workers, which follow the resident capability's idle-boundary upgrade rules. Immutable release retention SHALL treat the recorded release of a live verified resident host or worker as current ownership, and SHALL NOT collect that release until no such process uses it. A superseded supervisor cohort SHALL retire according to its own launch-instance work regardless of resident agents.

#### Scenario: Update with resident agents running
- **WHEN** an update activates a new release while a resident host and workers run from the previous release
- **THEN** supervision SHALL drain the previous cohort's launch instances without terminating resident processes

#### Scenario: Garbage collection with a resident worker on an old release
- **WHEN** release cleanup evaluates a release still used by a live verified worker
- **THEN** that release SHALL be retained until the worker is recycled or stopped

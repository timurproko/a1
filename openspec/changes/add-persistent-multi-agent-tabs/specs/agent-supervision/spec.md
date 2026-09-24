## ADDED Requirements

### Requirement: Cohort updates and retention preserve resident tabs
Cohort update coordination SHALL stop and drain launch instances only. It SHALL NOT terminate the resident terminal-host server, session holders, or tab processes; these follow the resident capability's handoff and idle-boundary recycling rules. Immutable release retention SHALL treat the recorded release of every live verified resident server, holder, and tab process as current ownership, and SHALL NOT collect that release while any such process uses it. A superseded supervisor cohort SHALL retire according to its own launch-instance work regardless of resident tabs.

#### Scenario: Update with resident tabs running
- **WHEN** an update activates a new release while resident processes run from the previous release
- **THEN** supervision SHALL drain the previous cohort's launch instances without terminating resident processes

#### Scenario: Garbage collection with a tab on an old release
- **WHEN** release cleanup evaluates a release still used by a live verified holder or tab process
- **THEN** that release SHALL be retained until the process is recycled or stopped

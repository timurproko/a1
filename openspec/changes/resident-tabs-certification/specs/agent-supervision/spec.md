## ADDED Requirements

### Requirement: Cohort updates and retention preserve resident tabs
Cohort update coordination SHALL stop and drain launch instances only. It SHALL NOT terminate the resident terminal-host server, session holders, or tab processes. In this opt-in version a compatible resident cohort remains on its immutable release until all of its tabs stop; automatic server handoff and idle-boundary recycling are deferred. Immutable release retention SHALL treat the recorded release of every live verified resident server, holder, and tab process as a `resident` external hold, SHALL treat an unreadable resident record or an uninspectable identity as a hold on every release it records, and SHALL NOT collect such a release while the hold stands. A superseded supervisor cohort SHALL retire according to its own launch-instance work regardless of resident tabs.

#### Scenario: Update with resident tabs running
- **WHEN** an update activates a new release while resident processes run from the previous release
- **THEN** supervision SHALL drain the previous cohort's launch instances without terminating resident processes

#### Scenario: Garbage collection with a tab on an old release
- **WHEN** release cleanup evaluates a release still used by a live verified holder or tab process
- **THEN** that release SHALL be retained until the process is recycled or stopped

#### Scenario: Recorded resident process was replaced by pid reuse
- **WHEN** a recorded resident pid now belongs to a process with a different native start identity
- **THEN** that record SHALL NOT hold its release, and no process SHALL be signalled

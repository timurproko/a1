## ADDED Requirements

### Requirement: No background process coordinates A1 launches
A1 SHALL NOT start a detached supervisor or keep any background process after the terminal session ends, other than an installer worker performing an update; independent `a1` processes SHALL coordinate only through the session writer guard and the durable update transaction.

#### Scenario: Several launches run independently
- **WHEN** two `a1` processes run at the same time
- **THEN** each SHALL run its own UI without contacting a supervisor or control endpoint
- **AND** a session open in one SHALL be refused as a writer by the other

## REMOVED Requirements

### Requirement: Live A1 processes use one immutable release cohort
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Control compatibility is negotiated by required features
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Immediate package replacement is ownership-safe and atomic
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Generation liveness is boot-scoped and observed
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Stale supervisor ownership is reconciled automatically
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: A superseded cohort retires when its work finishes
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Supervisor tracks plural authenticated launch instances
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Owner loss is reconciled per instance
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Cohort updates coordinate every active launch instance
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Immutable release retention is bounded by current ownership needs
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Release collection is reference-safe and restart-safe
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Supervisor startup is bounded and diagnosable
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Darwin launch instances use certified native containment
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Certification publication releases ownership safely under filesystem contention
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Dependency certifications use a dedicated managed directory
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Legacy dependency certification migration preserves validation authority
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Certification relocation preserves retained cohort restart evidence
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Dependency certification cleanup handles both layouts safely
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Releases may reuse certified immutable dependency content
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Certified immutable content remains safely restartable
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Existing full-copy releases remain valid compatibility cohorts
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Expected release coordination and SQLite notices stay off the interactive terminal
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Native process identity inspection reports only active process objects
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Cohort updates and retention preserve resident tabs
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

### Requirement: Approved releases with missing certified files are repaired before launch
**Reason**: The detached per-release supervisor, release cohorts, control contracts, launch-instance tracking, native process identity, Darwin containment certification, and resident holds are removed. Bare `a1` runs as one directly attached process per launch; immutable releases are retained by age (see `cli-self-update`).

**Migration**: Any supervisor left by an older release exits on its own when its last client ends or at logout; `a1 uninstall` removes its state directory as before.

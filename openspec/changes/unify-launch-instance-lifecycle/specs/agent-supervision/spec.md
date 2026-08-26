## REMOVED Requirements

### Requirement: Transparent generations use one exclusive foreground lease
**Reason**: Product-wide foreground exclusivity incorrectly blocks independent physical terminals and allows one stale lease to prevent later launches.

**Migration**: Convert historical live foreground-lease rows to terminal interrupted outcomes during the control-schema transition, then represent every owned UI or transparent invocation as an independently identified launch instance.

## ADDED Requirements

### Requirement: Supervisor tracks plural authenticated launch instances
The supervisor SHALL track zero or more concurrently active launch instances for its verified release cohort. Each instance SHALL be bound to its authenticated owner, profile, root process identity, containment identity, lifecycle state, and terminal outcome; persisted state alone SHALL NOT prove that an instance is live.

#### Scenario: Several owners register instances
- **WHEN** authenticated clients start multiple interactive commands concurrently
- **THEN** the supervisor SHALL register every instance independently and publish all verified live instance identities

#### Scenario: Unrelated client disconnects
- **WHEN** a control client that does not own a given instance disconnects
- **THEN** the supervisor SHALL leave that instance unchanged

### Requirement: Owner loss is reconciled per instance
The supervisor SHALL detect loss of an instance's authenticated owner and coordinate bounded cleanup or terminal reconciliation for that instance without waiting for another command. Reconciliation SHALL be idempotent and SHALL NOT clear another instance's ownership.

#### Scenario: Owner disappears before activation
- **WHEN** an owner disconnects after creating an instance but before its root runtime activates
- **THEN** the supervisor SHALL finalize that instance without leaving a launch blocker

#### Scenario: Owner disappears while the runtime is active
- **WHEN** an active instance owner disconnects
- **THEN** the supervisor SHALL apply the instance's non-detachable stop policy, record the outcome, and preserve unrelated instances

#### Scenario: Ownership is uncertain
- **WHEN** exact process or containment ownership cannot be verified during reconciliation
- **THEN** the supervisor SHALL preserve the uncertain process, retain diagnosable evidence, and SHALL NOT convert uncertainty into authority to terminate it

### Requirement: Cohort updates coordinate every active launch instance
An ownership-safe update SHALL enumerate all verified active launch instances in the affected cohort, request bounded shutdown for each, and verify that every instance released runtime ownership before replacing or retiring the cohort. A singular instance outcome SHALL NOT be treated as release of the whole cohort.

#### Scenario: Update encounters several active instances
- **WHEN** an update is authorized while multiple `a1` or `a1 pi` instances are active
- **THEN** A1 SHALL coordinate and verify each instance outcome before completing cohort replacement

#### Scenario: One instance cannot release ownership
- **WHEN** one affected instance cannot be stopped or verified within the update deadline
- **THEN** A1 SHALL fail or defer replacement safely without falsely marking the cohort idle

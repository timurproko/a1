## ADDED Requirements

### Requirement: Global package replacement is cancellation safe
Before allowing npm to mutate the globally managed A1 package or its launchers, the self-update workflow SHALL durably prepare verified recovery evidence and delegate the destructive replacement interval to an independently surviving owner. An ordinary cancellation request SHALL be recorded and coordinated at a safe boundary rather than delivered as an uncontrolled termination of npm. Every success, failure, or acknowledged-cancellation result SHALL satisfy a launcher postcondition proving that the platform's complete public launcher set resolves to a verified recovery release or a completely installed target.

#### Scenario: Cancellation precedes package mutation
- **WHEN** cancellation is requested before npm begins changing the global package
- **THEN** A1 SHALL stop without starting package replacement and SHALL leave the existing launchers and active release unchanged

#### Scenario: Cancellation occurs inside the destructive interval
- **WHEN** cancellation is requested after npm may have renamed the package or any launcher
- **THEN** A1 SHALL stop or finish npm only through the recovery owner, restore or verify the complete launcher set, durably record the safe disposition, and only then acknowledge cancellation

#### Scenario: Updater exits while replacement continues
- **WHEN** the invoking updater exits after handing package replacement to the recovery owner
- **THEN** the recovery owner SHALL remain able to finish or contain npm and SHALL establish the launcher postcondition independently of the updater

#### Scenario: npm replacement fails
- **WHEN** npm exits unsuccessfully after changing the package root or launchers
- **THEN** the recovery owner SHALL preserve npm diagnostics, restore a verified callable launcher, and retain a transaction that the next invocation can safely continue or roll back

#### Scenario: Target installation completes after cancellation
- **WHEN** npm has completely installed and verified the selected target before coordinated cancellation reaches its safe boundary
- **THEN** A1 MAY retain the installed target launchers while leaving activation to the durable transaction recovery path

### Requirement: Recovery evidence is narrow, durable, and disposable
Update recovery evidence SHALL bind one transaction identity, canonical npm global root, package root, complete launcher path set, prior verified release identity, target version, and recovery payload digest. It SHALL be committed before destructive replacement, consumed only within those bounds, and removed after the transaction and launcher disposition are complete. The recovery mechanism SHALL NOT add another public command, trust arbitrary npm temporary paths, or weaken immutable release validation.

#### Scenario: Recovery capsule is prepared
- **WHEN** A1 is ready to begin global package replacement
- **THEN** it SHALL commit the bounded recovery payload and identity before npm can remove a public launcher

#### Scenario: Concurrent or stale recovery owner appears
- **WHEN** another worker or a later invocation observes recovery evidence for the same transaction
- **THEN** A1 SHALL use verified process identity and durable disposition to converge on one recovery owner without racing launcher writes

#### Scenario: Recovery completes
- **WHEN** the package transaction and launcher postcondition are durably complete
- **THEN** A1 SHALL retire the recovery worker and make its transaction-scoped capsule eligible for bounded cleanup

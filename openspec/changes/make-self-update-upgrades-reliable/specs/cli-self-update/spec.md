## MODIFIED Requirements

### Requirement: Recovery evidence is narrow, durable, and disposable
Update recovery evidence SHALL bind one transaction identity, canonical npm global root, package root, complete launcher path set, prior verified release identity, target version, recovery payload digest, npm executable, and installation arguments. For a newly created transaction, those arguments SHALL explicitly pin the npm prefix derived from the bound global root. Before visible progress, ownership release, package-unlock mutation, transaction creation, recovery-owner startup, or package replacement, A1 SHALL resolve npm's JavaScript entry from validated npm execution context, the active npm global root, or the current Node installation's bounded bundled-npm layout and SHALL bind only its canonical regular-file target. Capsule preparation SHALL revalidate the preflight identity when committing recovery authority. Direct invocation SHALL NOT require npm's lifecycle-only `npm_execpath`, and npm's acquisition location MAY differ from the confirmed package destination prefix without granting authority over another destination.

When preflight cannot establish replacement authority, A1 SHALL leave ownership, package files, launchers, active release, and transaction state unchanged, SHALL emit no update progress frame, and SHALL provide the preferred official installer bridge as the bounded recovery action. Recovery evidence SHALL be committed before destructive replacement, consumed only within those bounds, and removed after the transaction and launcher disposition are complete. The recovery mechanism SHALL NOT add another public A1 command, trust arbitrary npm temporary paths or prefixes, or weaken immutable release validation. A valid recovery capsule created before explicit-prefix binding SHALL remain readable only with its exact legacy unprefixed installation arguments and all other existing authority checks intact.

#### Scenario: Recovery capsule is prepared
- **WHEN** A1 is ready to begin global package replacement
- **THEN** it SHALL have already validated the canonical npm entry without mutating update lifecycle state
- **AND** it SHALL commit the bounded recovery payload and identity before npm can remove a public launcher
- **AND** the recorded npm arguments SHALL select the exact package target and prefix bound by the capsule

#### Scenario: Direct Windows invocation uses Node-bundled npm
- **WHEN** A1 is invoked directly without `npm_execpath`, active npm reports a user-scoped global package root, and the selected npm/current Node installation supplies a canonical regular `node_modules/npm/bin/npm-cli.js` outside that root
- **THEN** A1 SHALL preflight and bind that JavaScript entry into recovery evidence
- **AND** package replacement SHALL remain pinned to the independently confirmed user-scoped package prefix and launcher set

#### Scenario: No valid npm JavaScript entry exists
- **WHEN** every bounded npm-entry candidate is absent, non-regular, or cannot be canonicalized
- **THEN** A1 SHALL fail before progress, ownership shutdown, transaction creation, recovery-owner startup, or package replacement
- **AND** SHALL NOT accept an arbitrary shell wrapper, directory, prefix, or searched npm path as replacement authority
- **AND** SHALL identify the official installer bridge without claiming rollback was needed

#### Scenario: Non-default-prefix replacement is interrupted
- **WHEN** replacement of a confirmed non-default-prefix installation is canceled or the invoking updater exits
- **THEN** the recovery owner SHALL resume or restore only the package root and complete launcher set under that confirmed prefix
- **AND** SHALL NOT mutate the active default prefix

#### Scenario: Concurrent or stale recovery owner appears
- **WHEN** another worker or a later invocation observes recovery evidence for the same transaction
- **THEN** A1 SHALL use verified process identity and durable disposition to converge on one recovery owner without racing launcher writes

#### Scenario: Existing valid recovery evidence predates explicit prefix arguments
- **WHEN** A1 reads a valid in-flight capsule containing the exact previously supported unprefixed npm installation arguments
- **THEN** it SHALL retain the capsule's existing canonical-root, package, launcher, target, executable, and digest checks and MAY resume it
- **AND** SHALL NOT accept any other unpinned or arbitrary argument form

#### Scenario: Recovery completes
- **WHEN** the package transaction and launcher postcondition are durably complete
- **THEN** A1 SHALL retire the recovery worker and make its transaction-scoped capsule eligible for bounded cleanup

### Requirement: Published releases are reachable through predecessor-owned update behavior
A release SHALL NOT be considered self-update compatible solely because updater code inside that target works after installation. Exact-package release evidence SHALL drive the supported published predecessor's own protected replacement behavior through package and launcher mutation, recovery postconditions, and target activation. The ordinary immediate predecessor SHALL complete direct update without npm lifecycle-only environment variables in every supported installation layout. If an already-published predecessor is known to lack required acquisition context, the preferred official installer MAY provide a bounded bridge only by supplying canonical npm execution context to that predecessor's existing protected updater; this exception SHALL be explicit and SHALL NOT be described as retroactive direct-update success.

A target-side fix that cannot be reached from the source release SHALL block release readiness until an accepted protected bridge is proven. Candidate-only recovery tests and post-install materialization/warmup tests SHALL remain necessary evidence but SHALL NOT substitute for predecessor-to-target replacement.

#### Scenario: Immediate predecessor installs the candidate
- **WHEN** release validation exercises the newest supported published predecessor against the exact candidate
- **THEN** that predecessor's own updater SHALL prepare recovery, replace the package, establish a complete launcher postcondition, and activate the candidate
- **AND** the resulting command SHALL be callable from the same verified installation prefix

#### Scenario: Candidate contains an updater fix
- **WHEN** the defect being fixed occurs before the target package can be installed
- **THEN** validation SHALL require source-release or protected-bridge evidence that reaches the candidate
- **AND** candidate updater success alone SHALL NOT establish that the fix is deliverable

#### Scenario: A known immutable predecessor needs the installer bridge
- **WHEN** a valid already-published predecessor cannot establish npm replacement authority during direct invocation but accepts a canonical npm execution context
- **THEN** the official installer MAY delegate to that predecessor with the validated context
- **AND** the predecessor SHALL retain ownership of transaction, cancellation, replacement, launcher recovery, activation, and rollback
- **AND** evidence SHALL distinguish this bridge from ordinary direct update

#### Scenario: Neither direct update nor protected bridge succeeds
- **WHEN** the supported predecessor cannot reach the exact candidate through either required path
- **THEN** publication SHALL fail rather than ship an update that affected users cannot install

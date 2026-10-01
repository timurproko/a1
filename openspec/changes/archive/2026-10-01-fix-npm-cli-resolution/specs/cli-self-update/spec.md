## MODIFIED Requirements

### Requirement: Recovery evidence is narrow, durable, and disposable
Update recovery evidence SHALL bind one transaction identity, canonical npm global root, package root, complete launcher path set, prior verified release identity, target version, recovery payload digest, npm executable, and installation arguments. For a newly created transaction, those arguments SHALL explicitly pin the npm prefix derived from the bound global root. Before committing new recovery evidence, A1 SHALL resolve npm's JavaScript entry from validated npm execution context, the active npm global root, or the current Node installation's bounded bundled-npm layout and SHALL bind only its canonical regular-file target. Direct invocation SHALL NOT require npm's lifecycle-only `npm_execpath`, and npm's acquisition location MAY differ from the confirmed package destination prefix without granting authority over another destination. Recovery evidence SHALL be committed before destructive replacement, consumed only within those bounds, and removed after the transaction and launcher disposition are complete. The recovery mechanism SHALL NOT add another public command, trust arbitrary npm temporary paths or prefixes, or weaken immutable release validation. A valid recovery capsule created before explicit-prefix binding SHALL remain readable only with its exact legacy unprefixed installation arguments and all other existing authority checks intact.

#### Scenario: Recovery capsule is prepared
- **WHEN** A1 is ready to begin global package replacement
- **THEN** it SHALL commit the bounded recovery payload and identity before npm can remove a public launcher
- **AND** the recorded npm arguments SHALL select the exact package target and prefix bound by the capsule

#### Scenario: Direct Windows invocation uses Node-bundled npm
- **WHEN** A1 is invoked directly without `npm_execpath`, active npm reports a user-scoped global package root, and the selected npm/current Node installation supplies a canonical regular `node_modules/npm/bin/npm-cli.js` outside that root
- **THEN** A1 SHALL bind that JavaScript entry into recovery evidence
- **AND** package replacement SHALL remain pinned to the independently confirmed user-scoped package prefix and launcher set

#### Scenario: No valid npm JavaScript entry exists
- **WHEN** every bounded npm-entry candidate is absent, non-regular, or cannot be canonicalized
- **THEN** A1 SHALL fail capsule preparation before starting the recovery owner or package replacement
- **AND** SHALL NOT accept an arbitrary shell wrapper, directory, prefix, or searched npm path as replacement authority

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

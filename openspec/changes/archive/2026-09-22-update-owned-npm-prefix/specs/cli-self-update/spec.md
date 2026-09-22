## MODIFIED Requirements

### Requirement: Self-update is limited to the managed global installation
A1 SHALL verify through npm's global package-root resolution that the running package occupies the exact `@timurproko/a1` package location in an npm-managed global installation before replacing it. The installation MAY use npm's active default prefix or a different prefix whose inferred global root active npm independently confirms and whose complete platform launcher set targets that package. A1 SHALL pin replacement to the confirmed prefix that owns the running package. It SHALL refuse automatic replacement when running from a local checkout, npm link, malformed package layout, unconfirmed root, or a different package-manager context.

#### Scenario: Running package is globally managed by npm
- **WHEN** the running A1 package exactly occupies its canonical package location beneath npm's canonical active global package root
- **THEN** A1 may perform the global update against that root

#### Scenario: Running package is managed under a confirmed non-default npm prefix
- **WHEN** the running A1 package exactly occupies the canonical package location under another global root, active npm confirms that root for its inferred prefix, and the prefix's complete launcher set targets that package
- **THEN** A1 SHALL update the invoked installation in place using that explicit prefix
- **AND** SHALL NOT create or select an installation under the active default prefix merely because the defaults differ

#### Scenario: Running package is not managed by global npm
- **WHEN** the running package path does not have npm's exact global package layout or active npm does not confirm the inferred root
- **THEN** A1 exits unsuccessfully and prints the manual npm installation command without modifying any package, launcher, supervisor, or update transaction

#### Scenario: Running package is linked or checked out locally
- **WHEN** the running A1 package canonicalizes to a local checkout, npm link target, or another package-manager context
- **THEN** A1 exits unsuccessfully and prints the manual npm installation command without modifying any installation

### Requirement: Recovery evidence is narrow, durable, and disposable
Update recovery evidence SHALL bind one transaction identity, canonical npm global root, package root, complete launcher path set, prior verified release identity, target version, recovery payload digest, npm executable, and installation arguments. For a newly created transaction, those arguments SHALL explicitly pin the npm prefix derived from the bound global root. Recovery evidence SHALL be committed before destructive replacement, consumed only within those bounds, and removed after the transaction and launcher disposition are complete. The recovery mechanism SHALL NOT add another public command, trust arbitrary npm temporary paths or prefixes, or weaken immutable release validation. A valid recovery capsule created before explicit-prefix binding SHALL remain readable only with its exact legacy unprefixed installation arguments and all other existing authority checks intact.

#### Scenario: Recovery capsule is prepared
- **WHEN** A1 is ready to begin global package replacement
- **THEN** it SHALL commit the bounded recovery payload and identity before npm can remove a public launcher
- **AND** the recorded npm arguments SHALL select the exact package target and prefix bound by the capsule

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

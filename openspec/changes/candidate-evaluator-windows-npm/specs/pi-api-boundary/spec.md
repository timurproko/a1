## MODIFIED Requirements

### Requirement: Pi upgrades use one exact compatibility authority and bounded candidate gates
The repository package manifest and lockfile SHALL remain the dependency authority for the exact compatible Pi package family. Version, source-provenance, fixtures, and evidence metadata SHALL be derived from or checked against that authority, and a candidate SHALL pass compile-time, runtime, architecture, workflow, extension, TUI, packaging, explicit-oracle, and regression gates before activation. The isolated candidate evaluation SHALL run on every supported development platform, starting the package manager through the platform's own executable shim without a shell, so a proposal produced by the nightly job can be reproduced where it is reviewed; the nightly job SHALL commit and push every proposal it produces, including one whose gates failed. The hand-maintained pinned-Pi inventories (modal transition graph, presenter ownership, interactive behavior baseline) SHALL be re-resolvable against a candidate by one script: every source anchor that still matches is kept, one that matches only ignoring whitespace is rewritten to the matching line, one that matches nowhere marks its entry `orphaned`, a behavior line range that no longer contains its anchors moves to its named symbols' span, source hashes and upstream manifests are regenerated, and an interactive component the graph has never recorded is reported as unmapped; orphaned and unmapped entries SHALL fail the inventory checks rather than pass silently.

#### Scenario: Evaluate a candidate version
- **WHEN** maintainers propose a newer Pi version
- **THEN** an isolated candidate run SHALL report all required adapter migrations and SHALL NOT change the accepted dependency until mandatory compatibility gates pass

#### Scenario: Evaluate a candidate on Windows
- **WHEN** the candidate evaluator runs on a Windows workstation
- **THEN** it SHALL install, compile, and probe the candidate exactly as on the Linux runner, and a failed stage SHALL report the package manager's own message rather than a process-start error

#### Scenario: Compatibility metadata drifts
- **WHEN** hardcoded or generated version evidence differs from the package manifest or lockfile
- **THEN** governance SHALL fail with the stale authority rather than allowing mixed Pi versions

#### Scenario: Candidate passes
- **WHEN** every mandatory compatibility, product regression, package, and oracle gate passes against one exact candidate dependency set
- **THEN** A1 MAY update the exact pin without requiring workspace-domain or feature-contract changes

#### Scenario: Re-resolve the inventories against a candidate
- **WHEN** the inventory sync runs against an installed Pi whose interactive sources moved, reformatted, dropped, or added anchored code
- **THEN** unchanged anchors and ranges SHALL stay as reviewed, reformatted anchors and moved ranges SHALL be rewritten, dropped anchors SHALL mark their entries orphaned, and new components SHALL be reported unmapped
- **AND** its check mode SHALL report drift, orphans, and unmapped components without writing and SHALL pass on the current pin

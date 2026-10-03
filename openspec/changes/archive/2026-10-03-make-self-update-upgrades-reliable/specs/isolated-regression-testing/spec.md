## ADDED Requirements

### Requirement: Published-predecessor validation covers protected package replacement
Published-predecessor validation SHALL distinguish post-install activation compatibility from complete update reachability. In addition to materialization and warmup, release evidence SHALL run the applicable published predecessor's own protected replacement path against the exact candidate in a fixture-owned private prefix. The scenario SHALL include durable recovery preparation, independently surviving replacement ownership, package and complete launcher mutation, launcher postcondition, candidate activation, and a callable resulting command.

On Windows, the ordinary immediate-predecessor case SHALL omit lifecycle-only `npm_execpath`, place A1 under a user-style global prefix, and place active npm beside a separate Node installation. An explicitly declared affected historical predecessor MAY use the official installer's canonical npm-context bridge, but its outcome SHALL be labeled as bridge evidence and SHALL NOT satisfy the direct immediate-predecessor assertion. Candidate-owned unit fixtures, mocked replacement callbacks, and predecessor materialization/warmup alone SHALL NOT satisfy this requirement.

The destructive fixture SHALL use only recorded disposable roots and fake npm filesystem mutations; it SHALL NOT use or alter the runner's user installation, global prefix, A1 data, or launchers. Stable publication SHALL require its applicable exact predecessor replacement outcome. Full regression and nightly validation SHALL retain the scenario at exhaustive cadence, while bounded pull-request validation SHALL retain deterministic preflight, installer delegation, recovery, and failure contracts.

#### Scenario: Published predecessor replaces a split-root installation
- **WHEN** Windows validation installs the immediate published predecessor under a private user-style prefix and supplies npm from a separate Node-style root
- **THEN** the predecessor's own updater SHALL replace the package with the exact candidate without lifecycle-only npm context
- **AND** its normal recovery and launcher postconditions SHALL hold before candidate activation succeeds

#### Scenario: Historical affected predecessor uses the bridge
- **WHEN** validation exercises a declared immutable predecessor whose direct npm acquisition is known to fail
- **THEN** the exact official installer under test SHALL supply canonical npm context and delegate to that predecessor's protected updater
- **AND** the result SHALL record bridge success separately from direct-update coverage

#### Scenario: Replacement fails after launcher mutation
- **WHEN** the predecessor fixture injects npm failure, cancellation, or invoking-updater loss during replacement
- **THEN** the independently surviving owner SHALL establish the existing complete launcher postcondition and preserve bounded diagnostics
- **AND** no fixture path outside the recorded package prefix and data root SHALL change

#### Scenario: Candidate-only update tests pass
- **WHEN** candidate recovery tests and predecessor materialization/warmup pass but predecessor protected replacement fails or is absent
- **THEN** the exact-package predecessor outcome SHALL remain failed or missing
- **AND** stable publication SHALL be blocked

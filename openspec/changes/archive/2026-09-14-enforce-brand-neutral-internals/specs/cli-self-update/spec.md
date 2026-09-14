## ADDED Requirements

### Requirement: Private runtime execution uses one supported launch contract
Launch, warmup, update activation, retained-release execution, rollback, and recovery SHALL use the single current neutral private environment contract. Pre-cutover runtimes, updaters, rollback targets, and recovery capsules are outside this contract. The implementation SHALL NOT supply legacy private aliases, translate obsolete private input, negotiate an older encoding, rewrite historical runtime payloads, or provide migration helpers to make those components executable.

Runtime-target eligibility SHALL be established from verified target metadata before execution or activation; a missing or different private-contract identity SHALL make a target ineligible. Package-version ordering alone SHALL NOT establish eligibility. An unsupported retained or recovery target SHALL NOT be silently executed as a fallback. When no safe current-contract selection is available, the operation SHALL stop with an actionable diagnostic rather than changing encoding or deleting state.

#### Scenario: A current-contract target is activated
- **WHEN** a verified installed candidate uses the current private contract
- **THEN** its warmup and supervision SHALL receive the required neutral launch context and satisfy the existing readiness and verification requirements

#### Scenario: A pre-cutover retained target is selected
- **WHEN** a launch candidate lacks the current private-contract identity
- **THEN** that target SHALL be rejected before its entry point is executed or its activation is committed
- **AND** the implementation SHALL NOT select a legacy key writer to make it launchable

#### Scenario: An old active reference blocks launch
- **WHEN** stale runtime references prevent a safe current-contract launch selection
- **THEN** launch SHALL report the unsupported state and required cutover action without executing or automatically migrating the old runtime

#### Scenario: No supported rollback target exists
- **WHEN** activation fails and all available rollback candidates are outside the current private contract
- **THEN** rollback SHALL report that no eligible target is available
- **AND** it SHALL NOT execute a pre-cutover target or silently declare rollback successful

### Requirement: The initial private-contract cutover protects user data
The first installation adopting the neutral private contract SHALL be a deliberate clean cutover, not a supported old-to-new self-update or migration path. Its handoff SHALL instruct the maintainer to stop existing application, supervisor, and worker processes and install the accepted new package directly through npm. It SHALL NOT rely on an old `a1 update` command or old recovery launcher completing the cutover.

Any required reset SHALL be restricted to individually identified disposable runtime/release state after affected processes stop. The handoff SHALL identify exact resolved paths and their purpose and require separate explicit confirmation before removal. The application SHALL NOT automatically delete or convert existing state to resolve an unsupported contract. Whole configuration/data-root deletion SHALL NOT be used as a shortcut when user and disposable data coexist.

The public command, package identity, supported user-facing environment settings, user-directory resolution, settings, credentials, session data, prompt history, and `.a1` user data SHALL remain unchanged by this cutover. No user-data relocation or format migration is authorized. Returning to a pre-cutover build is a separate deliberate manual installation/reset, not a supported in-application rollback route.

#### Scenario: The maintainer installs the first new-contract build
- **WHEN** installation instructions are delivered for the initial cutover
- **THEN** they SHALL name the accepted package version, direct npm installation command, and stop-process prerequisite
- **AND** they SHALL distinguish this one-time path from subsequent supported `a1 update` operations

#### Scenario: Disposable-state reset is necessary
- **WHEN** unsupported runtime/release records must be reset before the new installation can run
- **THEN** the exact disposable paths and their purpose SHALL be presented for separate confirmation
- **AND** no application-driven migration or automatic deletion SHALL occur

#### Scenario: Disposable and user data share a root
- **WHEN** a reset candidate is located beneath a root that also stores settings, sessions, or history
- **THEN** the reset SHALL exclude those user-data paths and SHALL NOT remove the whole root

#### Scenario: Old recovery state is encountered
- **WHEN** a pre-cutover recovery capsule would otherwise resume package replacement or launch an old runtime
- **THEN** the new implementation SHALL reject that recovery path and provide the manual cutover guidance
- **AND** it SHALL NOT translate the capsule or activate an obsolete runtime

### Requirement: Current-contract lifecycle behavior retains its safety guarantees
After the clean cutover, different release versions using the same private contract SHALL support normal launch, comparison launch, update activation, retained-session continuity, rollback, and interrupted-update recovery under the existing lifecycle rules. The naming refactor SHALL NOT weaken immutable-root verification, content certification, ownership checks, containment, public-setting validation, or existing startup/update budgets.

Owned outgoing context SHALL be reconstructed from the verified selected target and current launch intent rather than stale inherited private values. Required fields SHALL form a coherent current context, and invalid or missing fields SHALL fail before use without falling back to another release or default path. Platform-specific casing SHALL NOT permit ambiguous duplicate private keys. Diagnostics SHALL identify the logical setting without dumping unrelated environment values.

Acceptance SHALL include executable tests for current-contract lifecycle operations, rejection of obsolete-only private input and unsupported targets, and preservation of protected user data. Successful pre-cutover interoperability tests are not required and SHALL NOT be replaced with compatibility behavior merely to make historical fixtures pass.

#### Scenario: A supported session remains active during update
- **WHEN** an update installs another release using the current private contract while a retained session on that contract is working
- **THEN** the session SHALL retain its release, transcript, input, containment, and cohort connection
- **AND** subsequent launches SHALL select the appropriate installed release

#### Scenario: Rollback or recovery uses the current contract
- **WHEN** rollback selects a verified current-contract release or interrupted replacement resumes through current-contract recovery state
- **THEN** the operation SHALL retain its existing verification, readiness, and launcher-availability guarantees

#### Scenario: A new-contract launch inherits stale private values
- **WHEN** a launcher selects a verified target while inheriting context from another session
- **THEN** it SHALL reconstruct the owned outgoing context from the selected target and current intent
- **AND** unrelated public and third-party settings SHALL remain unchanged

#### Scenario: Required current context is absent or ambiguous
- **WHEN** a private entry lacks required neutral fields or receives conflicting case-equivalent private keys
- **THEN** it SHALL fail validation before using that context
- **AND** obsolete branded keys SHALL NOT satisfy the missing fields

#### Scenario: Acceptance is reviewed
- **WHEN** the clean-cutover implementation is proposed for acceptance
- **THEN** evidence SHALL cover current-contract packaged launch/update/rollback/recovery, unsupported-input and target rejection, protected user-data sentinels, public overrides, supported platforms, and unchanged budgets

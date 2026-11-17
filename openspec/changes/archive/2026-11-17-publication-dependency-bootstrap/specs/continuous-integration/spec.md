## ADDED Requirements

### Requirement: Publication commands bootstrap incomplete checkout dependencies

The public develop and release commands SHALL establish dependency readiness before importing any dependency-bearing publication module. Readiness SHALL use the repository manifest and lockfile, detect absent/stale required dependencies and observable incomplete launch-critical or transitive dependency state, and not rely solely on the existence of node_modules. When repair is required, the command SHALL explain the cause, perform one locked checkout-local npm ci installation including development dependencies, recheck readiness and continue the original operation exactly once only when ready. Healthy dependencies SHALL NOT trigger installation. The shared environment doctor SHALL retain read-only diagnostic behavior.

#### Scenario: Missing semver on one machine
- **WHEN** a maintainer invokes develop or release in a checkout missing the declared semver package
- **THEN** startup detects the missing dependency before importing the publication graph and runs the locked dependency installation
- **AND** after installation and readiness recheck succeed, the original command proceeds with its original arguments instead of an unhandled module-not-found failure

#### Scenario: Existing but incomplete dependency tree
- **WHEN** node_modules exists but required package metadata, launch-critical entry files or transitive dependency state is missing or invalid
- **THEN** startup classifies the tree as incomplete and repairs it before entering publication logic

#### Scenario: Dependencies already healthy
- **WHEN** the checkout dependencies meet the current manifest/lockfile contract
- **THEN** the command proceeds without reinstalling packages or contacting the registry for setup

#### Scenario: Ordinary doctor remains diagnostic
- **WHEN** a maintainer runs the environment doctor or an ordinary build against missing dependencies
- **THEN** the shared inspector reports the dependency failure without implicitly starting an installation

### Requirement: Dependency repair cannot bypass publication or filesystem authority

Dependency repair SHALL remain startup-only, serialize automatic installations within the same checkout, recheck after acquiring ownership and release only its own lock. Installation SHALL use safe literal process arguments and the selected checkout's existing lockfile without modifying dependency declarations, lock pins, global installations or external linked dependency trees. Failure, interruption, unsafe ownership or an incomplete post-install recheck SHALL exit nonzero before publication side effects. Successful setup SHALL preserve arguments, exit behavior, authoritative source selection and stable-release approval rules. Importing helper modules for tests or library use SHALL NOT install dependencies or publish artifacts.

#### Scenario: Installation fails or remains incomplete
- **WHEN** npm ci exits unsuccessfully or the repaired tree still fails readiness
- **THEN** the command returns an actionable nonzero failure without fetching publication authority, creating a draft or dispatching a publishing workflow
- **AND** it does not loop indefinitely or replay a publication action

#### Scenario: Concurrent invocations need the same repair
- **WHEN** two commands in the same checkout discover missing dependencies
- **THEN** their automatic installations do not overlap and a waiting invocation rechecks the repaired tree before deciding whether installation is still needed

#### Scenario: Dependency directory links outside the checkout
- **WHEN** automatic repair would mutate an external shared dependency tree through a link or junction
- **THEN** it refuses that unsafe repair with guidance instead of deleting or reinstalling external content

#### Scenario: Maintainer interrupts setup
- **WHEN** a maintainer cancels an in-progress dependency installation
- **THEN** setup settles its owned installer process, releases only its owned lock and exits without continuing publication

#### Scenario: Stable release still needs its ordinary authority
- **WHEN** dependency repair succeeds for a release command with an explicit stable target
- **THEN** the unchanged release logic parses that target, validates its source and prepares the ordinary draft
- **AND** bootstrap does not publish the release or bypass the person's approval

#### Scenario: Test imports have no setup effects
- **WHEN** a test imports a command helper or injects a fake publication runtime
- **THEN** importing it alone starts neither an npm install nor a publication request

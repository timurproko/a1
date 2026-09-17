## MODIFIED Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and specification changes SHALL require no product build or product test execution, but SHALL run every lightweight governance consistency check whose scanned inputs they change; OpenSpec changes SHALL also pass strict OpenSpec validation. Pull requests into `develop` SHALL require a bounded PR core consisting of typechecking, architecture and applicable governance checks, directly changed tests, reviewed path-owned test scopes, and a small current-product smoke set. They SHALL select additional rendering, startup, package, compatibility, and platform evidence only when coarse reviewed ownership marks it affected. Unknown operational inputs and changes to validation authority SHALL select complete development validation. Preview publication SHALL additionally require the complete fast tier and exact-package gates on every supported platform. A numbered development preview SHALL validate the exact package on the Windows, Linux, and macOS Node 24 lanes; Windows Node 22 coverage of every development head SHALL be provided by nightly publication and complete regression rather than by each preview. The lane set SHALL be derived from the publication mode by one reviewed repository script rather than a literal workflow matrix. Stable publication SHALL require the complete automated suite on every supported platform. The scheduled nightly workflow SHALL run one full tracked-repository documentation review and complete retained automated coverage against its authoritative `origin/develop` source before publication can succeed.

#### Scenario: Docs-only pull request
- **WHEN** every changed path is documentation, an OpenSpec artifact, a Markdown file, `LICENSE`, or `.gitignore`
- **THEN** the required development check SHALL avoid product builds and tests, run strict OpenSpec validation when applicable, and run docs-sensitive governance consistency checks

#### Scenario: Code pull request targets develop
- **WHEN** a pull request changes classified non-documentation paths without changing validation authority or an unknown operational input
- **THEN** validation SHALL run the bounded PR core and every additional scope selected by reviewed ownership
- **AND** it SHALL NOT require unrelated retained tests merely because they belong to the complete fast tier
- **AND** the required aggregate check SHALL gate the merge

#### Scenario: Validation authority or unknown input changes
- **WHEN** a pull request changes workflow selection, ownership, suite composition, aggregation authority, common build policy, or an operational path with no trustworthy owner
- **THEN** validation SHALL run complete applicable development coverage or block
- **AND** no selective result SHALL be inferred from the untrusted policy

#### Scenario: Preview candidate is built
- **WHEN** a preview is published to `next`
- **THEN** validation SHALL run the complete fast tier and exact packed-candidate gates on Windows, Linux, and macOS without requiring every stable-only scope

#### Scenario: Stable candidate is certified
- **WHEN** a version is published to `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version package bytes on Windows, Linux, and macOS before publication

#### Scenario: Scheduled nightly source is selected
- **WHEN** the nightly publication workflow resolves the authoritative `origin/develop` commit
- **THEN** one platform-independent job SHALL inspect documentation governance across every tracked policy-relevant file at that exact commit
- **AND** the retained platform validation matrix SHALL execute complete coverage without repeating the same documentation review

#### Scenario: Development preview lanes are selected
- **WHEN** a manual development publication resolves its validation matrix
- **THEN** it SHALL validate the exact package on Windows Node 24, Linux Node 24, and macOS Node 24
- **AND** nightly and stable publication SHALL keep validating on Windows Node 22 as well
- **AND** the selected lanes SHALL come from the reviewed matrix script for that mode

### Requirement: Reused validation setup retains exact identity
Validation SHALL avoid repeated successful builds and candidate packing within a job when the consuming scopes use unchanged source, platform, architecture, toolchain, dependencies, and build inputs. Reuse SHALL depend on verified prerequisite evidence and present artifacts rather than an unchecked environment flag. Missing or incompatible setup evidence SHALL cause fresh preparation or an explicit failure before tests, never successful validation with stale artifacts.

Persistent caches SHALL be limited to integrity-checked dependency downloads and compatible native compiler intermediates, with validation of resulting artifacts after restoration. Clean-install gates SHALL still install exact candidate bytes into fresh private prefixes. Mutable installed fixtures, active releases, certification state, launch compile caches, and prior performance results SHALL not be restored as substitutes for current-head execution. Publication SHALL retain its existing pack-once and exact-byte authority.

#### Scenario: Installation already built the job's candidate
- **WHEN** dependency installation successfully builds the unchanged selected source and records compatible prerequisite evidence
- **THEN** later scopes in that job SHALL consume that build without rebuilding it

#### Scenario: A ready marker is stale or forged
- **WHEN** setup is marked ready but its inputs differ or required artifacts cannot be verified
- **THEN** validation SHALL rebuild or fail before consuming those artifacts

#### Scenario: A package download cache is warm
- **WHEN** a clean-install scenario can reuse cached dependency tarballs
- **THEN** it SHALL verify their integrity and install into a new isolated prefix
- **AND** first-attempt startup evidence SHALL not be replaced by warmed fixture or prior-run evidence

#### Scenario: A native guardian compiler cache is warm
- **WHEN** a publication guardian build can reuse cached compiler intermediates for the same toolchain and dependency lockfile
- **THEN** the locked release build SHALL still run and its emitted artifact identity SHALL still be recorded
- **AND** a changed guardian source or lockfile SHALL rebuild the affected units rather than reuse a stale binary

### Requirement: Publication lanes deduplicate exact-package installation
When one preview, nightly, or stable publication platform/runtime lane selects multiple exact-package owners that consume the same candidate and require the same clean installed package, validation SHALL reuse a compatible downloaded candidate receipt without repacking and SHALL prepare that immutable installation once for the lane. The lane-local receipt SHALL bind the downloaded candidate to the same exact build receipt used by validation. Each selected owner SHALL retain a distinct outcome, its declared assertions, and all applicable platform/runtime coverage. Validation SHALL record the preparation identity, count, duration, separate installation, proxy-synchronization, and installed-identity durations, candidate digest, and consuming owners, and SHALL fail closed if any consumer cannot prove it used that exact preparation.

Reusable preparation SHALL remain scoped to one lane and one exact candidate. It SHALL NOT cross platform, architecture, Node runtime, workflow run, run attempt, candidate digest, or installation-policy identity boundaries. Failure or cancellation of shared preparation SHALL fail every dependent owner and SHALL block publication without reporting an owner as passed or skipped.

#### Scenario: Package contracts and startup share one lane
- **WHEN** one publication lane selects package-contract and first-attempt startup owners for the same exact candidate
- **THEN** the lane SHALL reuse compatible downloaded candidate evidence and perform exactly one clean installed-package preparation for those owners
- **AND** startup SHALL execute immediately after preparation and before package-contract workload
- **AND** each owner SHALL execute once and report a separate result

#### Scenario: Downloaded candidate receipt is compatible
- **WHEN** a lane receives exact candidate bytes and source identity with a package receipt bound to that lane's exact build receipt
- **THEN** validation SHALL accept the existing candidate without invoking lane-local packing
- **AND** contradictory candidate, source, or build evidence SHALL remain fail-closed

#### Scenario: Preparation identity differs
- **WHEN** selected consumers differ by candidate digest, platform, architecture, Node runtime, run attempt, or installation-policy identity
- **THEN** validation SHALL NOT reuse the installed package across that boundary
- **AND** every required lane SHALL retain its own verified preparation

#### Scenario: Shared preparation fails
- **WHEN** the lane's exact-package installation fails, is cancelled, or produces missing or contradictory identity evidence
- **THEN** every dependent owner SHALL remain unsuccessful
- **AND** publication SHALL be blocked before npm is contacted

#### Scenario: Publication timing is inspected
- **WHEN** validation evidence for a lane selecting multiple exact-package consumers is reviewed
- **THEN** it SHALL show one preparation count and duration plus each consuming owner's independent duration and outcome
- **AND** a repeated equivalent clean install SHALL fail the structural regression contract rather than being hidden in aggregate elapsed time

#### Scenario: Preparation cost is attributed
- **WHEN** a lane records its shared exact-package preparation
- **THEN** the receipt and evidence SHALL show the installation, proxy-synchronization, and installed-identity durations separately
- **AND** the total SHALL remain the single preparation duration already reported

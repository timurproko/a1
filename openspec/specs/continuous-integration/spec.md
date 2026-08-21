# Continuous Integration Specification

## Purpose

Defines fast, explainable development validation and immutable-artifact promotion while preserving complete stable release assurance.

## Requirements

### Requirement: Development integration is automatically validated
GitHub Actions SHALL validate every pull request targeting `develop` and every commit integrated into `develop`. The required development check SHALL complete successfully before a pull request is eligible to merge, and publication workflows SHALL NOT serve as the first automated validation of a change.

#### Scenario: Pull request targets develop
- **WHEN** a pull request is opened or updated against `develop`
- **THEN** automatic validation SHALL run against the pull request head and its merge base with `develop`
- **AND** GitHub SHALL prevent merge while the required validation is missing, running, cancelled, or failed

#### Scenario: Commit reaches develop
- **WHEN** a commit is pushed or merged into `develop`
- **THEN** automatic integration validation SHALL run for that exact commit and preserve its result independently of any publication request

### Requirement: Validation matches changed content
Development validation SHALL derive its scope from changed paths. A change entirely under `openspec/**` SHALL run only strict OpenSpec validation because it changes no product bytes. Any change outside that path SHALL use normal affected implementation validation, including mandatory invariants and fail-closed full validation when its scope cannot be determined safely. The selector SHALL record changed paths, selected scopes, commands, and reasons.

#### Scenario: Only planning changes
- **WHEN** every changed path is under `openspec/**`
- **THEN** validation SHALL run strict OpenSpec validation without typecheck, build, architecture, runtime, integration, package, audit, or release gates

#### Scenario: Implementation changes
- **WHEN** any changed path is outside `openspec/**`
- **THEN** validation SHALL select affected implementation scopes plus mandatory invariants and smoke coverage

#### Scenario: Implementation scope is uncertain
- **WHEN** an implementation path is unknown or cannot be compared safely with a trusted base
- **THEN** validation SHALL select the complete automated suite

#### Scenario: Wider implementation validation is requested
- **WHEN** an authorized request selects full validation for an implementation change
- **THEN** validation SHALL widen to the complete suite and SHALL NOT remove automatically required gates

### Requirement: Validation tiers avoid duplicate work
The repository SHALL define non-overlapping fast, affected-integration, package, and full-release validation tiers. A workflow SHALL execute each selected test or deterministic gate at most once for a candidate, and build output reused by later validation or packaging SHALL be produced once rather than rebuilt independently by overlapping gates.

#### Scenario: Ordinary feature change is validated
- **WHEN** a change does not affect packaging, dependencies, release behavior, or a global contract
- **THEN** validation SHALL run fast repository-wide checks and affected integration scopes without running the clean consumer package-install gate

#### Scenario: Packaging behavior changes
- **WHEN** the affected-scope policy identifies package-sensitive input
- **THEN** validation SHALL include package-content checks and a clean installation of the exact candidate package

#### Scenario: Selected gates overlap
- **WHEN** a release-specific set contains a test already executed by another selected tier
- **THEN** the workflow SHALL deduplicate the test while retaining one recorded successful result for every required contract

### Requirement: Complete regression runs reconcile scoped validation
The complete automated suite SHALL run on a schedule, on explicit demand, and for every stable candidate regardless of affected-scope selection. A failure SHALL identify its owning scope and prevent stable certification until corrected against the exact stable candidate.

#### Scenario: Scheduled regression executes
- **WHEN** the scheduled full-regression workflow runs
- **THEN** it SHALL execute all non-physical automated scopes, including expensive package and release integration gates, and preserve per-scope timing and outcome evidence

#### Scenario: Scoped validation missed an interaction
- **WHEN** a scheduled or stable full run fails outside the scopes selected for an earlier change
- **THEN** the failure SHALL block stable certification and the impact mapping or mandatory coverage SHALL be expanded before the correction is accepted

### Requirement: Candidate artifacts are immutable across certification and publication
A preview or stable candidate SHALL be built and packed once for its final package version. Certification evidence SHALL bind the exact source commit, package version, tarball digest, certification class, selected scopes, and successful workflow identity; publication SHALL consume those exact bytes without rebuilding or substituting source output.

#### Scenario: Candidate is approved for publication
- **WHEN** the required certification for a candidate succeeds and publication is approved
- **THEN** the publisher SHALL verify the evidence, commit, version, and tarball digest and upload the certified tarball without rerunning the test suite or rebuilding it

#### Scenario: Published input differs
- **WHEN** the available tarball, commit, version, or digest differs from certification evidence
- **THEN** publication SHALL fail before contacting npm and require certification of a new candidate

### Requirement: Stable certification is complete and version-independent
Every stable candidate SHALL run the complete automated release suite against its final SemVer package bytes on Windows, Linux, and macOS, together with any independent physical evidence required for claimed platform support. Stable workflow logic SHALL derive the version and matching tag rather than embed one historical release number, and `latest` publication SHALL require all stable evidence for the exact candidate.

#### Scenario: A subsequent stable version is prepared
- **WHEN** a final package version and matching `v<version>` tag are proposed from the accepted master commit
- **THEN** stable workflows SHALL validate that derived version without requiring workflow source edits for that release number

#### Scenario: One platform is incomplete
- **WHEN** an automated supported-platform gate fails or required physical evidence is missing for the exact candidate
- **THEN** stable certification SHALL fail and npm `latest` SHALL remain unchanged

### Requirement: Branch policies enforce validation boundaries
Repository rules SHALL protect `develop` and `master` with required status checks. `develop` SHALL require successful development validation before pull-request integration, while `master` SHALL require the complete exact-candidate stable certification and SHALL reject direct unvalidated release changes.

#### Scenario: Required check has not passed
- **WHEN** a pull request targets a protected branch and its branch-specific required check is absent or unsuccessful
- **THEN** GitHub SHALL prevent the merge

#### Scenario: Stable merge is proposed
- **WHEN** `develop` is proposed for integration into `master`
- **THEN** the exact final-version candidate SHALL have complete stable certification before the merge can complete

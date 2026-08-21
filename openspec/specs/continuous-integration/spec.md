# Continuous Integration Specification

## Purpose

Defines proportionate automated validation: fast checks during development, package gates for previews, and the complete suite only for stable releases.

## Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and specification changes SHALL require no test execution. Pull requests into `develop` SHALL require the fast tier (typecheck, architecture checks, unit and contract tests). Preview (`next`) candidates SHALL additionally require exact-package gates. Only stable (`latest`) candidates SHALL require the complete automated suite.

#### Scenario: Docs-only pull request
- **WHEN** every changed path is documentation, an OpenSpec artifact, a Markdown file, `LICENSE`, or `.gitignore`
- **THEN** the required development check SHALL pass without executing build, test, or architecture gates

#### Scenario: Code pull request targets develop
- **WHEN** a pull request changes any non-documentation path
- **THEN** validation SHALL run the fast tier and architecture checks and the required check SHALL gate the merge

#### Scenario: Preview candidate is built
- **WHEN** a `next` preview candidate is validated
- **THEN** validation SHALL run the fast tier, architecture checks, and exact packed-candidate gates (package content, clean install, dependency policy) without requiring the complete suite

#### Scenario: Stable candidate is certified
- **WHEN** a candidate would move npm `latest` or claim platform support
- **THEN** the complete automated suite SHALL pass against the exact final-version package bytes before publication

### Requirement: Development merges are gated by one required check
GitHub SHALL require the development validation check for pull requests into `develop`, and `master` SHALL require stable candidate certification. Publication workflows SHALL NOT serve as the first automated validation of a change.

#### Scenario: Required check has not passed
- **WHEN** a pull request targets a protected branch and its required check is absent or unsuccessful
- **THEN** GitHub SHALL prevent the merge

### Requirement: Preview and stable artifacts are published from verified bytes
A preview or stable candidate SHALL be packed once for its final package version, its evidence SHALL bind the source commit, version, and tarball digest, and publication SHALL upload those exact bytes without rebuilding.

#### Scenario: Published input differs
- **WHEN** the tarball, commit, version, or digest offered for publication differs from candidate evidence
- **THEN** publication SHALL fail before contacting npm

### Requirement: The complete suite remains available on demand
The complete non-physical automated suite SHALL remain runnable locally (`npm run test:full`) and through manual workflow dispatch, so a maintainer can widen validation when a change feels risky. Routine development SHALL NOT require it.

#### Scenario: Maintainer requests full validation
- **WHEN** the maintainer dispatches the full-regression workflow or runs the full tier locally
- **THEN** every non-physical scope SHALL execute and report per-scope timing and outcomes

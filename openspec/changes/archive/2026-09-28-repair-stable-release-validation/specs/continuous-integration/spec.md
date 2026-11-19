## MODIFIED Requirements

### Requirement: Maintainer release documentation matches the command

The root README release section SHALL present concise, accurate `npm run release -- patch`, `minor`, `major`, and exact-version command examples and SHALL NOT be required to duplicate internal publication lifecycle or recovery prose. The release runbook and applicable command help SHALL explain the target-required rule, prerelease promotion, publication-before-reopening order, next-development version, manual version-PR gate, and safe recovery. They SHALL NOT advertise a no-argument release mode or describe version PRs as self-merging.

A dependency-free semantic governance check SHALL validate the applicable contract whenever the root README or release runbook changes, including documentation-only pull requests eligible for automatic integration. It SHALL reject malformed or resolver-inaccurate command examples and missing runbook safety gates before stable publication. Unrelated documentation changes SHALL not gain product builds or broad product tests solely for this contract.

#### Scenario: Follow the README example

- **WHEN** a maintainer reads the root README release section
- **THEN** `patch`, `minor`, `major`, and exact-version examples SHALL resolve to the documented stable targets
- **AND** the README MAY omit internal reopening and recovery prose

#### Scenario: Read recovery guidance

- **WHEN** a maintainer needs target, publication, reopening, or recovery behavior
- **THEN** the runbook and applicable command help SHALL state that a target is required and distinguish prerelease promotion from an already-stable input
- **AND** the runbook SHALL state that next-development reopening follows confirmed publication and requires manual merge
- **AND** it SHALL not recommend republishing an existing stable version or using `patch` from stable develop to retry the same release

#### Scenario: Documentation-only release commands drift

- **WHEN** a documentation-only pull request changes the root release examples or release runbook
- **THEN** lightweight semantic governance SHALL validate the changed contract before automatic integration
- **AND** inaccurate examples or missing operator safety gates SHALL fail without scheduling broad product tests

## ADDED Requirements

### Requirement: Complete native validation distinguishes semantic failure from bounded fixture release

Native complete-validation fixtures SHALL derive expected filesystem identities through the same platform filesystem semantics as the production contract when canonical identity is behaviorally required. A lexical session path MAY remain distinct where the product intentionally presents it, but tests SHALL NOT treat native aliases such as macOS `/var` and `/private/var` as different trust identities.

After a fixture has awaited all owned runtime and adapter disposal, test-only removal MAY retry operating-system transient `EBUSY`, `EPERM`, or equivalent recursive-removal release conditions within a fixed bound. It SHALL NOT retry the test body, semantic assertions, application operation, or process lifecycle. Exhausting the cleanup bound SHALL remain a failed test with the fixture path available in the error.

#### Scenario: macOS exposes a temporary-directory alias

- **WHEN** a trust fixture receives lexical `/var` but the filesystem resolves the project under `/private/var`
- **THEN** expected trust options and persisted identities SHALL use the canonical project and parent paths
- **AND** an intentionally lexical prompt heading SHALL remain lexical

#### Scenario: Windows briefly retains a disposed fixture path

- **WHEN** all runtime owners have completed disposal but recursive temporary-root removal receives a transient filesystem lock
- **THEN** test-only cleanup MAY retry removal within its fixed bound
- **AND** a persistent lock after the bound SHALL fail validation

#### Scenario: A semantic runtime assertion fails

- **WHEN** session resumability, extension preservation, disposal, or another runtime assertion fails
- **THEN** cleanup retry behavior SHALL NOT rerun or convert that assertion into success

## ADDED Requirements

### Requirement: Patch releases preserve prerelease-aware version semantics
Invoking `npm run release -- patch` SHALL promote a valid current prerelease version to its stable core without incrementing that core, and SHALL increment the patch number when the current version is already stable. The command SHALL report the source version, selected stable target, and prospective next development version before mutations.

The release command SHALL continue to require a target. It SHALL reject a missing target, invalid version, unknown target, invalid exact target, or extra positional arguments with actionable errors and no version, branch, PR, or publication mutation. No separate no-argument release mode SHALL be introduced. The existing `minor`, `major`, and exact stable-version commands SHALL remain available, with minor/major core-version arithmetic unchanged by this patch fix. Existing stable registry versions and tags SHALL remain protected against reuse or movement.

#### Scenario: Release the current development version with patch
- **WHEN** the repository declares `0.1.8-dev` and the maintainer invokes `npm run release -- patch`
- **THEN** the selected stable target SHALL be `0.1.8`
- **AND** the prospective development reopening SHALL be `0.1.9-dev`
- **AND** the command SHALL NOT select `0.1.9` as the stable target

#### Scenario: Promote a numbered development version
- **WHEN** the current version is `0.1.8-dev.123` and the target is `patch`
- **THEN** the stable target SHALL be `0.1.8`, not a version incremented from the preview number

#### Scenario: Increment an already-stable patch
- **WHEN** the repository declares stable `0.1.8` and the maintainer invokes `npm run release -- patch`
- **THEN** the selected stable target SHALL be `0.1.9`
- **AND** its prospective development reopening SHALL be `0.1.10-dev`

#### Scenario: Promote another valid prerelease with patch
- **WHEN** the current version is `0.1.8-rc.1` and the target is `patch`
- **THEN** the stable target SHALL be `0.1.8`, following the same prerelease-aware patch rule

#### Scenario: Retain minor and major targets
- **WHEN** the current version is `0.1.8-dev` and the maintainer explicitly supplies `minor` or `major`
- **THEN** the stable target SHALL be `0.2.0` or `1.0.0` respectively

#### Scenario: Request an exact stable target
- **WHEN** the maintainer supplies the valid exact target `0.4.0`
- **THEN** the selected stable target SHALL be `0.4.0` and its prospective development reopening SHALL be `0.4.1-dev`
- **AND** the existing registry and tag guards SHALL still apply

#### Scenario: Omit the required target
- **WHEN** the maintainer invokes `npm run release` without a target
- **THEN** the command SHALL display usage requiring `patch`, `minor`, `major`, or an exact stable version
- **AND** it SHALL make no release mutations

### Requirement: Release version pull requests require manual integration
Both the stable-version PR and the next-development-version PR SHALL remain subject to required validation, local maintainer acceptance, and manual merge. The release command SHALL NOT enable auto-merge, directly merge either PR, relax branch protection, or treat CI success alone as permission to advance. It SHALL display each PR's URL and phase-specific manual steps and verify its actual merge before continuing beyond that gate.

Version preparation SHALL preserve the caller's checkout, staged/unstaged work, and unrelated worktrees. Version edits SHALL affect only this package's manifest and root lockfile version fields, not dependency versions. Pending or failed phase work SHALL remain identifiable without destructive resets or silent replacement of a conflicting branch/PR.

#### Scenario: Prepare the stable version PR
- **WHEN** the command prepares `0.1.8` from `0.1.8-dev`
- **THEN** it SHALL present the stable-version PR for manual validation and merge
- **AND** publication SHALL not begin merely because the PR exists or its CI passed

#### Scenario: A version PR is not merged
- **WHEN** either version PR is closed without merging, cannot be verified, or remains pending beyond the bounded wait
- **THEN** the command SHALL stop that phase and report its PR identity and incomplete state
- **AND** it SHALL neither merge automatically nor claim that develop has advanced

#### Scenario: Local work appears while a release waits
- **WHEN** the caller's checkout changes while release orchestration is awaiting a PR or publication
- **THEN** those changes SHALL be preserved
- **AND** any unsafe local synchronization SHALL be declined with the authoritative remote state reported

### Requirement: Development reopens only after verified stable publication
The command SHALL prepare the next patch development version only after successful publication of the selected stable version is confirmed through the existing exact-source publication authority. It SHALL verify that the stable PR's merged version and SHA correspond to the authoritative publication source, and SHALL fail rather than silently substitute a newer source SHA.

For released `x.y.z`, the reopening target SHALL be `x.y.(z+1)-dev`. Reopening SHALL be reported complete only after its separate PR is manually merged and the remote version is verified. Failed or uncertain publication SHALL not trigger reopening. Successful publication followed by incomplete reopening SHALL be reported as two distinct outcomes without republishing or altering immutable release records.

#### Scenario: Finish the current release cycle
- **WHEN** the stable `0.1.8` PR is manually merged and exact-source publication is confirmed successful
- **THEN** the command SHALL prepare a separate PR for `0.1.9-dev`
- **AND** it SHALL report develop reopened at `0.1.9-dev` only after that PR is manually merged and verified

#### Scenario: Publication fails or remains uncertain
- **WHEN** stable publication fails, times out, or cannot be confirmed
- **THEN** no next-development-version PR SHALL be created by that attempt
- **AND** the command SHALL provide inspection guidance without claiming release success

#### Scenario: The publication source becomes stale
- **WHEN** authoritative develop no longer matches the selected stable PR's verified publication source
- **THEN** the command SHALL stop with the mismatch
- **AND** it SHALL not publish a newly selected SHA without a fresh deliberate release decision

#### Scenario: Reopening is incomplete after publication
- **WHEN** `0.1.8` is confirmed published but the `0.1.9-dev` PR fails or is not merged
- **THEN** the command SHALL distinguish published `0.1.8` from pending development reopening
- **AND** it SHALL not republish `0.1.8`, move its tag, or falsely report develop at `0.1.9-dev`

### Requirement: Maintainer release documentation matches the command
The README release section, release runbook, and command help SHALL document `npm run release -- patch` with distinct prerelease and already-stable examples, retain accurate minor/major/exact-version examples, and explain both manual version-PR gates. They SHALL state that a target is required and SHALL NOT advertise a no-argument release mode. They SHALL state that `0.1.9-dev` follows confirmed `0.1.8` publication and manual reopening, not initial invocation. They SHALL not describe version PRs as self-merging. These documentation changes SHALL accompany the implemented behavior.

#### Scenario: Follow the README example
- **WHEN** a maintainer reads the release instructions for a checkout declaring `0.1.8-dev`
- **THEN** the primary example SHALL be `npm run release -- patch` selecting stable `0.1.8`
- **AND** a separate example SHALL show the same command selecting `0.1.9` only when its input is already-stable `0.1.8`
- **AND** the instructions SHALL identify manual merge requirements and publication-before-reopening order

#### Scenario: Read recovery guidance
- **WHEN** a release stops before publication or after publication but before reopening
- **THEN** the runbook SHALL distinguish those phases and their safe inspection/recovery steps
- **AND** it SHALL not recommend republishing an existing stable version or using `patch` from stable develop to retry the same release

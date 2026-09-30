## RENAMED Requirements

- FROM: `### Requirement: Release version pull requests require manual integration`
- TO: `### Requirement: Release reopening pull requests integrate after validation`

## MODIFIED Requirements

### Requirement: Release reopening pull requests integrate after validation
The post-publication next-development pull request SHALL remain subject to required
validation and SHALL integrate automatically through the documentation auto-merge
manager's verified release-reopening route once its exact current head passes required
validation. The release command SHALL NOT create a pre-publication release-note or
stable-version pull request, enable auto-merge itself, directly merge the reopening PR,
relax branch protection, or treat CI success on any head other than the current one as
permission to advance. It SHALL display the draft Release and reopening PR URLs with
phase-specific steps and verify the reopening PR's actual merge before reporting
completion. A reopening PR that fails verification SHALL fall back to manual merge.

Reopening preparation SHALL preserve the caller's checkout, staged/unstaged work,
and unrelated worktrees. Version edits SHALL affect only this package's manifest and
root lockfile version fields, not dependency versions, and the only additional file
SHALL be the exact approved `docs/releases/<released-version>.md`. Pending or failed
work SHALL remain identifiable without destructive resets or silent replacement of a
conflicting draft, branch, or PR. Reusing an existing reopening PR SHALL accept only no
armed auto-merge or squash auto-merge armed by the trusted manager.

#### Scenario: Prepare the stable version PR
- **WHEN** the command prepares stable `0.1.8` from `0.1.8-dev`
- **THEN** it SHALL present the draft GitHub Release for editing and SHALL create no stable-version or release-note pull request

#### Scenario: Prepare the reopening PR
- **WHEN** stable `0.1.8` is published successfully
- **THEN** the command SHALL present one PR containing `0.1.9-dev` version changes and the exact approved `docs/releases/0.1.8.md`
- **AND** that PR SHALL integrate without maintainer merge action once its current head passes required validation

#### Scenario: A version PR is not merged
- **WHEN** the reopening PR is closed without merging, cannot be verified, or remains pending beyond the bounded wait
- **THEN** the command SHALL report its identity and incomplete state without merging it itself or claiming that development reopened

#### Scenario: Local work appears while a release waits
- **WHEN** the caller's checkout changes while release orchestration is awaiting publication or the reopening PR
- **THEN** those changes SHALL be preserved and any unsafe local synchronization SHALL be declined with authoritative remote state reported

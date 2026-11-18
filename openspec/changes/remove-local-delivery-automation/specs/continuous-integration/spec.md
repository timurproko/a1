## MODIFIED Requirements

### Requirement: Final implementation validation remains attached to the pull request

Validation that authorizes handoff or integration of a finalized version-3 implementation SHALL execute from a native pull-request event for the exact finalized head. Its selected lanes, queued/running/completed state, failures, and stable `Development validation required` aggregate SHALL be associated with and visible from that pull request's checks UI.

Development validation SHALL defer an implementation candidate whose finalized-head body binding is absent or differs from the event head. A later ordinary pull-request event with a matching binding SHALL perform the applicable impact-selected product, governance, and aggregate checks. Development validation SHALL NOT itself validate the delivery record; the shared delivery workflow's check owns that decision. Earlier-head, branch-only, manually dispatched, `workflow_run`, or synthetic commit-status evidence SHALL NOT substitute for that PR-associated run.

#### Scenario: Final head enters ordinary validation
- **WHEN** a pull-request event identifies a finalized version-3 head whose body binding matches that exact head
- **THEN** Development validation SHALL run the applicable PR-context checks
- **AND** GitHub SHALL show their progress and final aggregate on the pull request

#### Scenario: Pre-finalization run is superseded
- **WHEN** finalization moves the pull request from an implementation head to a new finalized head
- **THEN** validation for the earlier head SHALL NOT authorize merge
- **AND** the finalized head SHALL receive a distinct PR-associated run before the required aggregate can pass

#### Scenario: Finalized-head binding is stale
- **WHEN** a pull-request event's head differs from the version-3 finalized-head binding in its body
- **THEN** Development validation SHALL defer product suites and SHALL emit no successful protected aggregate
- **AND** trusted finalization SHALL remain responsible for publishing the matching binding and event

#### Scenario: Manual dispatch targets the same branch
- **WHEN** a maintainer manually dispatches Development validation against a finalized implementation branch
- **THEN** the run MAY provide diagnostic coverage in Actions
- **AND** SHALL NOT replace the PR-associated selection, visibility, or aggregate evidence required for integration

### Requirement: Release reopening pull requests integrate after validation
The post-publication next-development pull request SHALL remain subject to required
validation and SHALL integrate automatically through the release-reopening auto-merge
manager once its exact current head passes required validation. The release command SHALL NOT create a pre-publication release-note or
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

## REMOVED Requirements

### Requirement: Documentation-only changes merge on their own
**Reason**: Documentation pull requests follow the same delivery path as every other change, so one workflow covers all pull requests.

**Migration**: A maintainer merges a documentation pull request, or arms auto-merge on it.

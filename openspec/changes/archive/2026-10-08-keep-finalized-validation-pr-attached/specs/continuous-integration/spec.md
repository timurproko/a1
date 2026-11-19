## ADDED Requirements

### Requirement: Final implementation validation remains attached to the pull request

Validation that authorizes handoff or integration of a finalized version-3 implementation SHALL execute from a native pull-request event for the exact finalized head. Its selected lanes, queued/running/completed state, failures, and stable `Development validation required` aggregate SHALL be associated with and visible from that pull request's checks UI.

Development validation SHALL defer an implementation candidate whose finalized-head body binding is absent or differs from the event head. A later ordinary pull-request event with a matching binding SHALL perform the applicable finalized-delivery, acceptance, impact-selected product, governance, and aggregate checks. Earlier-head, branch-only, manually dispatched, `workflow_run`, or synthetic commit-status evidence SHALL NOT substitute for that PR-associated run.

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
- **AND** SHALL NOT replace the PR-associated delivery, acceptance, selection, visibility, or aggregate evidence required for integration

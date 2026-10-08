## ADDED Requirements

### Requirement: Finalization publishes an exact-head PR validation trigger

Every finalized version-3 implementation fence SHALL bind its archive and acceptance manifest to the exact finalized pull-request head. Draft or active metadata SHALL omit the finalized fields. A missing, malformed, partial, or stale finalized-head binding SHALL NOT authorize protected implementation validation.

After trusted automation pushes a finalization or re-finalization commit, it SHALL update the implementation fence with that exact pushed head only after freshly confirming that both the pull-request body and head remain the values the operation expects. The body transition SHALL produce an ordinary pull-request event for the final head so Development validation is PR-associated. A concurrent body or head change SHALL produce a bounded retry without overwriting human text or binding a newer candidate to stale evidence.

Once the finalized tree, archive paths, body, and exact-head binding agree, repeated finalization events SHALL be idempotent and SHALL NOT create another commit, body edit, validation event, or event loop.

#### Scenario: First finalization publishes visible validation
- **WHEN** trusted automation finalizes a ready active version-3 implementation and pushes the finalization commit
- **THEN** it SHALL update the implementation fence with the exact pushed head
- **AND** that body update SHALL start ordinary PR-associated Development validation for the final head

#### Scenario: Re-finalization reuses archive paths
- **WHEN** trusted automation re-finalizes a corrected candidate under the same archive and acceptance-manifest paths
- **THEN** the changed exact-head binding SHALL still produce a body transition
- **AND** the new final head SHALL receive its own PR-associated validation rather than inherit or wait forever for the earlier head's result

#### Scenario: Candidate advances before the body update
- **WHEN** the pull-request head changes after the finalization push but before the exact-head fence update
- **THEN** automation SHALL NOT write the stale binding
- **AND** SHALL report a bounded retry so the newer candidate can be finalized normally

#### Scenario: Human text changes before the body update
- **WHEN** the pull-request body changes after finalization read it
- **THEN** automation SHALL preserve the newer body and report a bounded retry
- **AND** SHALL NOT overwrite the edit merely to trigger validation

#### Scenario: Finalized candidate is already bound
- **WHEN** the finalized tree, paths, body, and head binding already match the current pull request
- **THEN** finalization SHALL report `already-finalized`
- **AND** SHALL NOT mutate the body or trigger another validation cycle

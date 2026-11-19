## MODIFIED Requirements

### Requirement: Protected refs retain distinct responsibilities
`develop` SHALL reject deletion and non-fast-forward updates, require a pull request,
require resolved review threads, require `Development validation required` with
no bypass actor, and require the pull request head to be up to date with `develop`
before merge, so that a candidate validated and finalized against a base that has
since advanced is reconciled, re-finalized, and revalidated before integration.
`master` SHALL reject deletion and non-fast-forward updates while
remaining writable by a successful stable release fast-forward. `v*` tags SHALL
reject deletion and movement. Any change to approvals, strict-base policy, merge
methods, or bypass authority SHALL require an explicit specification decision.

#### Scenario: Pull request validation is incomplete
- **WHEN** a pull request targeting `develop` lacks a successful required check
- **THEN** GitHub SHALL prevent integration

#### Scenario: Base advanced after validation
- **WHEN** `develop` gains a commit after a pull request's required check succeeded
- **THEN** GitHub SHALL prevent integration until the branch is updated with that base and the required check succeeds again on the updated head
- **AND** the trusted finalization workflow SHALL re-finalize the updated head before that check runs

#### Scenario: Stable release records itself
- **WHEN** npm serves the verified stable package
- **THEN** release automation MAY fast-forward `master` and create the matching immutable `v*` tag

#### Scenario: Protected history is rewritten
- **WHEN** an actor attempts to delete or non-fast-forward a protected branch or move a release tag
- **THEN** GitHub SHALL reject the operation without a bypass

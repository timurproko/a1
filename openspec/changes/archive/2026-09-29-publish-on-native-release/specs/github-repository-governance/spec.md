## MODIFIED Requirements

### Requirement: Protected refs retain distinct responsibilities
`develop` SHALL reject deletion and non-fast-forward updates, require a pull request,
require resolved review threads, require `Development validation required` with
no bypass actor, and require the pull request head to be up to date with `develop`
before merge, so that a candidate validated and finalized against a base that has
since advanced is reconciled, re-finalized, and revalidated before integration.
`master` SHALL reject deletion and non-fast-forward updates with no bypass actor while
remaining writable by a successful stable release fast-forward. `v*` tags SHALL
reject movement for every actor and SHALL reject deletion for every actor except one
declared release-automation GitHub App with `always` bypass, which exists solely so
that a failed stable publication can delete its unconsumed tag before npm. No person,
team, repository role, or other App SHALL bypass any protected ref. Any change to
approvals, strict-base policy, merge methods, or bypass authority SHALL require an
explicit specification decision.

#### Scenario: Pull request validation is incomplete
- **WHEN** a pull request targeting `develop` lacks a successful required check
- **THEN** GitHub SHALL prevent integration

#### Scenario: Base advanced after validation
- **WHEN** `develop` gains a commit after a pull request's required check succeeded
- **THEN** GitHub SHALL prevent integration until the branch is updated with that base and the required check succeeds again on the updated head
- **AND** the trusted finalization workflow SHALL re-finalize the updated head before that check runs

#### Scenario: Stable release records itself
- **WHEN** an authorized human publishes the prepared draft Release and npm serves the verified stable package pair
- **THEN** GitHub SHALL have created the matching `v*` tag at the bound source and release automation MAY fast-forward `master`

#### Scenario: Protected history is rewritten
- **WHEN** an actor attempts to delete or non-fast-forward a protected branch or move a release tag
- **THEN** GitHub SHALL reject the operation without a bypass

#### Scenario: A failed publication removes its unconsumed tag
- **WHEN** the release-automation App deletes a `v*` tag whose Release returned to draft with both packages absent from npm
- **THEN** GitHub SHALL permit that deletion and SHALL reject the same deletion by any other actor

#### Scenario: The bypass is widened
- **WHEN** the declared governance adds a bypass actor to a branch ruleset, a second tag bypass actor, a non-App actor, or a non-`always` bypass mode
- **THEN** governance validation SHALL reject the definition

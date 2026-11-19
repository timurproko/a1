## MODIFIED Requirements

### Requirement: Governed GitHub state is declarative and drift-detectable
A1 SHALL keep one reviewed repository definition for governed repository settings,
Actions policy, security capabilities, environments, labels, and workflow inventory.
Branch and tag rulesets SHALL be declared only in `protection/repositories.json` of the
shared delivery workflow and installed with its `delivery protect` command; the
repository definition SHALL NOT declare, compare, or apply rulesets. A read-only check SHALL compare that definition with live GitHub state and
report field-level drift without mutating the repository. Applying policy SHALL require
a separate explicit maintainer confirmation and SHALL verify live state afterwards.

#### Scenario: Live policy matches
- **WHEN** the read-only governance check compares the reviewed definition with GitHub
- **THEN** it SHALL report every governed field as matching and perform no mutation

#### Scenario: An unnormalized live field drifts
- **WHEN** GitHub differs in a governed field of a declared setting, environment, label, or workflow
- **THEN** the check SHALL fail and identify the exact path of that field

#### Scenario: Ordinary CI evaluates repository policy
- **WHEN** a pull request runs repository governance validation
- **THEN** it SHALL use read-only authority and SHALL NOT apply settings

#### Scenario: Maintainer applies reviewed policy
- **WHEN** the maintainer invokes the policy application command with its exact confirmation
- **THEN** only declared differences SHALL be mutated and a post-apply read SHALL match the definition

### Requirement: Protected refs retain distinct responsibilities
`develop` SHALL reject deletion and non-fast-forward updates, require a pull request,
require resolved review threads, require `Development validation required` and the
shared `delivery / Delivery check`, and require the pull request head to be up to date with `develop`
before merge, so that a candidate validated and finalized against a base that has
since advanced is reconciled, re-finalized, and revalidated before integration.
`master` SHALL reject deletion and non-fast-forward updates with no bypass actor while
remaining writable by a successful stable release fast-forward. `v*` tags SHALL
reject movement for every actor and SHALL reject deletion for every actor except one
declared release-automation GitHub App with `always` bypass, which exists solely so
that a failed stable publication can delete its unconsumed tag before npm. The repository
admin role MAY bypass the `develop` ruleset for pull requests only, so a maintainer can merge
a pull request without waiting for its checks but can never write `develop` without one. No
other person, team, repository role, or App SHALL bypass any protected ref. These rulesets
SHALL be the ones the shared delivery workflow declares for this repository. Any change to
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
- **THEN** GitHub SHALL reject the operation, including for the repository admin

#### Scenario: A failed publication removes its unconsumed tag
- **WHEN** the release-automation App deletes a `v*` tag whose Release returned to draft with both packages absent from npm
- **THEN** GitHub SHALL permit that deletion and SHALL reject the same deletion by any other actor

#### Scenario: The bypass is widened
- **WHEN** a bypass beyond the admin pull-request bypass on `develop` and the single release-automation App on `v*` tags is wanted
- **THEN** it SHALL require an explicit specification decision and a reviewed change to the shared declaration

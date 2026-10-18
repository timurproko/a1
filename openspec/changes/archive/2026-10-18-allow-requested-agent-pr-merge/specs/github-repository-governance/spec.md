## MODIFIED Requirements

### Requirement: Manual development merge is the sole version-3 acceptance action
Every version-3 development PR SHALL remain ineligible for trusted direct merge reconciliation, merge queue integration, documentation auto-merge, and automation-armed native auto-merge. An authorized human maintainer SHALL select the exact finalized head after reviewing its acceptance list by manually merging it after required validation, personally arming native auto-merge for that unchanged head, or explicitly instructing the active agent to merge that identified currently mergeable candidate. The resulting protected integration SHALL mean that maintainer accepts the one to three plain implementation scenarios bound to the committed conditional manifest. Repository automation SHALL NOT edit acceptance state, check boxes, infer human acceptance from CI, arm implementation auto-merge, or merge on the maintainer's behalf.

A maintainer-delegated agent merge SHALL use the authenticated authorized human `User` identity and SHALL occur only after an immediate authoritative refresh proves the PR is open, non-draft, same-repository, targeted to `develop`, current with the target, positively mergeable, finalized for the instructed head, and successful on `Development validation required` for that exact head. The merge SHALL be a normal protected squash merge bound to the expected head SHA. An App, bot, workflow credential, merge queue, administrative bypass, stale read, pending gate, unattended retry, or candidate other than the one explicitly requested SHALL remain unauthorized.

A human arm or agent-merge instruction SHALL remain valid only while the PR head, target, finalization binding, and acceptance list remain unchanged. A new commit, finalization update, acceptance-list edit, target advance, draft conversion, or ambiguous provenance SHALL invalidate the decision and require a new maintainer action.

#### Scenario: Candidate is green
- **WHEN** all exact-head required checks succeed for a version-3 PR without an authorized human arm or explicit exact-candidate merge request
- **THEN** repository automation SHALL leave it open
- **AND** status SHALL identify maintainer merge, human-enabled auto-merge, or an explicit requested agent merge as the remaining acceptance action

#### Scenario: Maintainer manually merges
- **WHEN** an authorized human uses a permitted manual merge method on the exact validated head
- **THEN** implementation, canonical specs, conditional acceptance record, and archive SHALL integrate in one protected operation
- **AND** no later repository mutation SHALL be needed to establish acceptance

#### Scenario: Maintainer enables native auto-merge
- **WHEN** an authorized human enables native auto-merge after the finalized head and acceptance list are current
- **THEN** GitHub MAY integrate that exact head only after required validation succeeds
- **AND** the human arming action SHALL supply acceptance authority without repository automation arming or merging the PR

#### Scenario: Maintainer delegates the current merge
- **WHEN** an authorized maintainer explicitly asks the active agent to merge the identified exact finalized head after required validation succeeds and GitHub reports it current and mergeable
- **THEN** the agent MAY issue one expected-head protected squash-merge request using that maintainer's authenticated human identity
- **AND** the resulting direct merge SHALL supply the same acceptance authority as the maintainer's own direct invocation

#### Scenario: Delegated merge state is stale or unsafe
- **WHEN** the refreshed head, target, finalization, required check, mergeability, repository, draft state, or authenticated principal does not satisfy the delegated-merge requirements
- **THEN** the agent SHALL issue no merge mutation and SHALL report the blocker
- **AND** SHALL NOT bypass protection, arm auto-merge, wait for later eligibility, or transfer the instruction to another candidate

#### Scenario: Candidate changes after arming
- **WHEN** the head, target, acceptance list, lifecycle metadata, or finalized body changes after human auto-merge authorization or an agent-merge instruction
- **THEN** the prior decision SHALL be disabled or treated as stale
- **AND** the maintainer SHALL choose again for the new candidate

#### Scenario: PR body changes
- **WHEN** the acceptance list or lifecycle metadata changes without a new commit
- **THEN** trusted policy SHALL re-evaluate body-to-manifest membership for the current head
- **AND** an invalid edit, stale human arm, or stale agent-merge instruction SHALL block merge rather than being treated as acceptance

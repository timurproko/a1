## MODIFIED Requirements

### Requirement: Code integration requires local maintainer acceptance
Every code/operational pull request SHALL remain open after automated validation until an authorized maintainer chooses its integration. The agent SHALL provide exact applicable local run or inspection instructions and SHALL NOT infer acceptance from CI success. Manual validation SHALL remain the maintainer's optional choice and SHALL NOT be a prerequisite for finalization or integration.

For a finalized single-PR OpenSpec delivery, the pull request SHALL present one to three implementation-specific acceptance scenarios as plain bullets. The maintainer SHALL NOT need to check boxes or perform a separate acceptance edit: manually merging the exact current head after review, personally enabling native auto-merge for that unchanged head, or explicitly instructing the active agent to merge that identified currently mergeable head SHALL mean the maintainer accepts the listed scenarios and authorizes protected integration. A delegated agent SHALL refresh authoritative state immediately before merging, require the instructed exact head, current target, finalized binding, successful required exact-head validation, positive mergeability, and an authorized human GitHub principal, and SHALL use a protected expected-head squash merge without administrative bypass. Any new commit, acceptance-list change, target advance, failed or pending gate, ambiguous request, or unavailable state SHALL cancel that authority and require a fresh maintainer integration decision.

An agent SHALL NOT treat implementation approval, green CI, a standing preference, or an earlier merge request for another candidate as integration authority. It SHALL NOT wait for pending validation, arm auto-merge, use merge queue, use an App/bot or workflow identity, bypass protection, or retry against a changed candidate. Repository automation SHALL remain unable to merge an implementation-bound pull request through this delegated route.

#### Scenario: Code pull request passes CI
- **WHEN** all required automated checks pass for a code/operational pull request without a valid maintainer integration decision
- **THEN** the pull request SHALL remain open
- **AND** the agent SHALL report that an authorized integration choice is still required and that manual validation is optional

#### Scenario: Maintainer has not accepted locally
- **WHEN** the maintainer has neither manually merged, personally armed native auto-merge, nor explicitly requested an agent merge for the exact candidate
- **THEN** neither the agent nor repository automation SHALL merge it or record human acceptance

#### Scenario: Maintainer accepts and authorizes merge
- **WHEN** an authorized maintainer reviews a finalized current-head candidate with its plain acceptance list and manually merges it
- **THEN** that merge SHALL constitute acceptance of the listed scenarios and explicit merge authorization
- **AND** implementation, synchronized specs, acceptance record, and archive SHALL integrate atomically

#### Scenario: Maintainer accepts and enables auto-merge
- **WHEN** an authorized maintainer reviews the finalized current-head candidate and personally enables native auto-merge
- **THEN** the arm SHALL constitute acceptance of the listed scenarios for that exact candidate
- **AND** GitHub MAY integrate it only after required current-head validation succeeds

#### Scenario: Maintainer requests an agent merge
- **WHEN** an authorized maintainer explicitly instructs the active agent to merge one identified finalized candidate that is currently green and mergeable
- **THEN** the agent SHALL re-read the candidate and MAY perform a protected squash merge only for the instructed exact head using expected-head enforcement and the authorized human GitHub credential
- **AND** that instruction and resulting direct merge SHALL constitute the maintainer's acceptance of the listed scenarios

#### Scenario: Requested candidate is not currently eligible
- **WHEN** the instructed PR is draft, stale, behind, conflicted, blocked, pending or failed, ambiguously identified, bound to another finalized head, or cannot be authoritatively read
- **THEN** the agent SHALL leave it unmerged and report the blocker
- **AND** SHALL NOT wait, watch, arm auto-merge, bypass protection, or retain standing authority

#### Scenario: Maintainer integrates without manual validation
- **WHEN** an authorized maintainer directly merges, arms, or requests an agent merge for a finalized current-head candidate without having manually tested it
- **THEN** that integration choice SHALL be as valid as one made after manual testing
- **AND** no policy, check, or checkbox SHALL require evidence of manual validation

#### Scenario: Candidate changes after review
- **WHEN** a new commit, acceptance-list edit, target advance, or finalization update changes the pull-request candidate
- **THEN** prior CI and any earlier human arm or agent-merge instruction SHALL NOT authorize the new candidate
- **AND** the maintainer SHALL make a new integration decision after renewed current-head validation

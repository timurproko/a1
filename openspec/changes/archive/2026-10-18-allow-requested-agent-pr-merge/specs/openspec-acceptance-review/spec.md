## MODIFIED Requirements

### Requirement: Authorized manual merge activates conditional acceptance
An authorized human maintainer's integration decision for the exact finalized version-3 head SHALL be the acceptance action for every listed scenario and the explicit integration authorization. The maintainer MAY manually merge that exact head after required checks succeed, personally enable native auto-merge for the unchanged head and allow GitHub to integrate it after those checks succeed, or explicitly instruct the active agent to merge the identified currently mergeable head. No separate reported-acceptance comment, checkbox edit, review approval, acceptance PR, JSON edit, or archive command SHALL be required. CI success, readiness, plan approval, a merge-queue action, automation-armed auto-merge, an App/bot merge, an unauthorized actor, or an agent's independent decision SHALL NOT supply human acceptance.

For a requested agent merge, the explicit instruction SHALL apply only to the PR and head selected in the current interaction. The agent SHALL immediately refresh authoritative state and SHALL merge only when the candidate remains open, non-draft, same-repository, targeted to current `develop`, positively mergeable, bound to the exact finalized head and acceptance list, and successful on required exact-head validation. It SHALL use the authorized maintainer's authenticated human identity and expected-head protected squash integration without administrative bypass. Pending or failed validation, stale or ambiguous state, a changed candidate, an App/bot/workflow credential, or unavailable evidence SHALL produce no merge and no acceptance.

A human-enabled auto-merge SHALL remain acceptance authority only when immutable provenance binds the authorized enabling user to the final head and no candidate-changing event occurs afterward. A delegated direct merge SHALL retain the existing immutable direct-merge verification of the authenticated authorized human actor, exact source head, successful required check, merge event, commit, and target ancestry; the conversational instruction is the agent's pre-merge authority and is not synthesized as GitHub provenance. A disabled auto-merge attempt SHALL supply no automatic authority and SHALL NOT invalidate a later valid direct merge.

#### Scenario: Maintainer merges exact validated head
- **WHEN** an authorized human manually merges the finalized head after its required checks succeed
- **THEN** the containing conditional manifest SHALL be treated as accepted
- **AND** its exact plain scenario list SHALL be the reviewed human evidence

#### Scenario: Maintainer arms exact finalized head
- **WHEN** an authorized human enables native auto-merge after the finalized head and acceptance list are current
- **THEN** the containing conditional manifest SHALL become accepted only if required exact-head checks succeed and GitHub integrates that unchanged head
- **AND** immutable arming and merge provenance SHALL identify that human as the acceptance authority

#### Scenario: Maintainer asks the agent to merge
- **WHEN** an authorized maintainer explicitly instructs the active agent to merge one identified finalized head whose required checks have succeeded and whose current state is positively mergeable
- **THEN** the instruction SHALL accept that head's exact plain scenario list and authorize one expected-head protected squash merge
- **AND** immutable post-merge verification SHALL attribute the resulting direct integration to the authenticated authorized human account

#### Scenario: Candidate remains open
- **WHEN** a version-3 PR is ready and green but has neither been manually merged, validly armed by an authorized human, nor explicitly requested for exact-head agent merge
- **THEN** acceptance SHALL remain pending
- **AND** repository automation and the agent SHALL NOT merge it

#### Scenario: Requested merge is not currently safe
- **WHEN** the agent's immediate refresh finds a changed head or body, advanced target, draft, conflict, pending or failed required check, non-finalized binding, ambiguous PR, unauthorized principal, or unavailable evidence
- **THEN** acceptance SHALL remain pending and the candidate SHALL remain unmerged
- **AND** the instruction SHALL NOT become standing authority for a later state

#### Scenario: Candidate changes after human arming
- **WHEN** a commit, target advance, finalization update, or acceptance-list edit changes the candidate after the maintainer enables auto-merge or requests an agent merge
- **THEN** that prior authorization SHALL become stale and auto-merge or direct integration SHALL be disabled or rejected
- **AND** the new candidate SHALL require a new human integration decision

#### Scenario: Human attempt is disabled before manual merge
- **WHEN** an authorized human enables auto-merge, trusted policy disables it without integration, and the human later directly merges or explicitly requests an agent merge of the exact validated head
- **THEN** acceptance SHALL derive from the valid direct merge
- **AND** the abandoned enable event SHALL NOT invalidate provenance

#### Scenario: Merge provenance is automatic or unauthorized
- **WHEN** the candidate is merged through merge queue, auto-merge armed by automation, an App/bot, a stale human arm, an agent without an exact maintainer instruction, or an actor lacking required repository authority
- **THEN** post-merge verification SHALL report invalid acceptance provenance
- **AND** SHALL NOT describe the archive as accepted

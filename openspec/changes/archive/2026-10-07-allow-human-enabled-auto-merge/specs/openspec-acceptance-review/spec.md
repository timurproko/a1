## MODIFIED Requirements

### Requirement: Authorized manual merge activates conditional acceptance
An authorized human maintainer's integration decision for the exact finalized version-3 head SHALL be the acceptance action for every listed scenario and the explicit integration authorization. The maintainer MAY either manually merge that exact head after required checks succeed or personally enable native auto-merge for the unchanged head and allow GitHub to integrate it after those checks succeed. No separate reported-acceptance comment, checkbox edit, review approval, acceptance PR, JSON edit, or archive command SHALL be required. CI success, readiness, plan approval, a merge-queue action, automation-armed auto-merge, an App/bot merge, or an unauthorized actor SHALL NOT independently supply human acceptance.

A human-enabled auto-merge SHALL remain acceptance authority only when immutable provenance binds the authorized enabling user to the final head and no candidate-changing event occurs afterward. A disabled auto-merge attempt SHALL supply no automatic authority and SHALL NOT invalidate a later valid manual merge.

#### Scenario: Maintainer merges exact validated head
- **WHEN** an authorized human manually merges the finalized head after its required checks succeed
- **THEN** the containing conditional manifest SHALL be treated as accepted
- **AND** its exact plain scenario list SHALL be the reviewed human evidence

#### Scenario: Maintainer arms exact finalized head
- **WHEN** an authorized human enables native auto-merge after the finalized head and acceptance list are current
- **THEN** the containing conditional manifest SHALL become accepted only if required exact-head checks succeed and GitHub integrates that unchanged head
- **AND** immutable arming and merge provenance SHALL identify that human as the acceptance authority

#### Scenario: Candidate remains open
- **WHEN** a version-3 PR is ready and green but has neither been manually merged nor validly armed by an authorized human
- **THEN** acceptance SHALL remain pending
- **AND** repository automation SHALL NOT arm or merge it

#### Scenario: Candidate changes after human arming
- **WHEN** a commit, finalization update, or acceptance-list edit changes the candidate after the maintainer enables auto-merge
- **THEN** that prior authorization SHALL become stale and auto-merge SHALL be disabled or rejected
- **AND** the new candidate SHALL require a new human integration decision

#### Scenario: Human attempt is disabled before manual merge
- **WHEN** an authorized human enables auto-merge, trusted policy disables it without integration, and the human later manually merges the exact validated head
- **THEN** acceptance SHALL derive from the valid manual merge
- **AND** the abandoned enable event SHALL NOT invalidate provenance

#### Scenario: Merge provenance is automatic or unauthorized
- **WHEN** the candidate is merged through merge queue, auto-merge armed by automation, an App/bot, a stale human arm, or an actor lacking required repository authority
- **THEN** post-merge verification SHALL report invalid acceptance provenance
- **AND** SHALL NOT describe the archive as accepted

### Requirement: Acceptance provenance remains verifiable without a follow-up commit
The archived version-3 conditional manifest SHALL identify the repository, change, source PR, finalized archive, scenario text, and reviewed synchronization baseline without predicting a merge commit or falsely claiming pre-merge acceptance. After merge, the shared reader SHALL combine those committed bytes with GitHub's immutable PR head, required-check, authorized human integration choice, merge actor, merge method, merge time, target commit, and target ancestry to derive the accepted receipt. For human-enabled auto-merge it SHALL additionally verify the active `enabled_by` identity and ordered final-head enable provenance; for manual integration it SHALL verify that no active automatic authority performed the merge. Read-only audit, status, already-archived detection, and local-cleanup checks SHALL use that same verification.

The repository SHALL retain compatibility with valid legacy comment-backed and acceptance-PR-backed receipts. Historical version-3 records SHALL be re-evaluated under the current shared provenance rule without rewriting their PR body, manifest, archive, or merge. Missing remote provenance SHALL fail closed; it SHALL NOT be repaired by mutating `develop` directly.

#### Scenario: Version-3 merge is verified
- **WHEN** the shared reader observes an authorized manual merge of the exact finalized candidate into `develop`
- **THEN** it SHALL derive a complete acceptance result from the conditional manifest and immutable GitHub provenance
- **AND** no repository follow-up commit SHALL be needed

#### Scenario: Version-3 human auto-merge is verified
- **WHEN** the shared reader observes an authorized human arm for the final candidate followed by successful required checks and protected integration of that exact head
- **THEN** it SHALL derive the same complete acceptance result with the enabling human as acceptance author
- **AND** repository automation SHALL NOT be credited with the acceptance decision

#### Scenario: Historical disabled attempt is re-evaluated
- **WHEN** a historical delivery contains human enable, later disable, and valid manual merge events for the exact final head
- **THEN** the shared reader SHALL ignore the abandoned attempt and verify the manual acceptance without mutating history

#### Scenario: Archive exists but provenance is unavailable
- **WHEN** the archive is present but exact PR head, required checks, human integration authority, method, or ancestry cannot be verified
- **THEN** audit and cleanup SHALL remain blocked and report the missing provenance

#### Scenario: Legacy receipt is read
- **WHEN** an archived version-1 or version-2 change contains valid comment-backed or acceptance-PR-backed evidence
- **THEN** the shared reader SHALL preserve and verify that evidence under its original rules
- **AND** SHALL NOT require a version-3 manifest

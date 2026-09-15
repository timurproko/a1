## ADDED Requirements

### Requirement: Acceptance authority is selected by delivery version
The dedicated acceptance-request requirements in this capability SHALL remain authoritative for version-1 and version-2 implementations and their existing records. A version-3 implementation SHALL instead use the finalized ordinary development PR as its visible acceptance surface and SHALL NOT publish a dedicated acceptance PR. Unknown, missing, contradictory, or unsupported version data SHALL fail closed rather than choosing the more permissive route.

#### Scenario: Version-3 candidate is evaluated
- **WHEN** trusted policy verifies a supported version-3 implementation association
- **THEN** it SHALL require single-PR finalization and manual merge acceptance
- **AND** SHALL NOT create a `#<source>(accept)` pull request

#### Scenario: Existing acceptance request is evaluated
- **WHEN** a version-1 or version-2 implementation has an open or merged dedicated acceptance request
- **THEN** existing exact-checklist and authorized-manual-merge verification SHALL remain available
- **AND** automation SHALL NOT rewrite its provenance into a version-3 record

#### Scenario: Version cannot be trusted
- **WHEN** lifecycle metadata is absent, malformed, ambiguous, or conflicts with repository evidence
- **THEN** acceptance SHALL remain unresolved
- **AND** neither the legacy nor single-PR route SHALL manufacture authority

### Requirement: Version-3 acceptance is a plain scenario list in the development PR
A finalized version-3 development PR SHALL display one to three implementation-specific behavior-and-expected-result scenarios under `Acceptance` as plain bullets, not checkboxes. The same ordered scenario text SHALL exist in a committed conditional acceptance manifest within the staged archive. The list SHALL exclude generic process attestations and SHALL be complete enough for the maintainer to understand what their manual merge accepts.

#### Scenario: Acceptance list is valid
- **WHEN** the PR and manifest contain the same one to three concise, distinct, implementation-specific scenarios
- **THEN** candidate validation SHALL accept the list structure without claiming the scenarios passed

#### Scenario: Checkbox state is supplied
- **WHEN** the version-3 acceptance section contains checkboxes or automation-authored pass state
- **THEN** candidate validation SHALL reject the section
- **AND** SHALL direct the author to use plain scenario bullets

#### Scenario: Lists disagree
- **WHEN** PR body scenarios differ from the committed manifest by membership, text, order, or duplication
- **THEN** candidate validation SHALL fail closed and identify the mismatch

### Requirement: Authorized manual merge activates conditional acceptance
An authorized human maintainer's manual merge of the exact finalized version-3 head SHALL be the acceptance action for every listed scenario and the explicit integration authorization. No separate reported-acceptance comment, checkbox edit, review approval, acceptance PR, JSON edit, or archive command SHALL be required. CI success, readiness, plan approval, a merge-queue action, auto-merge, an App/bot merge, or an unauthorized actor SHALL NOT independently supply human acceptance.

#### Scenario: Maintainer merges exact validated head
- **WHEN** an authorized human manually merges the finalized head after its required checks succeed
- **THEN** the containing conditional manifest SHALL be treated as accepted
- **AND** its exact plain scenario list SHALL be the reviewed human evidence

#### Scenario: Candidate remains open
- **WHEN** a version-3 PR is ready and green but has not been manually merged
- **THEN** acceptance SHALL remain pending
- **AND** all automation SHALL leave auto-merge disabled

#### Scenario: Merge provenance is automatic or unauthorized
- **WHEN** the candidate is merged by auto-merge, merge queue, an App/bot, or an actor lacking required repository authority
- **THEN** post-merge verification SHALL report invalid acceptance provenance
- **AND** SHALL NOT describe the archive as accepted

### Requirement: Candidate validation separates objective evidence from human acceptance
Before manual merge, trusted policy SHALL verify the complete final diff, versioned association, finalized archive identity, conditional manifest, canonical-spec synchronization, artifacts, task state, evidence references, known-gap dispositions, exact-head required checks, target baseline, and PR-body scenario membership. Candidate validation SHALL report missing, stale, failed, conflicting, or ambiguous inputs as blockers. It SHALL NOT claim that listed human scenarios were performed or passed.

A new head, changed acceptance manifest, changed acceptance list, changed target baseline, or changed required-check result SHALL invalidate prior candidate validation. Body edits and synchronize events SHALL trigger re-evaluation for the current head. Required branch protection and ordinary product validation SHALL remain the integration gate.

#### Scenario: Objective evidence is incomplete
- **WHEN** required implementation, test, synchronization, task, or known-gap evidence is missing or contradictory
- **THEN** trusted candidate validation SHALL fail
- **AND** manual scenario wording SHALL NOT override the blocker

#### Scenario: Head changes
- **WHEN** a commit is added after a candidate validation result
- **THEN** the prior result SHALL be stale
- **AND** the new head SHALL require complete current-head validation before merge

#### Scenario: Candidate is valid but unmerged
- **WHEN** every machine-verifiable requirement passes for the exact current head
- **THEN** status SHALL report the candidate ready for maintainer review
- **AND** SHALL NOT report accepted or archived integration before manual merge

### Requirement: Acceptance provenance remains verifiable without a follow-up commit
The archived version-3 conditional manifest SHALL identify the repository, change, source PR, finalized archive, scenario text, and reviewed synchronization baseline without predicting a merge commit or falsely claiming pre-merge acceptance. After merge, the shared reader SHALL combine those committed bytes with GitHub's immutable PR head, required-check, merge actor, merge method, merge time, target commit, and target ancestry to derive the accepted receipt. Read-only audit, status, already-archived detection, and local-cleanup checks SHALL use that same verification.

The repository SHALL retain compatibility with valid legacy comment-backed and acceptance-PR-backed receipts. Historical records SHALL remain attributable to their original version and exact implementation identity. Missing remote provenance SHALL fail closed; it SHALL NOT be repaired by mutating `develop` directly.

#### Scenario: Version-3 merge is verified
- **WHEN** the shared reader observes an authorized manual merge of the exact finalized candidate into `develop`
- **THEN** it SHALL derive a complete acceptance result from the conditional manifest and immutable GitHub provenance
- **AND** no repository follow-up commit SHALL be needed

#### Scenario: Archive exists but provenance is unavailable
- **WHEN** the archive is present but exact PR head, required checks, merge actor, method, or ancestry cannot be verified
- **THEN** audit and cleanup SHALL remain blocked and report the missing provenance

#### Scenario: Legacy receipt is read
- **WHEN** an archived version-1 or version-2 change contains valid comment-backed or acceptance-PR-backed evidence
- **THEN** the shared reader SHALL preserve and verify that evidence under its original rules
- **AND** SHALL NOT require a version-3 manifest

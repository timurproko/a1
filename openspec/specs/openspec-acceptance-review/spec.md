# openspec-acceptance-review Specification

## Purpose
Make implementation acceptance visible and exact-head-bound, using authorized manual merge of implementation-specific scenarios while preserving honest evidence and legacy provenance.

## Requirements

### Requirement: Missing acceptance produces a visible review request
For a verified merged implementation with a supported explicit OpenSpec association and no valid acceptance, trusted automation SHALL create or reuse one acceptance PR titled `#<source PR>(accept): <original implementation subject>`. The request body SHALL contain a prominent link to the original implementation PR and a concise unchecked list of only what the maintainer must verify, including unresolved CI, task, evidence, or gap items. Exact identities, completed task inventory, and detailed evidence SHALL remain in the committed review record and its diff rather than being repeated in the PR description. Generating a request SHALL NOT create another proposal, publish an archive, or itself grant acceptance.

#### Scenario: New implementation lacks acceptance
- **WHEN** a supported implementation merges without an acceptance record
- **THEN** automation SHALL publish an acceptance request and link it from the implementation instead of leaving only an acceptance-missing message

#### Scenario: Work is not fully evidenced
- **WHEN** required CI, implementation, or physical review evidence is missing or failed
- **THEN** the acceptance request SHALL visibly list each item as unchecked and SHALL initially remain draft
- **AND** candidate-integrity CI SHALL report those unresolved items without treating a structurally valid, source-bound record as malformed
- **AND** post-merge receipt consumption and completed archival SHALL remain blocked until required outcomes are evidenced

#### Scenario: Source association is unverifiable
- **WHEN** source linkage, merged state, repository identity, or candidate contents cannot be verified
- **THEN** automation SHALL report the identity blocker without guessing a change or publishing an authoritative acceptance record

### Requirement: Only a verified manual acceptance merge grants authority
A committed acceptance request SHALL become an acceptance receipt only after a non-draft same-repository PR into `develop` is verified manually merged by an authorized human maintainer. Verification SHALL bind the exact acceptance PR head, merged record bytes, implementation PR/head/merge, change artifacts, reviewed baseline, required validation, merge actor, and merge time. A title, label, comment, committed request, ordinary implementation merge, bot merge, or unverified automatic merge SHALL NOT substitute for this receipt. Candidate records SHALL express a conditional review decision, not falsely claim an acceptance merge has already happened.

#### Scenario: Maintainer merges the reviewed acceptance request
- **WHEN** the authorized maintainer manually merges the exact validated acceptance PR and its record matches the verified source and reviewed evidence
- **THEN** automation SHALL record that action as explicit acceptance of that implementation head and resume archival evaluation without requiring a JSON comment or archive command

#### Scenario: Acceptance is open or closed without merging
- **WHEN** the acceptance PR has not merged
- **THEN** its record SHALL NOT authorize archival or cleanup

#### Scenario: Candidate changes after validation
- **WHEN** an acceptance record changes or its source/evidence identities no longer match
- **THEN** validation and acceptance SHALL be considered stale and SHALL require renewed current-head checks and review

#### Scenario: Merge provenance is not authoritative
- **WHEN** the actor is unauthorized or automated, the merge is automatic, or required provenance is incomplete
- **THEN** the record SHALL NOT become accepted even if its PR state is merged

### Requirement: Review reconciles evidence without inventing performed work
Generated acceptance requests SHALL preserve source task identities and their recorded state. Unchecked substantive work SHALL remain pending until evidence-backed completion is explicitly recorded and reviewed. A manual merge SHALL attest the review decision, not prove that tests or live scenarios were executed. Only explicitly identified pure acceptance-signoff bookkeeping SHALL be satisfiable by that manual merge itself; mixed implementation, testing, or physical-review tasks SHALL NOT be treated as bookkeeping. Known-gap dispositions SHALL remain distinguishable from full acceptance and SHALL NOT enter automatic completed-change archival.

#### Scenario: Completed work has stale bookkeeping
- **WHEN** evidence demonstrates completion of a specific source task whose checkbox is stale
- **THEN** the same acceptance PR SHALL support an explicit reviewed reconciliation bound to that task's unchanged identity and evidence
- **AND** archive preparation SHALL retain that provenance rather than silently infer completion from merge state

#### Scenario: A required live test was never run
- **WHEN** a required task has no actual outcome
- **THEN** its request SHALL remain blocked for complete acceptance until the outcome is supplied
- **AND** neither request generation nor acceptance merge SHALL fabricate a successful test result

#### Scenario: Only the explicit signoff action remains
- **WHEN** substantive work is evidenced and the remaining designated task solely records the maintainer's acceptance
- **THEN** the verified manual acceptance merge SHALL supply that signoff without requiring an acceptance-of-acceptance PR

#### Scenario: Reviewer records known gaps
- **WHEN** a reviewer records unresolved work or a waiver instead of full completion
- **THEN** automation SHALL preserve the distinction and direct it to the explicit manual-disposition route rather than a completed archive

### Requirement: Acceptance requests are never documentation auto-merge candidates
Acceptance-bound PRs SHALL be excluded from every automatic integration route, including direct merge reconciliation, auto-merge arming, and eligible-docs recovery. Classification SHALL inspect the complete diff, both sides of renames, reserved record paths, and authoritative lifecycle evidence. A concise body need not carry machine metadata; removing or changing editable display text or labels SHALL NOT bypass the exclusion. Existing archive follow-ups that merely carry a copy of accepted evidence SHALL retain their normal CI-gated automatic route.

#### Scenario: Ready acceptance PR passes documentation CI
- **WHEN** an acceptance PR has only allowed documentation paths and successful current-head candidate-integrity checks
- **THEN** it SHALL still await manual merge and any armed auto-merge SHALL be disabled
- **AND** green candidate CI SHALL NOT imply that unchecked human verification items were performed or that an incomplete merged record is archive-authoritative

#### Scenario: Marker is removed or record is renamed
- **WHEN** an acceptance-bound PR loses its display metadata or renames its record
- **THEN** authoritative classification SHALL continue to hold it or fail closed

### Requirement: Recovery is bounded and preserves reviewer work
Merge events, scheduled catch-up, and targeted retry SHALL use the same acceptance policy for supported current and legacy implementation links. Repeated evaluation SHALL reuse the matching request and status comment. Human edits, unknown branch ownership, duplicate records, conflicting receipts, and closed-unmerged requests SHALL NOT be overwritten or silently replaced. An acceptance merge SHALL schedule reevaluation of its linked implementation, not treat the acceptance PR as another implementation needing acceptance.

#### Scenario: Existing blocked change is discovered
- **WHEN** a bounded scan finds a supported merged change blocked only by missing acceptance
- **THEN** it SHALL offer the same visible request as a new implementation, without bulk approval

#### Scenario: Request already exists
- **WHEN** another event or retry evaluates the same source identity
- **THEN** it SHALL reuse the existing request and preserve human-authored review content

#### Scenario: Request was deliberately closed
- **WHEN** the matching request was closed without merging
- **THEN** automation SHALL report that disposition and require explicit targeted retry before replacing it

#### Scenario: Conflicting acceptance or revocation exists
- **WHEN** authoritative legacy or PR-backed evidence conflicts or is revoked
- **THEN** automation SHALL block and identify the conflict rather than choose whichever record permits archival

#### Scenario: Budget or connectivity prevents completion
- **WHEN** evaluation cannot finish within the documented scan/API/publication limits
- **THEN** it SHALL report deferred coverage and preserve continuation without guessing absence or flooding PRs

### Requirement: Acceptance provenance survives archival and cleanup checks
The shared archive reader SHALL support verified PR-backed acceptance and existing valid comment-backed acceptance without inventing comment authorship. Generated archive evidence SHALL retain the acceptance PR/head/merge, record digest, reviewer, and source identities, or the existing legacy comment provenance. Archive validation and already-archived checks SHALL verify that same authority. Local cleanup SHALL consume the shared verified result while retaining actual archive integration, remote-ref absence, explicit ownership release, and local safety gates.

#### Scenario: Existing acceptance comment is valid
- **WHEN** an implementation already has valid unambiguous current-head comment-backed acceptance
- **THEN** it SHALL remain eligible under the existing route without a redundant acceptance request

#### Scenario: PR-backed archive integrates
- **WHEN** an archive based on a verified acceptance PR merges
- **THEN** its retained receipt SHALL support later archive and local-cleanup verification without a synthetic acceptance comment

#### Scenario: Acceptance merged but archive has not
- **WHEN** the acceptance PR has merged but its archive remains missing, open, or unverified
- **THEN** local cleanup SHALL remain blocked

### Requirement: Status explains the next human action
Implementation comments, acceptance PRs, workflow summaries, and read-only audits SHALL distinguish awaiting evidence, awaiting manual acceptance merge, accepted but archive-blocked, archive pending, archived, closed, conflicted, and deferred outcomes. They SHALL link the relevant PRs and identify concrete next actions. A successful workflow run SHALL NOT be described as successful acceptance or archival when candidates remain blocked. Dry-run evaluation SHALL NOT publish or alter records, refs, PRs, task state, or acceptance.

#### Scenario: A check succeeds but acceptance is missing
- **WHEN** reconciliation completes successfully while the change awaits acceptance
- **THEN** status SHALL link the acceptance request and explain the required review or manual merge instead of implying archival completed

#### Scenario: Operator previews backlog recovery
- **WHEN** dry-run mode evaluates new or existing missing-acceptance candidates
- **THEN** it SHALL show proposed requests and blockers without making remote or local lifecycle mutations

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
Before manual merge, trusted policy SHALL verify the complete final diff, versioned association, finalized archive identity, conditional manifest, canonical-spec synchronization, artifacts, task state, evidence references, known-gap dispositions, exact-head required checks, target baseline, and PR-body scenario membership. Candidate validation SHALL report missing, stale, failed, conflicting, or ambiguous inputs as blockers. It SHALL NOT claim that listed human scenarios were performed or passed. For a non-draft head that still holds the active change, it SHALL report `needs-finalization` with trusted finalization automation as the next action rather than a bare failure code.

A new head, changed acceptance manifest, changed acceptance list, changed target baseline, or changed required-check result SHALL invalidate prior candidate validation. Body edits and synchronize events SHALL trigger re-evaluation for the current head, including the head and body that trusted finalization automation publishes. Required branch protection and ordinary product validation SHALL remain the integration gate.

#### Scenario: Objective evidence is incomplete
- **WHEN** required implementation, test, synchronization, task, or known-gap evidence is missing or contradictory
- **THEN** trusted candidate validation SHALL fail
- **AND** manual scenario wording SHALL NOT override the blocker

#### Scenario: Head changes
- **WHEN** a commit is added after a candidate validation result
- **THEN** the prior result SHALL be stale
- **AND** the new head SHALL require complete current-head validation before merge

#### Scenario: Automation publishes the finalized head
- **WHEN** trusted finalization automation pushes the finalization commit and updates the body fence
- **THEN** candidate validation SHALL evaluate that head and body as an ordinary new candidate
- **AND** SHALL report it ready for maintainer review only when every machine-verifiable requirement passes

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

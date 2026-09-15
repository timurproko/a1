## Purpose

Make implementation acceptance a visible, manually reviewed pull request that supplies verified evidence to automatic OpenSpec archival without manufacturing completion.

## ADDED Requirements

### Requirement: Missing acceptance produces a visible review request
For a verified merged implementation with a supported explicit OpenSpec association and no valid acceptance, trusted automation SHALL create or reuse one acceptance PR identifying the change and implementation number. The request SHALL show the exact implementation head and merge commit, reviewed synchronization baseline, actual CI references, recorded evidence, unfinished tasks, known gaps, review instructions, and the statement that its manual merge records acceptance. Generating a request SHALL NOT create another proposal, publish an archive, or itself grant acceptance.

#### Scenario: New implementation lacks acceptance
- **WHEN** a supported implementation merges without an acceptance record
- **THEN** automation SHALL publish an acceptance request and link it from the implementation instead of leaving only an acceptance-missing message

#### Scenario: Work is not fully evidenced
- **WHEN** required CI, implementation, or physical review evidence is missing or failed
- **THEN** the acceptance request SHALL visibly list each blocker and SHALL NOT be presented as ready to accept
- **AND** absent results SHALL remain unknown or pending rather than passed

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
Acceptance-bound PRs SHALL be excluded from every automatic integration route, including direct merge reconciliation, auto-merge arming, and eligible-docs recovery. Classification SHALL inspect the complete diff, both sides of renames, reserved record paths, and authoritative lifecycle evidence. Removing a body marker or label SHALL NOT bypass the exclusion. Existing archive follow-ups that merely carry a copy of accepted evidence SHALL retain their normal CI-gated automatic route.

#### Scenario: Ready acceptance PR passes documentation CI
- **WHEN** an acceptance PR has only allowed documentation paths and successful current-head checks
- **THEN** it SHALL still await manual merge and any armed auto-merge SHALL be disabled

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

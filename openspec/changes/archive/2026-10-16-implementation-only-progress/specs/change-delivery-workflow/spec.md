## MODIFIED Requirements

### Requirement: Code integration requires local maintainer acceptance
Every code/operational pull request SHALL remain open after automated validation until an authorized maintainer chooses its integration. The agent SHALL provide exact applicable local run or inspection instructions and SHALL NOT invoke or arm auto-merge. CI success SHALL NOT count as human acceptance. Manual validation SHALL remain the maintainer's optional choice and SHALL NOT be a prerequisite for finalization or integration.

For a finalized single-PR OpenSpec delivery, the pull request SHALL present one to three implementation-specific acceptance scenarios as plain bullets. The maintainer SHALL NOT need to check boxes or perform a separate acceptance edit: manually merging the exact current head after review, or personally enabling native auto-merge for that unchanged head, SHALL mean the maintainer accepts the listed scenarios and explicitly authorizes protected integration after current-head CI. Any new commit or acceptance-list change SHALL require renewed current-head CI and a new maintainer integration decision.

#### Scenario: Code pull request passes CI
- **WHEN** all required automated checks pass for a code/operational pull request without a valid maintainer arm
- **THEN** the pull request SHALL remain open
- **AND** the agent SHALL report that an authorized integration choice is still required and that manual validation is optional

#### Scenario: Maintainer has not accepted locally
- **WHEN** the maintainer has neither manually merged nor personally armed native auto-merge for the exact candidate
- **THEN** neither the agent nor repository automation SHALL merge it or record human acceptance

#### Scenario: Maintainer accepts and authorizes merge
- **WHEN** an authorized maintainer reviews a finalized current-head candidate with its plain acceptance list and manually merges it
- **THEN** that merge SHALL constitute acceptance of the listed scenarios and explicit merge authorization
- **AND** implementation, synchronized specs, acceptance record, and archive SHALL integrate atomically

#### Scenario: Maintainer accepts and enables auto-merge
- **WHEN** an authorized maintainer reviews the finalized current-head candidate and personally enables native auto-merge
- **THEN** the arm SHALL constitute acceptance of the listed scenarios for that exact candidate
- **AND** GitHub MAY integrate it only after required current-head validation succeeds

#### Scenario: Maintainer integrates without manual validation
- **WHEN** an authorized maintainer merges or arms a finalized current-head candidate without having manually tested it
- **THEN** that integration choice SHALL be as valid as one made after manual testing
- **AND** no policy, check, or checkbox SHALL require evidence of manual validation

#### Scenario: Candidate changes after review
- **WHEN** a new commit or acceptance-list edit changes the pull-request candidate
- **THEN** prior CI and any earlier human arm SHALL NOT authorize the new candidate
- **AND** the maintainer SHALL make a new integration decision after renewed current-head validation

### Requirement: Implementation progress is visible without changing acceptance semantics

Every newly authored version-3 implementation-bound pull request SHALL present its approved scope under `Implementation` as two to ten distinct Markdown task-list items. Each item SHALL describe a delivered implementation outcome at a useful review granularity and SHALL remain separate from the detailed OpenSpec task ledger. Generic CI, review, approval, acceptance, merge, or archive steps SHALL NOT be represented as implementation-progress items, and no item SHALL name running, verifying, validating, recording evidence for, or manually testing work.

The agent SHALL leave each item unchecked during planning and SHALL change only its checkbox marker to checked after the associated code and its tests are written and detailed task bookkeeping is complete. Executing tests SHALL belong to CI after readiness, and manual validation SHALL NOT gate a checkbox. Adding, removing, reordering, or changing item wording after approval SHALL be an implementation-scope refinement requiring explicit maintainer approval and coherent planning-artifact reconciliation; affected scope SHALL remain unchecked until complete.

A pull request using Implementation task-list syntax SHALL NOT become ready or finalize while any item is unchecked or malformed. Historical version-3 pull requests containing only plain Implementation bullets, or items written under the earlier wording rule, SHALL remain readable without body rewrites. Final `Acceptance` scenarios SHALL remain plain bullets, SHALL NOT inherit Implementation checkbox state, and SHALL continue to become accepted only through authorized maintainer integration of the exact validated head.

#### Scenario: Draft exposes approved implementation scope

- **WHEN** an agent creates a new version-3 draft delivery PR
- **THEN** its `Implementation` section SHALL contain two to ten unchecked implementation-specific task items derived from the proposed scope
- **AND** GitHub's native task progress SHALL expose the completed and total implementation item counts

#### Scenario: Agent completes one scope item

- **WHEN** the associated code and its tests are written and the detailed OpenSpec tasks are complete
- **THEN** the agent SHALL change only that PR-body item's marker from unchecked to checked
- **AND** the unchanged item wording and ordering SHALL continue to describe the approved scope

#### Scenario: Item names validation instead of an outcome

- **WHEN** a draft's Implementation item starts with a run, verify, validate, confirm, prove, or test instruction, mentions manual testing, records or captures evidence, or delivers work with coverage, evidence, or validation
- **THEN** draft promotion and the local delivery body check SHALL refuse it with `implementation-progress-validation`
- **AND** post-merge readers SHALL continue to accept merged bodies written under the earlier wording rule

#### Scenario: Implementation scope changes after approval

- **WHEN** an item must be added, removed, reordered, or rewritten
- **THEN** the change SHALL require explicit maintainer refinement approval and coherent updates to the planning artifacts
- **AND** new or affected scope SHALL remain unchecked until its code and tests are written

#### Scenario: Checklist remains incomplete at readiness

- **WHEN** a version-3 candidate uses Implementation task-list syntax and at least one item is unchecked, mixed with plain bullets, malformed, duplicated, or generic process boilerplate
- **THEN** trusted finalization SHALL fail closed with an actionable implementation-progress reason
- **AND** it SHALL NOT interpret partial implementation progress as acceptance

#### Scenario: Historical body uses plain Implementation bullets

- **WHEN** a historical version-3 body contains only the former plain-bullet Implementation form
- **THEN** trusted readers SHALL preserve compatibility without requiring a merged-body edit
- **AND** the compatibility path SHALL NOT permit mixed plain and task-list syntax

#### Scenario: Completed candidate presents acceptance

- **WHEN** every Implementation task-list item and detailed OpenSpec task is complete and the candidate is prepared for finalization
- **THEN** `Acceptance` SHALL contain plain implementation-specific behavior-and-result bullets rather than checkboxes
- **AND** authorized maintainer integration of the exact validated head SHALL remain the acceptance decision

### Requirement: Agents own progress while automation owns readiness

While a pull request remains draft, the agent SHALL check an approved `Implementation` item as soon as that outcome's code and tests are written and its detailed task bookkeeping is complete. Before checking the final item, the agent SHALL add plain `Acceptance`, finish every pre-ready task and gap disposition, and reconcile and push the branch. The final checkbox update SHALL complete the agent-owned implementation job; the agent SHALL NOT invoke the ready mutation.

#### Scenario: One implementation outcome finishes

- **WHEN** an agent writes one approved outcome's code and tests and completes its detailed task bookkeeping
- **THEN** the agent SHALL update only that PR-body item's marker while the pull request remains draft
- **AND** other incomplete implementation outcomes SHALL remain unchecked

#### Scenario: Outcome awaits only CI or manual validation

- **WHEN** an outcome's code and tests are written but its tests can run only in CI or its behavior has not been manually validated
- **THEN** the agent SHALL check that item
- **AND** CI after readiness and the maintainer's optional review SHALL provide that validation

#### Scenario: Final implementation outcome finishes

- **WHEN** the last implementation outcome and every pre-ready input are complete
- **THEN** the agent SHALL finish acceptance, reconciliation, push, and final progress by checking the last item
- **AND** trusted automation, not the agent, SHALL own the ready-for-review transition

#### Scenario: Implementation cannot finish

- **WHEN** stale state, unwritten code or tests, an unfinished task, or another concrete condition prevents implementation completion
- **THEN** the agent SHALL leave the affected progress state truthful and report that blocker
- **AND** it SHALL NOT check incomplete work or invoke the ready mutation

#### Scenario: GitHub checks are green while implementation progress is stale

- **WHEN** GitHub reports completed CI checks but the PR-body Implementation items remain unchecked
- **THEN** the agent SHALL treat those as separate signals and reconcile only truthful implementation progress
- **AND** it SHALL NOT present CI check counts as implementation task completion

## ADDED Requirements

### Requirement: Selected complete PR validation gates repair handoff without a dispatch cycle
A delivery whose trusted PR selection requires Full regression SHALL use that PR-attached complete run as a required exact-final-head handoff gate together with the existing protected aggregate. It SHALL not require a second manual Full regression dispatch merely to repeat successful selected PR execution. Draft implementation runs MAY provide investigation and pre-finalization evidence but SHALL not certify later heads, authorize implementation without approval, finalize a draft, or establish human acceptance.

Implementation, substantive tasks, focused evidence, and gap disposition SHALL be complete before normal ready/finalization handling. Required post-finalization CI outcomes SHALL remain pending integration gates until they actually succeed; they SHALL not be represented as already completed implementation tasks or as evidence that must name a future final-head run before finalization can proceed. The final run, source head, target/selection identity, and lane results SHALL be preserved in PR-associated Actions evidence and reported at handoff. An additional committed design/task edit or accepted-body edit solely to insert that final run identifier SHALL not be required. Existing manual acceptance, target currency, and renewed validation after material changes SHALL remain unchanged.

#### Scenario: Implementation is ready for final validation
- **WHEN** approved implementation, substantive tasks, pre-finalization evidence, and gap disposition are complete
- **THEN** the candidate MAY enter normal ready/finalization handling while final-head remote checks remain pending
- **AND** no task SHALL falsely claim the future complete-regression run already passed

#### Scenario: Finalization creates a new head
- **WHEN** finalization pushes a new candidate head
- **THEN** PR validation SHALL execute all selected complete-regression and ordinary gates against that head
- **AND** earlier draft or independent workflow results SHALL not authorize its integration

#### Scenario: Final candidate is handed to the maintainer
- **WHEN** selected complete regression and every other required exact-head gate succeed
- **THEN** the handoff SHALL identify that PR run and head without another dispatch or evidence-only commit
- **AND** the PR SHALL remain open for authorized manual merge

#### Scenario: Candidate or selection changes after success
- **WHEN** source head, acceptance list, manifest, target baseline, or relevant regression-selection metadata changes
- **THEN** the previous result SHALL not authorize handoff of the changed candidate
- **AND** applicable finalization and current-selection validation SHALL run again

#### Scenario: Draft full validation passes
- **WHEN** selected full checks pass on an implementation-bearing draft
- **THEN** their result SHALL be implementation feedback only
- **AND** planning approval, completion, finalization, final-head validation, and manual integration requirements SHALL remain in force

#### Scenario: Selected validation fails
- **WHEN** a required complete-regression lane is failed, cancelled, missing, stale, or unexpectedly skipped
- **THEN** the repair SHALL not be handed off as validated even if focused checks or an independent branch run passed

#### Scenario: PR validation succeeds but numbered nightly recovery is unproven
- **WHEN** a repair's final PR checks succeed but the actual repaired numbered-package nightly outcome is unavailable
- **THEN** the implementation MAY proceed to manual review under its normal gates
- **AND** no report SHALL claim recovered nightly publication solely from that PR result

## ADDED Requirements

### Requirement: Checked implementation scenarios are the complete human evidence
Before implementation integration, the implementation pull request SHALL contain a curated `Acceptance checks` section with one to three concise checks that name behavior specific to that implementation and the expected observable result. The checks SHALL NOT include generic review, CI, no-gap, approval, or archival boilerplate and SHALL NOT copy the implementation task ledger or automated test inventory. The implementation PR link SHALL appear in the later acceptance PR only as a plain reference, not as a checkbox.

An authorized maintainer checking every exact implementation-specific item and manually merging the acceptance pull request SHALL be the human evidence that those scenarios passed. Manual merge itself SHALL be the approval action; no redundant approval checkbox or JSON edit SHALL be required. A verified all-checked manual merge SHALL reconcile remaining non-mechanical source-task bookkeeping for the archived copy and SHALL automatically resume conservative synchronization and archive publication. Mechanical archive-preparation tasks SHALL retain their operation-bound completion rules.

#### Scenario: Scrollbar implementation is reviewed
- **WHEN** an implementation adds scrollbar behavior
- **THEN** its acceptance checklist SHALL contain only one to three observable scrollbar scenarios, such as appearance on overflow and correct viewport movement
- **AND** SHALL NOT repeat generic repository review or automated-test checkboxes

#### Scenario: Implementation reference is displayed
- **WHEN** an acceptance request is generated
- **THEN** it SHALL show the linked implementation PR as plain reference text
- **AND** reviewing that link SHALL NOT be represented as a mandatory checkbox

#### Scenario: Maintainer accepts implementation-specific checks
- **WHEN** an authorized maintainer checks every exact generated scenario and manually merges the acceptance pull request
- **THEN** the checked scenarios and manual merge SHALL constitute the human acceptance evidence
- **AND** automation SHALL proceed to archive preparation without JSON edits, another approval checkbox, another acceptance action, or another archive command

#### Scenario: Checklist is not fully checked
- **WHEN** any generated scenario remains unchecked when the acceptance pull request merges or closes
- **THEN** automation SHALL NOT treat the pull request as acceptance
- **AND** SHALL report the incomplete checklist without inferring completion from merge state alone

#### Scenario: Automated checks remain machine-owned
- **WHEN** the acceptance pull request is reviewed
- **THEN** source CI, exact implementation identity, candidate scope, and merge provenance SHALL be verified by automation rather than represented as human checkboxes

#### Scenario: Archive bookkeeping remains operation-bound
- **WHEN** the all-checked manual merge accepts remaining source tasks
- **THEN** archive preparation MAY reconcile non-mechanical source-task bookkeeping in the archived copy
- **AND** SHALL NOT claim that archive preparation or archive integration occurred before those operations actually succeed

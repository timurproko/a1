## ADDED Requirements

### Requirement: Development publication workflow completion summary

After a successful observed development publication workflow, the observer SHALL print exactly one blank line after the job list, followed by the unindented line `[workflow] passed; verifying npm packages.`. The subsequent develop publication result SHALL retain its existing format without an intervening blank line. Workflow success SHALL NOT replace registry verification or change failure and cancellation behavior.

#### Scenario: A successful workflow enters registry verification

- **WHEN** the observed development publication workflow completes successfully
- **THEN** both append-only and interactive output SHALL separate the final job row from the bracketed workflow summary by one blank line
- **AND** the observer SHALL print `[workflow] passed; verifying npm packages.` before registry verification completes
- **AND** the develop publication result SHALL retain its existing format directly below that summary

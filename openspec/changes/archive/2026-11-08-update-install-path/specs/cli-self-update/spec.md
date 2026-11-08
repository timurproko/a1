## ADDED Requirements

### Requirement: Self-update has one install path
Every self-update SHALL resolve npm's CLI entry before changing anything, SHALL make sure an approved prior release can launch before the package is replaced, SHALL replace the package through protected replacement, and SHALL roll back to the prior release when a later step fails. Which collaborators a caller supplies SHALL NOT change which of these steps run or their order.

#### Scenario: No approved release exists before an update
- **WHEN** a self-update starts and no approved release is active
- **THEN** it SHALL record and approve a recovery release from the running package before npm replaces the package
- **AND** it SHALL replace the package only through protected replacement

#### Scenario: Activation fails after the package was replaced
- **WHEN** activating the installed release fails
- **THEN** the update SHALL roll back to the prior active release and record the failure with the rollback result
- **AND** it SHALL exit with a non-zero status

# Spec Delta

## ADDED Requirements

### Requirement: Resident prompt admission is attachment-size independent
A resident tab SHALL durably record bounded submission identity and recoverable prompt text before dispatch without copying attachment payloads into the prompt-journal record. A prompt accepted by the owned attachment limits SHALL reach the agent with every validated attachment exactly once. Journal failure SHALL still preserve the draft and dispatch nothing.

#### Scenario: Valid screenshots exceed the journal record cap
- **WHEN** a resident-tab prompt contains valid screenshots whose combined encoded payload exceeds the prompt journal's per-record limit
- **THEN** journal admission SHALL remain within its bound
- **AND** the agent SHALL receive the prompt text and every validated screenshot exactly once

#### Scenario: Bounded journal admission fails
- **WHEN** the resident journal cannot durably record the bounded submission metadata and recoverable text
- **THEN** A1 SHALL retain the draft with visible recovery-journal feedback
- **AND** it SHALL dispatch neither text nor attachments

### Requirement: Resident prompt settlement closes the current admission
A completed resident submission SHALL be correlated, synchronized, settled, and retired even when command completion is observed after the session lifecycle has already returned to ready. When no unfinished submission remains, the journal SHALL become compactable without requiring another user prompt.

#### Scenario: First prompt completes while the tab stays open
- **WHEN** a resident tab completes its first prompt and no later prompt is submitted
- **THEN** that prompt SHALL be retired after the session is synchronized
- **AND** a later restart SHALL NOT offer it as unfinished
- **AND** the fully retired journal SHALL be compactable without another submission

#### Scenario: Steering remains active
- **WHEN** a steering or follow-up command is admitted while the session remains busy
- **THEN** its journal entry SHALL remain unfinished until the associated run settles
- **AND** ready-state reconciliation SHALL NOT retire it early

### Requirement: Interrupted image prompt recovery is honest
Recovery SHALL rehydrate image chips only from validated attachment sidecars available to the selected profile. Missing or unavailable attachments SHALL be removed from recovered editor text rather than shown as live-looking inert chips. Recovery SHALL never resend an interrupted prompt automatically.

#### Scenario: Verified sidecars remain available
- **WHEN** an interrupted image-bearing prompt is recovered and every referenced sidecar validates
- **THEN** the editor SHALL restore the recoverable text with live attachments in their original positions
- **AND** A1 SHALL wait for an explicit user submission

#### Scenario: Sidecar is missing or history is disabled
- **WHEN** an interrupted image-bearing prompt is recovered without a valid sidecar for one or more image chips
- **THEN** the editor SHALL preserve the remaining recoverable text and attachments
- **AND** it SHALL remove every unresolved image token instead of presenting it as an attached screenshot
- **AND** A1 SHALL wait for an explicit user submission

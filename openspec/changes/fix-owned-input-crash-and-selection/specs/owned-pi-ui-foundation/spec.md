## ADDED Requirements

### Requirement: Submission validation failures remain recoverable
The owned UI SHALL treat user-correctable prompt preparation and attachment validation failures as rejected submissions with bounded, actionable in-application feedback, not as uncaught exceptions or unhandled promise rejections. Before dispatch acceptance, a rejected submission SHALL preserve its text and attachment references for correction or explicit retry without overwriting newer editor input. Rejection SHALL NOT send a partial prompt, silently discard attachments, change the active session, or automatically retry the request. The same protection SHALL apply to ordinary prompts, steering, follow-ups, and submissions queued during compaction.

#### Scenario: Image validation rejects an editor submission
- **WHEN** an editor-submitted attachment fails validation before dispatch
- **THEN** the UI SHALL identify the attachment problem without including its payload
- **AND** the session SHALL remain interactive and the rejected draft SHALL remain recoverable
- **AND** no part of that rejected submission SHALL be sent to the agent

#### Scenario: Correct and resubmit after rejection
- **WHEN** the user removes or corrects a rejected attachment and submits again
- **THEN** the corrected submission SHALL dispatch exactly once
- **AND** subsequent typing, selection, and agent turns SHALL remain usable

#### Scenario: Failure races with new editor input
- **WHEN** an asynchronous submission fails after the user has typed another draft
- **THEN** the newer draft SHALL remain intact
- **AND** the failed pre-dispatch submission SHALL remain separately recoverable rather than replacing the newer draft

#### Scenario: Deferred image submission fails
- **WHEN** a steering, follow-up, or compaction-queued submission fails attachment validation
- **THEN** it SHALL produce one recoverable rejection without terminating the UI or repeatedly retrying the invalid item
- **AND** other valid queued work SHALL not be silently discarded

#### Scenario: Submission execution unexpectedly rejects
- **WHEN** prompt preparation or the submission execution promise throws or rejects unexpectedly
- **THEN** the owned callback boundary SHALL handle the failure and report bounded feedback without an unhandled rejection
- **AND** A1 SHALL NOT automatically resend a request whose acceptance is uncertain

### Requirement: Attachment admission and submission share finite limits
The owned UI SHALL apply consistent finite limits at image admission and final prompt validation. It SHALL retain the existing maximum of eight prompt attachments and 8 MiB (8,388,608 bytes) of canonical base64 text per attachment; this encoded-data limit SHALL NOT be described as an 8 MiB decoded-image limit. Supported images within those limits SHALL preserve canonical base64, exact decoded bytes, and MIME type. Oversized images and excessive attachment counts SHALL produce specific corrective feedback. Malformed clipboard image data SHALL preserve the existing text-fallback or unchanged-prompt behavior and SHALL never be submitted as image data.

#### Scenario: Submit a supported screenshot
- **WHEN** a supported valid clipboard image canonicalizes within the encoded-data limit and the prompt contains at most eight attachments
- **THEN** admission and submission SHALL accept the same attachment locally
- **AND** its exact bytes and MIME type SHALL reach the agent session without local re-encoding loss or a validation crash

#### Scenario: Canonical image data reaches the size boundary
- **WHEN** valid canonical base64 is exactly 8,388,608 bytes long
- **THEN** it SHALL pass the local image-size check
- **AND** a valid canonical payload above that limit SHALL be rejected with the encoded-data limit and advice to reduce the image size

#### Scenario: Too many attachments
- **WHEN** a draft would submit more than eight images
- **THEN** A1 SHALL identify the attachment-count limit and allow correction without exiting or silently sending only a subset

### Requirement: Fatal owned-UI exits restore the parent terminal
When an owned bare-A1 UI terminates, A1 SHALL restore the terminal state it owns before returning control to the parent shell. Restoration SHALL cover mouse-reporting modes, bracketed paste and keyboard modes, raw input where applicable, synchronized output, cursor visibility, wrapping and scrolling state, and the alternate screen. Fatal handling SHALL be bounded and idempotent, preserve a nonzero exit outcome, and SHALL NOT resume normal agent execution after an uncaught process-level failure. When the UI cannot perform cleanup but its launch owner survives and the terminal remains writable, the owner SHALL perform fallback mode restoration only after the UI has stopped writing. Cleanup SHALL NOT alter unrelated sessions or apply A1-specific behavior to arbitrary transparent commands.

#### Scenario: Uncaught failure with a live terminal
- **WHEN** the owned UI encounters an uncaught exception or otherwise unhandled rejection while mouse reporting is enabled
- **THEN** it SHALL stop normal work, restore terminal modes, and exit unsuccessfully within a bounded interval
- **AND** moving the mouse afterward SHALL not inject mouse-report strings into the parent shell

#### Scenario: UI exits without running its cleanup
- **WHEN** the UI process terminates abruptly while its launch owner and terminal remain available
- **THEN** the surviving owner SHALL restore owned terminal modes after child termination before completing the launch
- **AND** it SHALL preserve the unsuccessful outcome

#### Scenario: Cleanup itself fails or stalls
- **WHEN** application disposal throws, stalls, or terminal output is unavailable
- **THEN** remaining best-effort cleanup SHALL not wait indefinitely or recursively enter fatal handling
- **AND** the original failure SHALL remain distinguishable from cleanup failure

#### Scenario: Normal exit remains normal
- **WHEN** the owned UI exits successfully
- **THEN** cleanup SHALL remain idempotent and preserve the accepted exit transcript or resume-hint behavior without duplicate output

### Requirement: Fatal diagnostics survive terminal restoration without exposing prompt payloads
For a fatal owned-UI failure, A1 SHALL emit a bounded plain diagnostic after terminal restoration and attempt to retain a bounded local diagnostic record containing release/runtime identity, failure origin, sanitized error classification, and useful stack locations. It SHALL exclude prompt text, image/base64 data, credentials, and raw terminal input. Diagnostic persistence failure SHALL not prevent cleanup or change a fatal outcome into success.

#### Scenario: Fatal attachment-related error is recorded
- **WHEN** a fatal diagnostic originates from an attachment-related path
- **THEN** the retained record SHALL allow identification of the failing code path without storing the attachment or prompt
- **AND** the restored-terminal message SHALL identify the local record when persistence succeeds

#### Scenario: Diagnostic storage is unwritable
- **WHEN** local diagnostic storage cannot be written
- **THEN** A1 SHALL still attempt terminal restoration and emit a bounded fallback error without hanging

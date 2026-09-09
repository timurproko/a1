## MODIFIED Requirements

### Requirement: Clipboard images reach prompts as canonical base64
The owned shell SHALL accept clipboard images encoded as valid standard padded or unpadded base64 subject to finite source-intake safeguards, and SHALL canonicalize each prepared attachment to RFC 4648 standard base64 with required trailing padding before marking its image chip ready or submitting it to the agent session. A pending paste/image chip SHALL be permitted before acquisition and preparation finish, but SHALL NOT be treated as a ready attachment. Canonicalization alone SHALL preserve exact decoded bytes and declared MIME type. Images already within preparation and applicable downstream limits SHALL remain byte-identical; eligible oversized images SHALL instead pass through the declared background resizing policy before final canonicalization, preserving the resulting bytes and actual output MIME type. The shell SHALL NOT submit malformed image data or a data-URL wrapper as an image payload.

#### Scenario: Paste an image requiring two padding characters
- **WHEN** the clipboard supplies a valid unpadded standard-base64 image requiring two trailing `=` characters that needs no resizing under the preparation policy
- **THEN** the shell SHALL resolve its pending paste to a ready image chip
- **AND** the eventual prompt attachment SHALL contain the same decoded bytes encoded with the two required padding characters

#### Scenario: Paste an image requiring one padding character
- **WHEN** the clipboard supplies a valid unpadded standard-base64 image requiring one trailing `=` character that needs no resizing under the preparation policy
- **THEN** the shell SHALL resolve its pending paste to a ready image chip
- **AND** the eventual prompt attachment SHALL contain the same decoded bytes encoded with the required padding character

#### Scenario: Paste an already canonical image
- **WHEN** the clipboard supplies a valid padded standard-base64 image that needs no resizing under the preparation policy
- **THEN** the shell SHALL preserve its decoded bytes and MIME type
- **AND** prompt submission SHALL contain one canonical attachment for the image chip

#### Scenario: Clipboard image data is malformed
- **WHEN** a clipboard adapter supplies empty data, an invalid alphabet, invalid padding, an impossible base64 length, or a data-URL wrapper as image data
- **THEN** the shell SHALL NOT store or submit that value as an image attachment
- **AND** it SHALL resolve the temporary paste marker to available clipboard text through the existing text path or otherwise remove it without changing surrounding prompt text

#### Scenario: Submit a normalized clipboard image to a strict provider
- **WHEN** a pasted clipboard image is represented by a ready image chip and the prompt is submitted
- **THEN** the agent session SHALL receive canonical base64 for the final prepared image suitable for construction of a strict provider data URL
- **AND** the user-visible chip label SHALL remain in the submitted prompt text as before

#### Scenario: Oversized source is canonicalized after resizing
- **WHEN** a valid padded or unpadded source exceeds the preparation target but can be safely resized within output limits
- **THEN** the shell SHALL prepare it in the background and store canonical base64 for the resulting image, not enforce source-byte equality with the original
- **AND** the resulting MIME type and bytes SHALL remain consistent through chip readiness and dispatch

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
The owned UI SHALL distinguish source-image intake limits from prepared-attachment limits. It SHALL retain the maximum of eight prompt attachments and 8 MiB (8,388,608 bytes) of canonical base64 text per final attachment; this encoded-data limit SHALL NOT be described as an 8 MiB decoded-image limit. Source images of up to 20 MiB of compressed image bytes SHALL be eligible for preparation subject to supported format and bounded decoded-pixel safeguards, even when their original base64 exceeds the final limit. A1 SHALL attempt automatic resizing/recompression before rejecting an otherwise eligible source for final output size. Known downstream byte/dimension limits SHALL also constrain prepared output; local validity SHALL NOT imply universal provider acceptance. Malformed clipboard image data SHALL preserve the existing text-fallback or unchanged-prompt behavior and SHALL never be submitted as image data.

#### Scenario: Paste a screenshot larger than the final encoded limit
- **WHEN** a valid supported screenshot exceeds 8 MiB as original canonical base64 but satisfies source safety limits and can be prepared within output limits
- **THEN** A1 SHALL prepare and admit a size-compliant image without requiring manual resizing
- **AND** the final bytes, actual MIME type, and canonical base64 SHALL pass submission validation without a crash

#### Scenario: Final canonical data reaches the contract boundary
- **WHEN** final canonical base64 is exactly 8,388,608 bytes long
- **THEN** it SHALL pass the local encoded-size assertion, independently of any stricter preparation/downstream policy
- **AND** a final payload above that bound SHALL fail validation without dispatch, even if introduced through restored, queued, or non-clipboard input
- **AND** this final assertion SHALL NOT be used to reject eligible original clipboard bytes before preparation

#### Scenario: Excessive source or decoded size
- **WHEN** an image exceeds the source-byte or decoded-pixel safety bound
- **THEN** A1 SHALL reject it with a bounded diagnostic identifying the applicable source limit, not the final encoded-data limit
- **AND** the editor SHALL remain usable without an unbounded allocation or preparation attempt

#### Scenario: Too many attachments including pending images
- **WHEN** accepting another image would exceed eight image slots in a draft, including pending and failed image chips
- **THEN** A1 SHALL identify the attachment-count limit and allow correction without exiting, silently sending a subset, or starting unbounded background work

### Requirement: Image preparation preserves useful quality within output limits
The owned UI SHALL preserve exact bytes and MIME type for supported images already within its preparation target and applicable downstream constraints. For larger eligible images, A1 SHALL automatically produce a canonical, size-compliant attachment using a conservative target below 4.5 MiB of base64 text, further reduced when a known downstream limit requires it. Resizing SHALL preserve aspect ratio and orientation, SHALL NOT upscale or crop, and SHALL prefer lossless PNG for screenshot text and transparency before lossy alternatives. When resizing is needed, its initial longest edge SHALL be at most 2000 pixels. Further compression or downscaling SHALL be bounded and SHALL NOT turn an image into an arbitrarily tiny unreadable success. The displayed attachment state SHALL indicate when preparation resized or recompressed the source, and its MIME type SHALL match the actual output format. Unsupported conversion, preparation failure, or inability to fit the quality/size policy SHALL remain a recoverable rejection rather than silently dropping the image.

#### Scenario: Small screenshot needs no conversion
- **WHEN** a supported screenshot is below the preparation target and meets applicable downstream constraints and source safety checks
- **THEN** its exact bytes and MIME type SHALL be preserved through submission
- **AND** it SHALL not undergo unnecessary decode/re-encode work

#### Scenario: Large screenshot contains text
- **WHEN** an eligible large screenshot requires preparation
- **THEN** A1 SHALL preserve its composition and aspect ratio, prefer a size-compliant lossless output, and use bounded high-quality alternatives only when needed
- **AND** the prepared screenshot SHALL retain readable representative text in the acceptance fixtures
- **AND** the output SHALL meet both encoded and known downstream decoded-byte/dimension limits

#### Scenario: Transparency or orientation affects conversion
- **WHEN** resizing an image with transparency or orientation metadata
- **THEN** its visible orientation SHALL be preserved and transparency SHALL be retained in lossless output
- **AND** a required opaque conversion SHALL use a defined background rather than making transparent screenshot content unreadable

#### Scenario: Conversion cannot safely produce an acceptable result
- **WHEN** processing fails or no candidate fits the bounded quality/size policy
- **THEN** the image SHALL remain visibly failed and removable or retryable with payload-free feedback
- **AND** A1 SHALL neither label it ready nor submit text alone in place of the intended image prompt

### Requirement: Image paste remains responsive during background preparation
An image paste SHALL receive visible pending feedback on the next render opportunity, without waiting for clipboard acquisition, codec initialization, decoding, resizing, recompression, or base64 preparation. On the manual acceptance machine, the feedback target SHALL be within 100 ms of A1 receiving the paste action for both cold and warm image preparation; this is a feedback target, not a promise that conversion completes in 100 ms. Typing, caret movement, selection, streaming, and cancellation SHALL remain responsive throughout. CPU-heavy image processing SHALL execute outside the interactive event loop; wrapping synchronous processing in a promise SHALL NOT satisfy this requirement. Preparation SHALL have finite concurrency, retained-data limits, and a deadline, and it SHALL NOT introduce synchronous codec loading into normal UI startup.

#### Scenario: Cold first paste of a large screenshot
- **WHEN** the first image paste occurs before the image processor is loaded
- **THEN** A1 SHALL display a pending paste/image chip without waiting for that load or clipboard completion
- **AND** typing, selection, and rendering SHALL continue while the image is prepared
- **AND** that same chip SHALL become ready or failed without moving the caret or replacing newer text

#### Scenario: Paste has not yet resolved to an image
- **WHEN** the pending clipboard read returns text, no usable content, or malformed image data with a valid text fallback
- **THEN** A1 SHALL resolve or remove the temporary paste marker through the existing text/fallback behavior
- **AND** it SHALL not leave a phantom attachment or overwrite text typed after the paste action

#### Scenario: Several images are pasted quickly
- **WHEN** repeated paste actions create multiple pending images
- **THEN** their positions and identities SHALL follow paste-action order, not processing-completion order
- **AND** processing concurrency and retained source data SHALL remain bounded while input stays responsive
- **AND** later jobs SHALL not silently reread a newer clipboard image in place of the content acquired for an earlier action

#### Scenario: Processing stalls or the worker fails
- **WHEN** image acquisition or preparation exceeds its deadline or its background executor fails
- **THEN** the affected operation SHALL settle as a recoverable failure, release its resources, and leave later paste actions usable
- **AND** the UI SHALL not hang, exit, or log the image payload

### Requirement: Pending image submissions and cancellations are race-safe
Image preparation SHALL use stable attachment and submission identities so completion cannot overwrite newer input, resurrect deleted chips, or attach to another session. A submission referencing pending images SHALL visibly wait for all its referenced images to become ready before validating and dispatching its captured draft exactly once. Waiting SHALL remain asynchronous and cancellable and SHALL apply to ordinary prompts, steering, follow-ups, and compaction-queued work. A failed image SHALL prevent partial dispatch and leave the captured draft recoverable. A1 SHALL NOT automatically retry preparation after failure or resend a request whose dispatch acceptance is uncertain.

#### Scenario: Enter before image preparation finishes
- **WHEN** the user submits a draft containing pending images and then types a new draft
- **THEN** the submitted snapshot SHALL remain visibly waiting while the new draft stays editable
- **AND** once all referenced images are ready it SHALL validate and dispatch exactly once, without incorporating the newer draft
- **AND** repeated submit events for the same waiting intent SHALL NOT duplicate dispatch

#### Scenario: Preparation fails while submission is waiting
- **WHEN** one image in a waiting submission fails preparation
- **THEN** no part of that submission SHALL dispatch, and its text and attachment references SHALL remain recoverable
- **AND** unrelated valid queued work SHALL not be silently discarded

#### Scenario: Delete an image or cancel a waiting submission
- **WHEN** the user deletes an unsubmitted pending chip or explicitly cancels its waiting submission
- **THEN** its late completion SHALL not recreate the chip or dispatch the canceled intent
- **AND** preparation with no remaining live reference SHALL be canceled and released

#### Scenario: Session changes or the UI exits during preparation
- **WHEN** the session is replaced/reset or the UI is disposed while image preparation is pending
- **THEN** old-session work SHALL be canceled or ignored and SHALL not mutate the new session
- **AND** background workers and clipboard subprocesses SHALL be released within bounded shutdown, preserving existing terminal restoration

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

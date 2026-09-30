## ADDED Requirements

### Requirement: Corrected attachment-count feedback retires with its cause

When bare A1 presents an attachment-count warning for the current prompt, it SHALL associate that prompt-adjacent notice with the typed count rejection. The warning SHALL explain that the prompt is limited to the effective image count and direct the user to `/settings` to change the limit, since submission sends the accepted images and omits the overflow; it SHALL NOT present the count rejection as an error. An overflow attachment rejected specifically by the count policy SHALL retain its ordinary atomic screenshot-chip label while rendering dimmed rather than failed so its exclusion is visible without renaming it. The notice SHALL be reconciled after editor changes and live prompt-image-limit changes. It SHALL clear without requiring submission when the current draft is within the effective limit and references no count-rejected marker. Reconciliation SHALL NOT clear a newer or unrelated status, warning, or error and SHALL NOT retry, revive, promote, silently submit, or silently remove a rejected image.

#### Scenario: Present count rejection as a corrective warning
- **WHEN** paste or submission exceeds the effective prompt-image limit
- **THEN** bare A1 SHALL present `A prompt is limited to <limit> image(s). To change the limit /settings.` with correct singular/plural grammar as warning feedback
- **AND** it SHALL NOT label that feedback as an error or append an unrelated recovery instruction

#### Scenario: Present an excluded overflow attachment
- **WHEN** an image paste is rejected for exceeding the effective prompt-image limit
- **THEN** its atomic editor chip SHALL retain the ordinary `screenshot-…` label and use a dimmed presentation rather than a failed label
- **AND** submission SHALL proceed with the remaining prompt and ready attachments without including, retrying, or promoting the rejected attachment
- **AND** submitted-prompt presentation and reusable history SHALL omit the rejected screenshot chip

#### Scenario: Remove the rejected overflow image
- **WHEN** the user removes the dimmed count-rejected screenshot chip from an otherwise compliant draft
- **THEN** the attachment-count notice SHALL disappear on the next rendered editor state without requiring submission
- **AND** the remaining ready image attachments SHALL stay unchanged

#### Scenario: Correct a draft above a lowered limit
- **WHEN** a draft contains more ready image attachments than a newly lowered live limit and the user removes attachments until the draft satisfies that limit
- **THEN** the active attachment-count notice SHALL disappear as soon as the corrected draft is compliant

#### Scenario: Keep an unresolved count-rejected chip
- **WHEN** the draft count is no greater than the effective limit but still references a dimmed screenshot chip produced by an attachment-count rejection
- **THEN** A1 SHALL retain actionable warning feedback and SHALL allow submission of the remaining valid prompt without treating or submitting that chip as a ready image

#### Scenario: Preserve a replacement notice
- **WHEN** another status, warning, or error replaces the attachment-count notice before the user edits the draft
- **THEN** later image removal or a limit change SHALL NOT clear that replacement notice

#### Scenario: Increase the live limit
- **WHEN** the user increases the limit so every ready attachment in the current draft is permitted
- **THEN** an active count notice for those ready attachments SHALL clear without restart
- **AND** any count-rejected overflow chip SHALL retain its screenshot label while remaining dimmed and excluded until the user removes and pastes it again

## MODIFIED Requirements

### Requirement: Attachment admission and submission share finite limits

The owned UI SHALL distinguish source-image intake limits from prepared-attachment limits. Bare A1 SHALL use the effective profile-local `promptImageLimit`, an integer from 1 through 16 with default 8, for current-draft paste admission and final shell submission validation. Settings-free and `a1 pi` input SHALL use 8. The neutral owned-command contract SHALL retain an absolute maximum of 16 prompt attachments independently of the interactive preference. The same effective limit SHALL govern ordinary prompts, steering, follow-ups, restored/deferred drafts, and submissions queued during compaction, and attachment-count feedback SHALL identify the effective numeric limit as a corrective warning that points to `/settings`, not as an error.

The owned UI SHALL retain 8 MiB (8,388,608 bytes) of canonical base64 text per final attachment; this encoded-data limit SHALL NOT be described as an 8 MiB decoded-image limit. Source images of up to 20 MiB of compressed image bytes SHALL be eligible for preparation subject to supported format and bounded decoded-pixel safeguards, even when their original base64 exceeds the final limit. A1 SHALL attempt automatic resizing/recompression before rejecting an otherwise eligible source for final output size. Known downstream byte/dimension and attachment-count limits SHALL also constrain prepared output; local validity SHALL NOT imply universal provider acceptance. Malformed clipboard image data SHALL preserve the existing text-fallback or unchanged-prompt behavior and SHALL never be submitted as image data.

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
- **WHEN** the current draft already occupies every effective image slot, including pending and failed image chips, and the user attempts to add another image
- **THEN** A1 SHALL reject the additional image with a diagnostic naming the effective limit and show its ordinary screenshot chip dimmed without a failed or `not sent` label
- **AND** it SHALL allow correction or submission of the visibly accepted subset without exiting or starting unbounded background work

#### Scenario: Show image submission activity
- **WHEN** bare A1 dispatches a prompt containing one or more accepted image attachments
- **THEN** the live working spinner SHALL show `Sending…` while the command awaits engine acceptance
- **AND** the engine's accepted/busy transition SHALL restore `Working…` or the applicable extension-owned presentation while processing continues
- **AND** rejection or failure before acceptance SHALL restore the applicable presentation when the command settles
- **AND** A1 SHALL NOT fabricate per-image upload progress that the transport does not report

#### Scenario: Raise the bare-A1 limit
- **WHEN** bare A1's effective `promptImageLimit` is greater than 8 and no more than 16
- **THEN** synchronous and asynchronous image admission SHALL accept attachments through that configured count
- **AND** ordinary, steering, follow-up, restored, and compaction-queued submissions through that count SHALL pass local count validation
- **AND** provider-specific rejection MAY still report a downstream limit without changing the stored preference

#### Scenario: Lower the bare-A1 limit
- **WHEN** bare A1's effective `promptImageLimit` is lower than the current ready attachment count
- **THEN** A1 SHALL preserve the draft and reject paste or submission with the configured count rather than deleting or sending a subset
- **AND** the user SHALL be able to remove attachments until the draft is valid

#### Scenario: Reach the absolute command ceiling
- **WHEN** any owned prompt command contains 16 otherwise-valid image attachments
- **THEN** the neutral owned-command count assertion SHALL accept it
- **AND** a command containing 17 attachments SHALL fail before dispatch regardless of interactive settings

#### Scenario: Count repeated image references
- **WHEN** one live image chip is referenced repeatedly in a draft
- **THEN** it SHALL continue to produce and occupy one unique attachment
- **AND** distinct pending, failed, and ready image chips SHALL each continue to occupy one slot

#### Scenario: Use settings-free or comparison input
- **WHEN** no bare-A1 owned settings provider is attached or the user runs `a1 pi`
- **THEN** image admission and shell submission SHALL retain the existing limit of eight

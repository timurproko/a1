## MODIFIED Requirements

### Requirement: Clipboard images reach prompts as canonical base64
The owned shell SHALL accept clipboard images encoded as valid standard padded or unpadded base64 subject to finite source-intake safeguards, and SHALL canonicalize each prepared attachment to RFC 4648 standard base64 with required trailing padding before marking its image attachment ready or submitting it to the agent session. A pending paste/image identity SHALL be permitted before acquisition and preparation finish, but SHALL NOT be treated as a ready attachment. Canonicalization alone SHALL preserve exact decoded bytes and declared MIME type. Images already within preparation and applicable downstream limits SHALL remain byte-identical; eligible oversized images SHALL instead pass through the declared background resizing policy before final canonicalization, preserving the resulting bytes and actual output MIME type. The shell SHALL NOT submit malformed image data or a data-URL wrapper as an image payload.

Bare A1 SHALL retain a generated image identity as semantic backing for preparation, ordering, atomic editing, submission, queued work, durable history, and recall, but SHALL NOT render its `[📷 screenshot-…]` token in the ordinary prompt editor or submitted user-message text. A generated identity SHALL remain deletable and recoverable through existing atomic selection, deletion, undo, redo, and history behavior even while hidden. Failed image identities SHALL remain visibly actionable, and literal image-looking text without a matching owned attachment SHALL remain visible and unchanged. The actual submitted image presentation and textual fallback SHALL remain available in the transcript. The `a1 pi` comparison route SHALL retain pinned marker presentation.

#### Scenario: Paste an image requiring two padding characters
- **WHEN** the clipboard supplies a valid unpadded standard-base64 image requiring two trailing `=` characters that needs no resizing under the preparation policy
- **THEN** the shell SHALL resolve its pending paste to a ready image attachment
- **AND** the eventual prompt attachment SHALL contain the same decoded bytes encoded with the two required padding characters

#### Scenario: Paste an image requiring one padding character
- **WHEN** the clipboard supplies a valid unpadded standard-base64 image requiring one trailing `=` character that needs no resizing under the preparation policy
- **THEN** the shell SHALL resolve its pending paste to a ready image attachment
- **AND** the eventual prompt attachment SHALL contain the same decoded bytes encoded with the required padding character

#### Scenario: Paste an already canonical image
- **WHEN** the clipboard supplies a valid padded standard-base64 image that needs no resizing under the preparation policy
- **THEN** the shell SHALL preserve its decoded bytes and MIME type
- **AND** prompt submission SHALL contain one canonical attachment for the generated image identity

#### Scenario: Clipboard image data is malformed
- **WHEN** a clipboard adapter supplies empty data, an invalid alphabet, invalid padding, an impossible base64 length, or a data-URL wrapper as image data
- **THEN** the shell SHALL NOT store or submit that value as an image attachment
- **AND** it SHALL resolve the temporary paste identity to available clipboard text through the existing text path or otherwise remove it without changing surrounding prompt text

#### Scenario: Submit a normalized clipboard image to a strict provider
- **WHEN** a pasted clipboard image is represented by a ready generated identity and the prompt is submitted
- **THEN** the agent session SHALL receive canonical base64 for the final prepared image suitable for construction of a strict provider data URL
- **AND** bare A1 SHALL NOT render the generated image token in the submitted prompt text
- **AND** the actual image or established textual image fallback SHALL remain visible in the transcript

#### Scenario: Oversized source is canonicalized after resizing
- **WHEN** a valid padded or unpadded source exceeds the preparation target but can be safely resized within output limits
- **THEN** the shell SHALL prepare it in the background and store canonical base64 for the resulting image, not enforce source-byte equality with the original
- **AND** the resulting MIME type and bytes SHALL remain consistent through attachment readiness and dispatch

#### Scenario: Edit around a hidden ready image
- **WHEN** a bare-A1 draft contains surrounding text and one or more ready pasted images
- **THEN** no generated screenshot token SHALL be painted in the editor
- **AND** typing, caret mapping, selection replacement, atomic deletion, undo, redo, image ordering, and submission SHALL preserve the existing semantic positions and attachment identities

#### Scenario: Preserve literal and failed image text
- **WHEN** the prompt contains literal `[📷 …]` text without a matching owned attachment or an owned image preparation fails
- **THEN** bare A1 SHALL retain the literal text or visible failed-image identity respectively
- **AND** it SHALL NOT hide either as though it were a ready generated attachment

#### Scenario: Recall and resubmit a hidden image identity
- **WHEN** durable history rehydrates a valid image identity and the user resubmits it without removing it
- **THEN** the editor and submitted prompt SHALL keep its generated token hidden
- **AND** the same sidecar-backed image attachment SHALL be dispatched according to the existing recall contract

#### Scenario: Keep the pinned comparison marker
- **WHEN** the same clipboard image is pasted and submitted through `a1 pi`
- **THEN** its image-chip marker presentation SHALL remain unchanged from pinned Pi

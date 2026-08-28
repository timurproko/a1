## ADDED Requirements

### Requirement: Clipboard images reach prompts as canonical base64
The owned shell SHALL accept clipboard images encoded as valid standard padded or unpadded base64 and SHALL canonicalize each attachment to RFC 4648 standard base64 with required trailing padding before storing an image chip or submitting it to the agent session. Canonicalization SHALL preserve the exact decoded bytes and declared MIME type. The shell SHALL NOT submit malformed image data or a data-URL wrapper as an image payload.

#### Scenario: Paste an image requiring two padding characters
- **WHEN** the clipboard supplies a valid unpadded standard-base64 image whose encoded payload requires two trailing `=` characters
- **THEN** the shell SHALL insert an image chip
- **AND** the eventual prompt attachment SHALL contain the same decoded bytes encoded with the two required padding characters

#### Scenario: Paste an image requiring one padding character
- **WHEN** the clipboard supplies a valid unpadded standard-base64 image whose encoded payload requires one trailing `=` character
- **THEN** the shell SHALL insert an image chip
- **AND** the eventual prompt attachment SHALL contain the same decoded bytes encoded with the required padding character

#### Scenario: Paste an already canonical image
- **WHEN** the clipboard supplies a valid, padded standard-base64 image
- **THEN** the shell SHALL preserve its decoded bytes and MIME type
- **AND** prompt submission SHALL contain one canonical attachment for the image chip

#### Scenario: Clipboard image data is malformed
- **WHEN** a clipboard adapter supplies empty data, an invalid alphabet, invalid padding, an impossible base64 length, or a data-URL wrapper as image data
- **THEN** the shell SHALL NOT store or submit that value as an image attachment
- **AND** it SHALL paste available clipboard text through the existing text path or otherwise leave the prompt unchanged

#### Scenario: Submit a normalized clipboard image to a strict provider
- **WHEN** a pasted clipboard image is represented by an image chip and the prompt is submitted
- **THEN** the agent session SHALL receive canonical base64 data suitable for construction of a strict provider data URL
- **AND** the user-visible chip label SHALL remain in the submitted prompt text as before

## MODIFIED Requirements

### Requirement: Renderable image content survives the owned transcript boundary
A1 SHALL preserve validated image attachments from user messages and tool results until presentation without embedding unbounded base64 data in the size-limited owned session view. When `showImages` is enabled and the terminal advertises a protocol supported by the pinned image renderer, the transcript SHALL render the image at `imageWidthCells`, subject to available width. When `showImages` is enabled and no supported protocol exists, the transcript SHALL omit the automatic textual attachment fallback from the content area while preserving the attachment in authoritative session and model-facing content. When `showImages` is disabled, existing and subsequent user and tool-result attachments SHALL emit neither inline images nor automatic textual attachment placeholders nor image-only spacers. Ordinary text, submitted screenshot chips, authoritative attachment metadata and bytes, stored content, and model-facing content SHALL remain unchanged. Actual resolution or conversion failures while image rendering is enabled SHALL retain their bounded textual diagnostics.

#### Scenario: Render an image in a supported terminal
- **WHEN** a user or tool-result image reaches the transcript while image display is enabled and the terminal supports a recognized image protocol
- **THEN** the image SHALL render inline at no more than the configured image width and available transcript width

#### Scenario: Use an unsupported terminal
- **WHEN** an image reaches the transcript while image display is enabled and the terminal advertises no supported image protocol
- **THEN** A1 SHALL omit the automatic image attachment fallback from the transcript content area
- **AND** ordinary message or tool-result text, submitted screenshot chips, attachment metadata and bytes, stored content, and model-facing content SHALL remain unchanged
- **AND** the omitted attachment SHALL NOT leave an image-only spacer or empty fallback region

#### Scenario: Hide images
- **WHEN** `showImages` is disabled
- **THEN** existing and subsequent user and tool-result attachments SHALL emit neither inline images nor automatic hidden-image or attachment metadata blocks
- **AND** omitted attachments SHALL NOT leave image-only spacers or empty fallback regions
- **AND** ordinary text, submitted screenshot chips, and authoritative session and model-facing attachment content SHALL remain unchanged

#### Scenario: Re-enable images
- **WHEN** `showImages` is enabled again in a terminal supporting a recognized image protocol
- **THEN** retained existing and subsequent attachments SHALL render using the selected image width without requiring resubmission

#### Scenario: Present a large image
- **WHEN** an attachment exceeds the owned transcript payload limit
- **THEN** its bounded transcript metadata SHALL remain valid and its content SHALL remain resolvable by the presenter without increasing the session-view limit

#### Scenario: Reject malformed image content
- **WHEN** image metadata, encoding, or media type is invalid
- **THEN** A1 SHALL reject or replace that attachment with a safe diagnostic and SHALL NOT emit malformed terminal control data

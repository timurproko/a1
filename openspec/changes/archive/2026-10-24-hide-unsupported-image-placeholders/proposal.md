## Why

When the active terminal cannot render inline images, the transcript currently inserts rows such as `[Image: image-bec607db553684757876024d [image/png] 1920x1032]`. The row cannot preview or open the attachment and adds visual noise to the conversation content area without helping the user.

## What Changes

- Omit automatic textual image-attachment fallback rows from user-message and tool-result transcript content when image display is enabled but the terminal advertises no supported inline-image protocol.
- Preserve ordinary message and tool-result text, submitted screenshot chips, attachment bytes and metadata, stored/model-facing content, and prompt delivery.
- Preserve inline rendering in supported terminals at the configured width.
- Preserve explicit hidden-image markers when the user disables image display and safe unavailable/conversion diagnostics when a capable terminal cannot render a valid attachment.
- Avoid leaving attachment-only spacer rows or empty fallback content after unsupported image rows are omitted.
- Keep extension-owned custom image components, startup announcements, and the explicit `a1 pi` comparison route outside this transcript-specific change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-settings-runtime`: Distinguish unsupported-terminal transcript omission from explicit image hiding and render failures.
- `owned-pi-ui-foundation`: Keep unsupported image attachments out of the owned transcript content area without changing their underlying session or provider data.

## Impact

The implementation is limited to owned transcript image composition, tool-result fallback formatting, and focused component tests. It does not change image acquisition, validation, resizing, attachment limits, provider payloads, prompt chips, history, extension APIs, installed Pi code, or terminal capability detection.

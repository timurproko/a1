## Context

See `proposal.md` for motivation. The owned transcript has two image presentation paths:

- user and other non-tool blocks append a public Pi TUI `Image` component, whose unsupported-terminal behavior is to render `imageFallback(...)` text;
- tool results suppress their separate image components when no image protocol exists, then add the same fallback through `ToolExecutionComponent.getTextOutput()`.

Those fallbacks are useful when image display was explicitly disabled or when rendering fails in a terminal that otherwise supports images, but they are not useful when the terminal cannot display any image at all. The attachment must remain in authoritative session/model content even when its transcript-only visual row is omitted.

## Goals / Non-Goals

**Goals:**
- Omit transcript image fallback rows when `showImages` is enabled and terminal image capability is `null`.
- Apply the same policy to user-message attachments and tool-result attachments.
- Preserve supported Kitty/iTerm2 rendering, configured image width, ordinary text, screenshot chips, and attachment delivery.
- Preserve explicit hidden-image markers and capable-terminal conversion/unavailable diagnostics.
- Avoid blank attachment spacers and empty image-only fallback regions.

**Non-Goals:**
- Do not add or detect a new terminal image protocol.
- Do not change image preparation, validation, attachment limits, provider content, or persisted sessions.
- Do not globally change the public Pi TUI `Image` component or extension-owned image rendering.
- Do not alter startup announcement images or `a1 pi` behavior.

## Decisions

### 1. Gate unsupported transcript images before fallback construction

The non-tool transcript composer will inspect the public terminal capability before adding an attachment spacer or image component. When image display is enabled and `images` is `null`, it will add neither. This prevents the public `Image` component from manufacturing a fallback row and prevents orphaned blank spacing.

Capability checks remain at presentation time so an existing transcript rebuild uses the current terminal state and does not mutate semantic blocks or image references.

### 2. Keep explicit hiding and actual failures distinct

`showImages=false` continues to render the existing bounded `Image hidden` marker. A capable terminal whose asset cannot be resolved continues to render `Image unavailable`; Kitty conversion failure continues to render its bounded unavailable diagnostic. These states communicate a user choice or an actual rendering failure, unlike the known absence of any preview protocol.

The unsupported-terminal omission therefore applies only when image display is enabled and no recognized protocol exists.

### 3. Remove tool fallback indicators at the tool text boundary

The tool image presenter already emits no image component when capability is `null`. `ToolExecutionComponent.getTextOutput()` will return the tool's ordinary text without synthesizing `imageFallback(...)` indicators in that state. Explicitly hidden images retain their current indicators, and capable terminals retain their current image-component and conversion paths.

If a renderer has no call/result text and its only result content is an unsupported image, the existing empty-content handling will avoid creating a new blank fallback region.

### 4. Preserve semantic content and scope

No attachment reference, base64 data, image metadata, tool result, user message, screenshot chip, or model-facing content is removed. Only transcript composition changes. Extension renderers that directly use Pi TUI `Image`, resident text-terminal extension fidelity, startup announcements, and comparison Pi continue to own their existing fallback behavior.

## Risks / Trade-offs

- [Users may not see that an image was attached in an unsupported terminal] → Submitted screenshot chips and surrounding authored text remain visible, while the attachment continues to reach the model; the omitted row carried no actionable preview.
- [A broad capability check could hide real failures] → Apply omission only to enabled images with `images:null`; preserve hidden, unavailable, and conversion-failure states.
- [Removed rows could leave layout artifacts] → Decide whether to add the spacer only after an image presentation component is selected and cover image-only tool results.
- [Pinned parity intentionally changes] → Record the product-specific transcript omission in the modified specs and keep `a1 pi` unchanged.

## Migration Plan

1. Gate non-tool transcript attachment composition on supported image capability.
2. Stop tool fallback formatting from adding image indicators solely because capability is absent.
3. Add focused unsupported/supported/hidden/failure regression coverage for user and tool transcript paths.
4. Build and launch through `./scripts/dev` for physical review. No data migration is required.

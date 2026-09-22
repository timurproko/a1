## Why

When Pi resizes a pasted image, it appends coordinate-mapping guidance such as `[Image: original …, displayed at …]` to the stored user message. Bare A1 currently paints that internal guidance inside the submitted prompt, where it looks like user-authored text.

## What Changes

- Omit canonical successful image resize/dimension guidance from the visible bare-A1 submitted prompt.
- Preserve the stored message and model-facing guidance unchanged.
- Keep pasted-image chips, generated screenshot labels, editor behavior, attachment delivery, transcript image presentation, and failure text unchanged.
- Do not add attachment notices or move resize guidance into the dock.
- Keep the explicit `a1 pi` comparison route unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Derive bare-A1 submitted-prompt text that excludes provenance-bound resize guidance without changing stored/model content or existing image-chip presentation.

## Impact

The implementation is limited to user-message transcript projection, the bare-A1 submitted-prompt presenter, its bounded contract metadata, and focused tests. It does not change prompt-chip storage, editor rendering, attachment payloads, history, dock notices, persisted sessions, extension APIs, installed Pi code, or `a1 pi`.

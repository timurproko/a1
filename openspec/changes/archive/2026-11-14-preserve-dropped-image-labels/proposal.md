## Why

Dragging one desktop image into the owned input produces a screenshot chip instead of an image-file chip. The single-file attachment route added in PR #926 replaces the classified file path with prepared image bytes, loses its filename/provenance, and feeds the same screenshot-only chip constructor used for clipboard images.

## What Changes

- Preserve image-file provenance through isolated preparation and show a filename-bearing image-file chip using the established image-file icon, rather than a generated screenshot label.
- Keep clipboard-image bytes without a source filename on the existing screenshot-chip route.
- Retain actual prepared attachment bytes, limits, cancellation, atomic editing, undo/redo, submission, and durable history; do not regress file images to path-only references.
- Preserve existing multiple/mixed path-list behavior and non-image file, folder, URL, and text handling.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: distinguish supplied image-file chip labels from clipboard screenshots without changing attachment delivery.

## Impact

Owned session-shell paste helper/protocol/executor, prompt chips and image history identity, prompt-history sidecars if required by the label representation, focused helper/shell/history tests, and the owning specification delta. No installed dependency edits, terminal drag protocol changes, clipboard acquisition changes, multiple-file attachment expansion, or comparison-profile changes.

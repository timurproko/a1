## Why

Pasted images currently expose internal `[📷 screenshot-…]` identifiers in the draft and submitted prompt, while successful image-resize metadata is appended inside the submitted prompt text. This implementation detail clutters the user's request even though bare A1 already has a transient informational area above the editor for status-like context.

## What Changes

- Keep pasted-image attachment identities as internal semantic backing, but do not render generated screenshot markers in the bare-A1 editor or submitted user prompt.
- Present successful image-processing metadata such as original/displayed dimensions in the existing transient informational area above the editor instead of inside the submitted prompt.
- Preserve image attachment order, deletion, undo/redo, submission, queued delivery, durable recall, and actual image transcript presentation while distinguishing generated markers from literal text authored by the user.
- Keep image failures actionable and keep the explicit `a1 pi` comparison route unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Change generated clipboard-image chip presentation from visible prompt text to hidden semantic backing without changing attachment delivery.
- `custom-session-viewport`: Route successful image-processing metadata to the transient dock notice and keep it out of submitted-prompt presentation.

## Impact

Expected implementation areas are the prompt-chip owner, bare-A1 editor hidden-range presentation, user-message transcript projection/presentation, transient dock-notice routing, and focused shell/paste/history tests. No dependency, persisted-session migration, image payload format change, extension API change, or installed Pi patch is intended. The change is limited to bare A1; pinned `a1 pi` retains its current visible markers and inline image notes.

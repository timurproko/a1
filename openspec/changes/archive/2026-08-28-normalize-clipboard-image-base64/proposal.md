## Why

Pasted screenshots can reach the provider as invalid image data even though A1 shows a successful image chip. The native clipboard dependency emits unpadded base64, A1 forwards it unchanged, and strict OpenAI-compatible endpoints reject payloads whose encoded length requires `=` padding.

## What Changes

- Define one clipboard-image ingress rule that accepts valid padded or unpadded standard base64 and stores canonical RFC 4648 padded base64.
- Preserve the exact decoded image bytes and MIME type while normalizing the representation before prompt-chip storage and provider submission.
- Prevent malformed clipboard image data from reaching the agent session, using the existing text fallback when available and otherwise leaving the prompt unchanged.
- Add regression coverage for both base64 padding classes, already-canonical input, malformed input, and end-to-end prompt submission.

**BREAKING**: none. Existing valid image pastes become interoperable with stricter provider validators.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: clipboard image paste and prompt submission gain an explicit canonical, provider-safe attachment contract.

## Impact

The later implementation will affect the system clipboard adapter, the shared session-shell clipboard ingress, prompt image-chip storage, and focused session-shell tests. It requires no provider-specific workaround, dependency change, private Pi import, transcript image-rendering change, or settings change.

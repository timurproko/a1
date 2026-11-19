## Why

Selecting a submitted prompt together with an assistant reply currently copies the UI's `❯` marker and prompt padding. The reported fresh-session round trip confirms that assistant quote alignment is corrected, but the mixed selection still inserts `❯ test text` into the draft.

## What Changes

- Exclude submitted-prompt presentation prefixes for every selected prompt row, including ranges spanning assistant replies, multiple prompts, or eligible dock text.
- Keep the selected prompt text itself, its genuine indentation and literal `>` or `❯` characters, surrounding replies, blank lines, visible row boundaries, and original display-column clipping.
- Reuse the same extraction for automatic selection copy and explicit frame copy, without changing visual highlighting or ordinary pasted text.
- Cover forward/reverse, wrapped/partial, multi-prompt, and off-screen selections with focused regression tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `session-frame-selection`: omit submitted-prompt chrome in mixed as well as prompt-only frame selections.

## Impact

Owned viewport selection extraction and its focused UI/shell tests. No new dependency, clipboard transport change, blanket stripping of pasted `>` characters, assistant-renderer change, or merge authorization.

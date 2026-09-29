## Why

Bare A1's transient `Steering:` rows still treat spaces inside prompt-chip labels as ordinary wrap points. A queued screenshot or other fitting chip can therefore be split into visible chunks even though submitted prompts and the live editor present it atomically.

## What Changes

- Treat each canonical paste, image, file, folder, and URL chip in pending bare-A1 steering content as one visual wrapping unit when it fits within a complete row.
- Move a fitting chip intact to the next continuation row when the current row lacks room, instead of splitting at an internal space.
- Preserve width-bounded grapheme-safe fallback for a chip wider than the available row.
- Preserve queue text, chip characters, queue ordering, dequeue guidance, scrolling, selection ownership, and the pinned `a1 pi` comparison presentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Extend atomic prompt-chip wrapping to pending steering rows in bare A1's transient content area.

## Impact

The implementation is limited to the existing queued-input presenter, shared canonical chip-wrap protection, and focused component/shell coverage. It does not change chip storage or expansion, attachment delivery, queue semantics, persisted/model-facing content, submitted-prompt behavior, or installed Pi code.

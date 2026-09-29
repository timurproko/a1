## Why

Bare A1 can still split a fitting prompt chip into visible chunks when the chip directly touches a long uninterrupted text run. The defect affects both transient `Steering:` rows and the same message after it becomes submitted content because the wrapping token can absorb the chip despite its protected internal spaces.

## What Changes

- Treat each canonical paste, image, file, folder, and URL chip in pending steering and submitted-prompt content as one visual wrapping unit when it fits within a complete row.
- Give a fitting chip temporary wrapping boundaries even when authored text touches it without whitespace, so the chip moves intact rather than joining a longer splittable token.
- Truncate a chip wider than the complete available row with `…` on one row instead of splitting it.
- Preserve exact source text, chip characters, queue ordering, dequeue guidance, scrolling, selection ownership, stored/model-facing content, and the pinned `a1 pi` comparison presentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Extend atomic prompt-chip wrapping to pending steering rows and make submitted-prompt atomicity independent of authored whitespace around a chip.

## Impact

The implementation is limited to the existing queued-input and submitted-prompt presenters, one shared Pi chip-presentation helper, canonical chip-wrap protection, focused component/shell coverage, and the exact derived startup-graph ceiling of 158 files / 1,525,486 source bytes. The change does not affect chip storage or expansion, attachment delivery, queue semantics, persisted/model-facing text, live-editor behavior, or installed Pi code.

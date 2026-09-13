## Why

After PR #360, a pinned timestamp keeps its normal gray metadata color but receives additional whole-row faint styling when its source block scrolls out, making it barely visible. The user confirmed that the timestamp must remain exactly as it looks before the row dims, while only the rest of the pinned row fades.

## What Changes

- Exempt the timestamp glyphs from the additional quiet-state fading on bare-A1 pinned user prompts and completed compactions.
- Retain the current pre-dimming metadata color and brightness; do not restore the former white timestamp or introduce a brighter palette.
- Keep the prefix and content quiet after the full source block scrolls out, with unchanged hover behavior for the rest of the row.
- Preserve timestamp formatting, original event time, width omission, normal source rows, prompt navigation, click-to-source, selection/copy, links, caches, and the `a1 pi` comparison route.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Specify invariant pinned-timestamp brightness as an explicit exception to quiet-row fading.

## Impact

The expected implementation surface is the owned sticky-row timestamp composition and quiet-style boundary, with focused viewport and real-shell cell-attribute regressions. No dependency, session format, theme palette, or compaction-generation changes are intended. This is a follow-up to merged PR #360, not evidence that its outstanding visual acceptance passed; the earlier change remains unarchived pending resolution of this finding.

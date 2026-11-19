## Why

The supplied screenshots show a grey source timestamp becoming white when its first row scrolls above the viewport but the block still has visible continuation rows. Pinning alone should not promote this metadata to the body-text color.

## What Changes

- Keep the non-hovered prominent pinned timestamp in the same grey metadata foreground as its naturally visible source timestamp.
- Apply the shared behavior to submitted prompts and completed compaction blocks.
- Preserve existing quiet-row dimming and explicit hover highlighting, along with body text, layout, timestamps, and navigation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Require source-matching metadata color for prominent, non-hovered pinned timestamps.

## Impact

The owned session shell's pinned-row construction, viewport state styling, and focused terminal-cell tests are affected. No dependency, persisted format, palette, or comparison-profile change is intended. This is a new follow-up to merged #368, narrowly superseding its white prominent timestamp behavior; it does not reopen its implementation PR or claim prior visual acceptance. Planning only; implementation requires a subsequent request after this specification merges.

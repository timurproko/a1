## Why

Submitted-prompt timestamps currently shift among normal metadata grey, dimmed grey, and the brighter selected/hover foreground as prompt presentation changes. Keeping the timestamp on the existing selected-state foreground makes this metadata visually stable instead of appearing to change identity during navigation.

## What Changes

- Render submitted-prompt timestamps with the foreground currently used for the selected/hovered prompt state.
- Preserve that timestamp foreground and intensity for naturally visible, pinned, hovered, quiet/dimmed, and text-selected prompt presentations.
- Keep prompt-body colors, state backgrounds, timestamp text, alignment, omission rules, and interaction behavior unchanged.
- Add focused rendering coverage that compares timestamp cell styling across each affected state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Require submitted-prompt timestamps to retain one selected-state foreground across normal, pinned, hovered, quiet/dimmed, and selected presentations.

## Impact

- Submitted-prompt styling in the Pi session UI and its custom transcript viewport integration.
- Terminal-cell rendering assertions for user prompts and completed compaction prompt anchors.
- No public API, persistence format, dependency, or timestamp-layout changes.

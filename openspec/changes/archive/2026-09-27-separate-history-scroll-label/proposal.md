## Why

When a recalled prompt is taller than the visible editor, bare A1 appends the hidden-line count to the left-aligned history counter (`62/100 · ↑ 154 more`). This makes the overflow cue quieter and harder to locate than vanilla Pi's centered scroll indicators, while the separator suggests that both values are one label.

## What Changes

- Keep the compact history position/total at the existing left inset with no trailing dot or separator.
- Render the hidden-lines-above cue independently in the horizontal center of the top editor border, matching the placement, wording, and border color of the existing bottom overflow cue.
- Keep recalled multiline prompt content expanded instead of replacing it with a compact text-paste chip.
- Preserve width safety, history navigation, editor scrolling, prompt geometry, and the unchanged `a1 pi` comparison profile.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Separate the compact history counter from the default editor's centered top overflow indicator when both are visible.
- `persistent-prompt-history`: Keep recalled multiline prompt content visible and navigable instead of re-chipping the complete value.

## Impact

The change affects the owned default editor border composition, multiline recall presentation, and focused rendering tests. It changes no history storage, navigation, submitted content, engine protocol, dependency, or pinned comparison behavior.

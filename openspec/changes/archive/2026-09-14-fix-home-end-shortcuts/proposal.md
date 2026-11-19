## Why

Bare A1 currently intercepts unmodified Home and End to scroll the content area, preventing ordinary prompt line navigation, while Ctrl+Home and Ctrl+End reach the editor. Reverse that ownership so prompt editing uses the familiar unmodified keys and content-boundary navigation uses the Ctrl-modified keys.

## What Changes

- **BREAKING**: In bare A1's ordinary prompt context, Home and End move the cursor to the current logical input line's start and end instead of scrolling the transcript.
- **BREAKING**: Ctrl+Home and Ctrl+End navigate the content area to its beginning and complete current tail instead of moving the prompt cursor; Ctrl+End restores end following.
- Preserve the draft and cursor during content navigation, including when content fits and navigation has no visible effect.
- Preserve modal/replacement-input event ownership, unrelated shortcuts, and the pinned `a1 pi` comparison profile.
- Align active shortcut help and regression coverage with the new ownership, including terminal key encodings and live working-status tails.
- Show the jump-to-bottom block as `Jump to bottom (Ctrl+End) ↓`, `1 new message (Ctrl+End) ↓`, or `N new messages (Ctrl+End) ↓`, preserving its existing styling, hover, and click behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `custom-session-viewport`: Separate prompt line navigation from content-boundary shortcuts, update the working-tail return shortcut from End to Ctrl+End, and add the matching shortcut hint and trailing downward arrow to the jump-to-bottom block.

## Impact

- Bare-A1 viewport pre-input routing and its editor terminal-key port.
- Bare-A1 editor alias configuration and shortcut help where the old ownership is advertised.
- Jump-to-bottom label rendering and display-width-based hover/click geometry.
- Viewport controller, shell input-routing, editor, help, and bottom-control regression tests, including fixtures that currently use the old shortcuts.
- No new dependency, persisted setting, terminal-host binding, upstream package modification, or comparison-profile behavior change.

## Why

The resident terminal host dims modal backdrops with the faint text attribute. It leaves colored backgrounds, including the sticky submitted-prompt row, at full brightness behind the Commands palette. A modal should visually recede the entire underlying screen, not just its foreground text.

## What Changes

- Dim the resident host's complete rendered backdrop, including colored prompt, selection, and status backgrounds, while preserving the full-intensity modal panel.
- Restore the original colors when the modal closes, and cover transitions and both truecolor and indexed-color presentations with focused regression tests.

## Capabilities

### Modified Capabilities

- `multi-agent-tabs`: resident-host modal backdrops include the whole underlying screen, including pinned prompt rows.

## Impact

- Native resident terminal host presentation/composition and focused presentation tests.
- No change to the child terminal's content, prompt semantics, modal input ownership, or the pinned `a1 pi` comparison route.

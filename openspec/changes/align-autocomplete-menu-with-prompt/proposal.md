## Why

Bare A1's above-prompt autocomplete menu is inset by the two-cell prompt prefix, so the selection marker `→` sits under the `/` of the draft instead of under the `❯` prompt glyph, and every command label starts two cells to the right of the text the user is typing. The user wants the menu flush with the prompt: the marker under `❯`, the command under the draft text, and the existing gap between a command and its description unchanged.

## What Changes

- Render menu rows flush with the prompt column: the shared prompt presentation stops prefixing `after` rows with the prompt-prefix inset and pads them to the frame width instead.
- Keep every other menu property as it is: candidate ordering, labels, descriptions, semantic styling, the primary-column width that sets the command-to-description gap, pagination, the top counter line, and the pinned-Pi comparison route.
- Update the prompt-input and above-prompt placement tests so the reference rows are right-padded to the frame rather than left-inset by the prefix.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: above-prompt autocomplete rows sit flush with the prompt glyph column instead of inheriting the prompt-prefix inset; their internal column gap and every other rendering property remain unchanged.

## Impact

- Affected areas: `src/ui/components/prompt-input.ts`, `test/ui/components/prompt-input.test.ts`, and `test/integrations/pi/components/editor-autocomplete-placement.test.ts`.
- No editor, Settings search, keybinding, pagination, `a1 pi`, or pinned-Pi behavior changes are intended; only the horizontal offset of bare A1's menu rows moves.

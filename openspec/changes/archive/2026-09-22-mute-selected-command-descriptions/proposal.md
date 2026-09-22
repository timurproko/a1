## Why

Bare A1 currently paints an autocomplete row's entire selected line with the accent color. That makes explanatory descriptions cyan together with the command or candidate, reducing the visual distinction between the selectable value and its supporting text.

## What Changes

- Keep the selected arrow and primary autocomplete candidate in the accent role.
- Keep a selected candidate's description in the same muted description role used by unselected rows.
- Apply the presentation consistently to built-in commands, extension/resource completions, argument completions, and the existing skills tunnel in bare A1.
- Preserve row text, alignment, truncation, selection behavior, completion behavior, and the pinned `a1 pi` comparison presentation.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Refine the declared bare-A1 autocomplete presentation so selected descriptions remain muted while the primary candidate is accented.

## Impact

- Affects the bare-A1 default editor autocomplete theme in `src/integrations/pi/components/shell-editor-autocomplete.ts`.
- Adds focused ANSI-role regression coverage for selected autocomplete rows without changing command catalogs or completion semantics.

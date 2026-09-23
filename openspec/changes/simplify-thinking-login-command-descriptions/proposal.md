## Why

Bare A1 currently prepends argument syntax to the `thinking` and `login` autocomplete descriptions, producing `<level> – Set thinking level` and `<provider> – Configure provider authentication`. These rows should use the same concise description treatment as the surrounding built-in commands while retaining their argument workflows.

## What Changes

- Show `thinking` with the description `Set thinking level` and no `<level> –` prefix in bare-A1 slash-command autocomplete.
- Show `login` with the description `Configure provider authentication` and no `<provider> –` prefix in bare-A1 slash-command autocomplete.
- Preserve thinking-level and provider argument completion, command execution, ordering, and selected-row styling.
- Preserve the pinned argument-hint presentation in the `a1 pi` comparison profile and leave other command/resource hints unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Refine the declared bare-A1 command autocomplete presentation for the `thinking` and provider-login rows.

## Impact

- Affects the profile-specific built-in command catalog in `src/integrations/pi/components/shell-editor-autocomplete.ts` and bare-product provider-login metadata in `src/integrations/pi/engine/resource-catalog.ts`.
- Adds focused command-row and argument-completion regression coverage without changing command handlers, provider authentication, thinking selection, dependencies, or installed Pi code.

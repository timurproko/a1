## Why

The bare-A1 `/models` command advertises a `<search>` argument hint in slash-command autocomplete, so the entry reads `<search> — Switch models and manage scoped model cycling`. The hint adds nothing the description does not already say and the maintainer asked for it to go.

## What Changes

- Remove the `<search>` argument hint from the bare `models` built-in entry in the editor catalog and from the engine's autocomplete addition.
- Keep the description, the model argument options, the argument-seeds-the-query behavior, and the pinned `a1 pi` catalog unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `owned-pi-ui-foundation` requirement for `/models` describes the dialog and its argument behavior, not autocomplete hint text.

## Impact

- Affects `src/integrations/pi/components/shell-editor-autocomplete.ts`, `src/integrations/pi/engine/resource-catalog.ts`, and the engine workflow test that asserted the hint.

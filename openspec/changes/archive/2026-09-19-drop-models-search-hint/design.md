## Context

`OWNED_BUILTIN_SLASH_COMMANDS` and `PiResourceCatalog.workflowAutocompleteCommands` both carried `argumentHint: "<search>"` for the bare `models` command. The pinned autocomplete renders the hint before the description, which made the `/models` row read `<search> — Switch models and manage scoped model cycling`.

## Decision

Drop the hint from both declarations and leave everything else in place: the description, the `argumentOptions` that offer `provider/id` values, and the shell behavior that seeds the dialog's search from any argument. The comparison profile's `model` entry keeps its `<provider/model>` hint.

## Risks

- None beyond the autocomplete row text; the focused engine and shell suites assert the entry without the hint.

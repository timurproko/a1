## Why

The collapsed Skills dialog repeats the engine-facing `skill:` command prefix on every row even though the dialog already identifies the entries as skills. Showing only each skill name makes the browsing surface cleaner without changing how skills are searched, selected, or submitted.

## What Changes

- Label every row in the collapsed Skills dialog with the skill name only, omitting the `skill:` prefix.
- Preserve skill discovery order, search compatibility, selection styling, descriptions, scrolling, and `/skill:<name>` submission behavior.
- Keep expanded slash-command entries and the `/skills:` autocomplete tunnel unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-pi-ui-foundation`: Require the collapsed Skills dialog to display bare skill names while preserving command and expanded-menu syntax.

## Impact

The A1-owned Skills selector rendering and its focused component and shell tests will change. No persistence, settings schema, public API, dependency, engine command, or comparison-profile behavior changes are expected.

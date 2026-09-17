## Why

The selected settings row paints both its label and its value in the accent colour, so the value reads as part of the cursor rather than as the value it is. The user wants only the cursor and label to carry the accent; the selected value should look and behave exactly like every other value: muted at rest and brightened when the pointer is over it. This was corrected once before and came back because the pinned-Pi row parity test pins the accent value byte for byte, so the fix needs to become a declared product difference with its own regression tests.

## What Changes

- Render the selected row's value in the muted role, brightening to the terminal foreground on pointer hover, exactly as an unselected value; the cursor and label keep the accent.
- Declare the selected-value presentation as an owned product difference in the settings specification, the UI reference provenance, and the pinned session-shell provenance record.
- Rework the pinned settings presentation parity test so it keeps byte parity for unselected rows and for the selected row's cursor and label while asserting the declared muted value, and add component- and screen-level regression tests so the accent cannot return unnoticed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: The selected row carries the accent on its cursor and label only; its value keeps the unselected muted and hover presentation.

## Impact

- Affected areas: `src/ui/components/list-view.ts`, the list-view and settings-screen tests, the pinned settings presentation parity test, `docs/architecture/ui-reference-provenance.md`, and `config/baselines/pi-session-shell-provenance.json`.
- No dependency, settings-storage, keybinding, Pi settings document, or `a1 pi` behavior changes are intended; the pinned comparison profile keeps its own settings surface.

## Context

See `proposal.md` for motivation. At planning base `cfe8cf3b`, `renderListRow` in `src/ui/components/list-view.ts` paints the value as `theme.fg("accent", value)` whenever the row is selected, and otherwise as `theme.plain(value)` when the pointer is on the value or `theme.fg("muted", value)` at rest. That selected-value accent was introduced by #186 to match pinned Pi's `SettingsList`, and `test/features/owned-ui/pinned-settings-presentation-parity.test.ts` asserts byte equality between owned rows and pinned rows for a selected and an unselected row at three widths in every parity colour mode. Before #186 the value ignored selection, which is the presentation the user wants back. The settings screen strips styles in most of its tests, so nothing at the screen level currently pins which role the selected value renders in.

## Goals / Non-Goals

**Goals:**

- Selected row: accent cursor and label; value muted at rest and plain on pointer hover, identical to an unselected value.
- Keep pinned byte parity where it still holds: unselected rows entirely, and the selected row up to and including its label.
- Pin the presentation at three levels so it cannot silently regress: the list-view component, the settings screen with a naming theme, and the parity test's explicit declared difference.
- Record the difference wherever declared product differences are inventoried.

**Non-Goals:**

- Changing the stepper, suffix, menu, dialog, or header presentation.
- Changing pinned Pi, `a1 pi`, or the pinned comparison profile's settings surface.
- Introducing a new theme token or a per-screen colour override.

## Decisions

### 1. Selection no longer influences the value's role

`renderListRow` computes the value role from hover alone: `valueHovered ? theme.plain(value) : theme.fg("muted", value)`. The cursor and label keep their existing accent when selected. The compatibility comment that cites pinned `SettingsList` for the selected value is replaced by one naming the declared difference.

Keeping the accent for a selected value and restyling only on hover is rejected: it is the behaviour the user asked to remove.

### 2. Parity narrows to what still matches, and states what does not

The parity test keeps its three widths and colour modes. For the unselected row it still asserts byte equality with pinned Pi. For the selected row it asserts byte equality of the prefix through the padded label, then asserts the owned tail renders the value through `theme.fg("muted", …)` and that the pinned tail renders it through the accent, so the test proves the difference is deliberate rather than tolerating any drift. `assertIndependentRawTerminalParity` runs on the unselected row and on the selected row's shared prefix.

Substituting the pinned accent bytes for muted bytes before comparing is rejected: it would let an unrelated change to the pinned selected-row bytes pass unnoticed.

### 3. Regression tests at the component and screen layers

`test/ui/components/list-view.test.ts` asserts the selected row's value is `<muted>` at rest, unpainted on hover, and never `<accent>`. `test/features/owned-ui/settings-app.test.ts` renders the screen with a naming `UiTheme` through `host.theme` and asserts the selected row's label carries the accent while its value carries the muted role, and that a pointer report over the value brightens it without adding the accent.

### 4. Inventory the declared difference

The `owned-ui-settings` requirement adds the selected-value presentation to its list of declared product differences with a `Select a row` scenario; `docs/architecture/ui-reference-provenance.md` and the `settings-app.ts` entry in `config/baselines/pi-session-shell-provenance.json` name it among the owned differences so provenance governance stays truthful.

## Risks / Trade-offs

- **[Risk] Governance treats the provenance edit as drift.** → The `modifications` text and coverage list are edited in the same change and the parity test remains listed as the row evidence.
- **[Trade-off] Selected-row parity with pinned Pi is now partial.** → The remaining parity is asserted exactly and the difference is asserted explicitly, which is stronger than the silent full-row equality it replaces.

## Migration Plan

None; this is a presentation-only change with no stored state.

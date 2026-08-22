## Why

The settings screen works, and building it taught two things the codebase has not yet absorbed.

**What A1 shows about an engine setting is half derived and half transcribed.** The generated
metadata already carries the engine's own wording, presentation order, dialog flags, and numeric
limits, and a governance test fails when any of it drifts. But the choice lists are still hand-written
beside it — twenty-six of them, in a table the generator already produces and nobody reads. They have
drifted once already: A1 offers `fork, tree, none` for the double-escape action where the engine
offers `tree, fork, none`. Worse than a wrong order is a silent one: the exposed key set is a hand-kept
list of thirty-one names, so a setting the engine adds simply never appears, and a setting it renames
throws at startup rather than failing a build. A1 owns its UX; the data behind that UX belongs to the
engine, and every piece of it should arrive by the same governed route or stop the build.

**The screen owns components that are not about settings.** `settings-app.ts` is eight hundred lines,
and most of them are a list view with a value column and pointer regions, a dropdown that anchors and
flips, a dialog panel at the foot of the screen, a bounded numeric control, a search row, and a status
line. `ui-components` holds primitives — measurement, scrollbar, list rows, line input — but no
composite, so the next screen either copies eight hundred lines or invents a second answer to
questions this one already answered. The hint line is the sharpest example: it is a hand-typed string
sitting beside a shortcut registry that already knows every key, so the two can disagree and did.

## What Changes

- Derive every value list from the engine: use the extracted values the generator already writes, and
  extract the two that come from a submenu rather than an inline list.
- Govern the exposed set: the accessor table stays hand-written and typed, because the engine's API is
  typed and binding it by reflection would trade one silent failure for another — but its coverage is
  checked against the generated inventory, so a setting the engine adds or renames fails the build and
  names itself.
- Move engine grammar behind the engine boundary: the composite theme value (`light/dark` meaning
  "follow the terminal") and the list of installed themes are engine knowledge sitting in the wiring
  layer today. Runtime-resolved value lists become a declared provider on the boundary rather than a
  decorator wrapped around a port.
- Extract the composites into `ui-components`: list view, value menu, dialog panel, stepper, search
  row, status line, each with its own tests, and a declared disabled role in the theme so an
  unavailable control is not painted with escapes written at the call site.
- Derive a screen's hint line from its declared shortcuts, so the footer cannot disagree with the keys.
- Reduce the settings screen to what is about settings: which sections exist, how a value is shown,
  and where an accepted change is routed.
- Record the standing rules above as a capability of their own, so the next surface inherits them
  rather than rediscovering them.

Deliberately excluded: any change to what the settings screen looks like or does. This change is
behaviour-preserving for the reader; every difference it makes is visible only to the next screen and
to the next engine upgrade. Also excluded: composites with no second consumer yet — tab strips, output
views, context menus. They arrive with the feature that needs them.

**BREAKING**: none.

## Capabilities

### New Capabilities

- `owned-ux-architecture`: the standing rules for every A1 surface — A1 owns the experience and
  derives the vendor's data, an unabsorbed vendor change fails the build by name, vendor knowledge
  stays behind the vendor boundary, a screen composes shared components, state is shown rather than
  narrated, colour comes from declared theme roles, and one declaration answers both dispatch and
  description. Stated once here so a feature inherits them instead of restating them.

### Modified Capabilities

- `ui-components`: gains the composite components every screen needs — the list view with a value
  column and pointer regions, the anchored value menu, the dialog panel, the bounded numeric control,
  the search row, and the status line — plus the rule that a screen composes them rather than drawing
  chrome of its own, and a declared role for a control that cannot be used.
- `ui-apps`: a screen's hint line is derived from its declared shortcuts rather than written twice.
- `pi-api-boundary`: everything A1 shows about an engine setting is derived from the engine, the
  exposed set is governed so an engine change fails the build rather than disappearing, and a value
  list that can only be resolved at runtime arrives through a declared provider on the boundary.

## Capabilities, continued

- `owned-ui-settings`: gains requirements for behaviour the screen already has and the spec never
  described — a setting whose value is an object edited through its own dialog, a theme that may
  follow the terminal appearance, and a search that reads section names as well as setting names.

## Sequencing

This change follows `establish-owned-ui-component-system`, which introduces `ui-components`,
`ui-apps`, and the settings screen it refactors. It also picks up that change's unwritten component
tests and its shortcut listing, because the extraction here needs those tests as its safety net and
the listing shares a source with the hint line. The parity gate it also left open is a separate
concern and goes to `govern-owned-surface-parity`.

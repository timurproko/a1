## 1. Record the standing rules

- [x] 1.1 Add the `owned-ux-architecture` capability so the rules that apply to every surface —
  derived vendor data, loud failure on an unabsorbed vendor change, vendor knowledge behind the
  boundary, screens composing components, state shown rather than narrated, colour from theme roles,
  one declaration for dispatch and description — are stated once rather than per feature
- [ ] 1.2 Reference it from `docs/architecture/boundaries.md` so a reader of the architecture notes
  arrives at the same rules

## 2. Cover the behaviour before moving it

- [x] 2.1 Extend `test/features/owned-ui/settings-app.test.ts` to cover what is about to move: value
  column alignment across differing label widths, pointer regions, the menu's anchor and its flip near
  the bottom, press-outside-closes, the status line's hint and report, and the search row's placeholder
  and caret
- [x] 2.2 Record which of those assertions belong to the component layer, so each moves with its
  component rather than being duplicated

## 2b. Cover the component layer it stands on

- [x] 2b.1 Test the scrollbar: geometry from content length, viewport height, and scroll position, a
  minimum one-row thumb clamped inside the track, and the fits-in-viewport case reserving no space
- [x] 2b.2 Test rail-scoped hover and drag, driving two rails and asserting each affects only the one
  addressed
- [x] 2b.3 Test app registration and the host: replace-on-re-register, a reported failure for an
  unregistered identity, resize re-rendering, a second app replacing the first, the declared interrupt
  policy, and a throwing app being closed with the previous surface restored
- [x] 2b.4 Test the shortcut registry: in-scope dispatch, out-of-scope and undeclared pass-through, and
  conflict detection naming both declarations including a screen shadowing a global

## 3. Derive the Pi settings data

- [x] 3.1 Read the offered values from the generated metadata in
  `src/foundation/pi-engine-adapter/settings-integration.ts` and delete the hand-written choice lists;
  verify the double-escape action offers Pi's order rather than the transcribed one
- [x] 3.2 Extract the values Pi states through a declared map rather than an inline list — the default
  project trust — in `scripts/pi-settings-metadata.mjs`, and regenerate. The thinking level turned out
  not to be extractable: Pi reads it from the running session, so it moves to the runtime provider in
  section 4 alongside the installed themes
- [x] 3.3 Emit the inventory of settings Pi presents into the generated metadata, and derive
  `EXPOSED_SETTING_KEYS` from it rather than keeping the list by hand
- [x] 3.4 Add a governance test that fails naming any setting Pi presents that the accessor table does
  not map, and any setting the table maps that Pi no longer presents; verify both directions with a
  fixture

## 4. Move Pi grammar behind the boundary

- [ ] 4.1 Add a declared provider on the settings contract for values resolved at read time, so a
  descriptor can name one instead of carrying a fixed list
- [ ] 4.2 Move the theme's composite grammar and the installed-theme lookup out of
  `src/composition/theme-settings.ts` into the Pi adapter, exposing the automatic mode and its two
  parts as ordinary descriptors; resolve the import boundary this requires and record the resolution
- [ ] 4.3 Reduce composition to wiring: no interpretation of a Pi value, no port wrapper; move
  `test/composition/theme-settings.test.ts` to the adapter's tests

## 5. Extract the components

- [x] 5.1 Extract the list view — rows with an aligned value column, pointer regions for label, value,
  and the controls beside it, hover distinct from selection — into `ui-components` with its own tests
- [x] 5.2 Extract the value menu — anchored to the row it opened from, flipping above when there is no
  room below, nothing highlighted until picked, press-outside closes — with its own tests
- [x] 5.3 Extract the dialog panel — its layout, its own record of what it is editing, pointer
  ownership, and clearing the hover behind it — with its own tests
- [x] 5.4 Extract the bounded control — stepping through a range or a list of values, doing nothing at
  either end, drawn over the value it belongs to — with its own tests
- [x] 5.5 Extract the input row and the status line, and add the unavailable role to the theme so the
  faint escape written at the call site goes
- [x] 5.6 Reduce `src/features/owned-ui/settings-app.ts` to what is about settings — which sections
  exist, how a value is shown, where an accepted change is routed — and confirm it no longer draws
  chrome of its own

## 6. Derive what the keys say

- [ ] 6.1 Render the settings screen's hint from `SETTINGS_SHORTCUTS` rather than the written constant,
  naming each key as the registry names it
- [ ] 6.2 Derive the shortcut listing from the registry as well, so a newly declared shortcut appears
  without a separate edit and every listed entry dispatches what it describes
- [ ] 6.3 Add a check that fails when a surface describes a key the declaration does not bind

## 6b. Write down what the settings screen already does

- [x] 6b.1 Add the settings requirements for behaviour that has none: a setting whose value is an
  object edited through its own dialog, a theme that may follow the terminal appearance, and a search
  that reads section names
- [x] 6b.2 After this change and the component change are archived, revisit the settings screen
  requirement so it states that the screen composes shared components rather than drawing its own

## 7. Validate and integrate

- [ ] 7.1 `npm run typecheck`, `npm run check:architecture`, and `openspec validate --strict` pass
- [ ] 7.2 Confirm the settings screen behaves as it did before this change — no visible difference for
  the reader in the list, the menu, the dialog, the search row, or the status line
- [ ] 7.3 Open the pull request and let CI validate
- [ ] 7.4 Record manual acceptance, then archive

## Why

The owned settings screen draws its list scrollbar whenever the list overflows, ignoring the `Scrollbar mode` and `Scrollbar style` values it exposes on that same screen: `auto` reads as `always`, and `hidden` still draws a rail. It also jumps to the first and last setting on unmodified `Home` and `End`, while the bare-A1 transcript reserves those keys for prompt line movement and uses `Ctrl+Home` and `Ctrl+End` for content boundaries. Make the settings list follow the shared scrollbar settings and the same boundary chords as the agent view.

## What Changes

- The settings list rail resolves the effective live `scrollbarAppearance` and `scrollbarStyle`, including an accepted value pending source reflection, through the shared scrollbar presentation policy: `always` draws the rail whenever the list overflows, `auto` draws it while the list scrolls and for the transcript's linger afterwards, or while the pointer is over the rail or dragging its thumb, and `hidden` never draws it.
- The settings rail gains the same pointer behavior as the transcript rail: hovering reveals it under `auto` and thickens the thumb, dragging the thumb scrolls the list, and pressing the track above or below the thumb pages.
- **BREAKING**: `Ctrl+Home` and `Ctrl+End` replace `Home` and `End` as the settings shortcuts for the first and last setting, in the list and while searching. Unmodified `Home` and `End` move the search input's cursor while searching and do nothing in the list.
- Shortcut declarations, the standing status bar, and the settings regression tests follow the new bindings and the appearance-dependent rail.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `owned-ui-settings`: Settings-list scrollbar presentation follows the shared appearance and style settings with rail pointer interaction, and boundary jumps use `Ctrl+Home`/`Ctrl+End`.

## Impact

- `src/features/owned-ui/settings-app.ts`: rail presentation, rail hover/drag/paging, key table, and shortcut declarations.
- `src/ui/components/surface.ts`: the shared rail renderer accepts a presentation rather than always drawing the thin rail.
- `test/features/owned-ui/settings-app.test.ts` and the settings interaction governance test: updated key fixtures and new appearance, style, and rail-pointer coverage.
- No new dependency, persisted setting, migration, engine-port change, transcript-viewport change, or `a1 pi` comparison-profile change.

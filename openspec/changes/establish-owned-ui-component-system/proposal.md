## Why

A1 owns its UI now, but it owns no UI *system*. `src/features/owned-ui/customization.ts` can register
a slot implementation, and `owned-ui-contracts` names ten slot ids, yet nothing says how a screen
renders itself, how it scrolls, how it decides which key does what, or how it draws a scrollbar. The
only composition available is the pinned Pi shell, which reproduces one specific application rather
than offering primitives.

The cost of that gap is already measurable. Building the settings screen meant writing a row model,
sticky section headers, a scroll clamp, a block-jump keymap, and a value chooser — none of which is
about settings. The next screen (hotkeys, updates, the custom viewport, the eventual workspace) would
write its own, slightly differently, and A1 would accumulate several answers to "how does a fullscreen
list behave" with no way to tell which is correct.

This change establishes the shared layer first, so screens are consumers rather than inventors. The
settings screen is its first consumer and proves it against a real surface.

## What Changes

- Add a rendering discipline: an explicit invalidation contract with revision kinds, and a frame
  contract requiring a pane to emit exactly the rows and columns it was given, validated rather than
  assumed.
- Add presentation primitives: display-width-correct measurement and truncation for wide and
  combining characters, and one scrollbar with declared geometry, hover, drag, and per-rail identity.
- Add a pane contract: render into a rectangle, receive focused keyboard input, receive mouse input
  in pane-local coordinates, and invalidate cached layout. Add the two panes every screen needs — a
  list block with grouped rows, sticky group headers, and block navigation; and a single-line input
  for filtering and inline editing.
- Add an app contract and host: register an app by stable id, open it fullscreen, expose size, theme,
  render requests, close, and return-to-previous, with an explicit Ctrl+C policy each host must choose
  rather than inherit by accident.
- Add a declarative shortcut registry: a screen declares its bindings, conflicts are detected rather
  than discovered by a user, and one registry is the source for dispatch and for what `/hotkeys` shows.
- Port the settings screen onto the layer and declare it as the A1-owned replacement for the pinned
  settings route, which is the acceptance evidence that the layer is usable and complete enough.

Deliberately excluded: panes with no consumer yet — output views, prompt bars, tab icons, context
menus, status bars, text selection across panes. Each arrives with the feature that needs it, so the
layer stays provable. Also excluded: any change to the pinned Pi shell's own composition.

**BREAKING**: none. Nothing renders differently until a screen adopts the layer.

## Capabilities

### New Capabilities

- `owned-ui-components`: the rendering and composition primitives A1 screens are built from — the
  invalidation and frame contracts, display-width measurement, the scrollbar, the pane contract, the
  grouped list block with sticky headers and block navigation, and the single-line input.
- `owned-ui-apps`: A1-owned applications and the host that runs them — registration by stable id,
  fullscreen presentation, host services (size, theme, render request, close, return-to-previous),
  input and mouse dispatch, the explicit Ctrl+C policy, and app lifecycle.
- `owned-ui-shortcuts`: declared keyboard shortcuts as data — per-screen and global bindings,
  conflict detection, and one registry that both dispatch and the shortcut listing read.

### Modified Capabilities

- `owned-pi-ui-foundation`: the parity baseline requires the owned shell to reproduce pinned Pi's
  complete visible surface set, and its `Open settings` scenario requires the pinned specialized
  selector to open on `/settings`. The settings app supersedes that route, so the requirement changes
  to admit a declared A1-owned replacement after parity acceptance: the superseded behavior stays
  provable through `a1 pi`, and every capability the pinned route exposed stays reachable from its
  replacement. A new requirement makes A1-owned additions and replacements legal only when declared,
  and fails parity on an undeclared surface, on an addition that displaces pinned behavior, and on a
  replacement that drops a superseded capability.
- `owned-ui-settings`: gains the surface requirement this capability deliberately deferred — the
  settings app renders the existing section model, and `/settings` resolves to it in bare A1.

## Impact

- New: `src/foundation/owned-ui-components/` and `src/foundation/owned-ui-apps/` with their tests;
  a shortcut registry alongside them.
- Modified: `src/foundation/pi-owned-ui-integration/session-shell.ts` gains a route-resolution seam so
  a declared A1 app can supersede a pinned route; `src/composition/` wires the registry and the
  settings app; `src/features/owned-ui/` declares the A1-owned surfaces.
- Parity: `scripts/pi-terminal-parity/scenario.mjs` currently drives `/settings` and compares seven
  checkpoints against untouched Pi. Those checkpoints must be classified as superseded from the
  declaration rather than excluded by hand, and the pinned settings behavior remains compared through
  `a1 pi`.
- No dependency, packaging, native, or protocol changes.

## Context

See `proposal.md` for motivation.

What exists: `owned-ui-contracts` names ten slot ids and the session view model;
`src/features/owned-ui/customization.ts` holds a slot registry and an owned command surface;
`pi-component-adapter` exposes `PiShellComponentPort` — `render(width): string[]`, optional
`handleInput(data)`, `invalidate()`; `pi-tui-runtime-adapter` exposes
`showOverlay(component, { width, maxHeight, anchor })` and `viewport()`. `pi-owned-ui-integration`
resolves a slash route in `#slashCommand`, where `isWorkflowRoute` sends it to the pinned workflow.

What is missing: everything between "a component can emit strings" and "a screen exists" — scrolling,
sticky headers, a keymap, a scrollbar, a fullscreen host, and any notion of an app.

Two existing constraints shape this. `owned-pi-ui-foundation` requires the owned shell to reproduce
pinned Pi's surface set and forbids substituting approximations for covered pinned behavior, so an
A1-owned screen has to be declared rather than merely built. `project-structure-governance` requires
each owner to declare what it may import, and a feature may not import a Pi adapter directly.

`src/foundation/owned-ui-settings` already ships the settings section model, which this change
renders. It has no surface by design.

## Goals / Non-Goals

**Goals:**

- Primitives a second and third screen can adopt without editing them.
- Contracts strict enough to be tested without a terminal: rectangle in, rows out.
- One place where a shortcut is declared, so `/hotkeys` and dispatch cannot disagree.
- Prove the layer against a real screen in the same change, rather than shipping unused abstractions.

**Non-Goals:**

- No general widget toolkit. Only the panes the settings screen needs, specified so they generalize.
- No change to how the pinned Pi shell composes itself.
- No mouse-driven text selection across panes, no output view, no prompt bar, no tab icons.
- No new terminal ownership: rendering still goes through the existing runtime adapter.

## Decisions

### Panes render into a rectangle and return exactly it

`PiShellComponentPort.render(width)` returns as many rows as it likes, which is why the shell has to
count them to place anything below. The pane contract instead takes `{ width, height }` and must
return exactly `height` rows, validated. Rationale: a screen that owns the viewport needs deterministic
layout — a sticky header, a body, and a footer can only be composed if each part's height is known
before rendering. Validation turns a class of layout corruption into a named failure.

Alternative considered: keep the existing variable-height port everywhere. Rejected: the settings
screen already needed exact heights to place its footer, and every future screen would re-derive that
arithmetic.

### The app host uses the existing overlay path, full viewport

An app is presented by mounting one component through the runtime adapter's existing overlay, sized to
the whole viewport rather than a centered box. Rationale: no new terminal ownership, no alternate
screen, and the regular-mode terminal rules in `terminal-agent-runtime` stay satisfied — A1 is not
taking the screen, it is drawing a full-width component in the space it already owns.

Alternative considered: entering the alternate screen for apps. Rejected: `owned-pi-ui-foundation`
requires regular mode not to enter the alternate screen, and that is a parity-visible behavior.

### Route resolution is a declared seam, not a special case

The shell resolves a slash route against declared A1-owned surfaces before consulting the pinned
workflow table. A declaration names the route, the owning app, and — for a replacement — the pinned
route it supersedes. Rationale: without this the shell would need a hardcoded branch per screen, and
the parity gate would need a hardcoded exclusion list; both drift the first time a screen is added.
The same declaration feeds the shell, the parity classification, and the shortcut listing.

### Invalidation is declared, not inferred

Components declare revisions by kind and hosts cache frames against them. Rationale: a settings screen
re-renders on selection, hover, content, and theme changes, and inferring which happened means either
re-rendering everything every frame or guessing. Declaring is cheap and makes caching provable.

Components that declare nothing are treated as always stale, so adoption is incremental.

### The scrollbar owns rail identity

Hover and drag state belong to a named rail rather than to a global, because two scrollable surfaces
can be visible at once. Rationale: the reference implementation learned this — a single global hover
flag makes an unrelated scrollbar light up.

### Shortcuts are data with conflict detection

A screen declares bindings; assembling the registry reports duplicates in overlapping scopes rather
than resolving them by declaration order. Rationale: a silently shadowed key is discovered by a user,
not by a maintainer, and `/hotkeys` is only honest if it is generated from the same declarations
dispatch uses.

### Ports live in foundation, screens in features

`ui-components` and `ui-apps` are foundation owners with no dependency on any feature.
The settings screen consumes them plus `owned-ui-settings`. Rationale: the layering already forbids a
foundation module importing a feature, and it is the rule that keeps the layer reusable — if the
component layer knew what a setting was, the next screen could not use it.

## Risks / Trade-offs

- **[A shared layer built for one consumer bends toward that consumer]** → The specs are written in
  terms of rows, groups, and rails rather than settings, and the second consumer (hotkeys) is the
  test of whether that held. Where the settings screen needs something a general pane should not have,
  it stays in the settings screen.
- **[Superseding `/settings` invalidates seven parity checkpoints]** → The parity scenario drives
  `/settings` and compares `settings-selector`, `settings-navigation`, `settings-cancel-restored`, and
  four `settings-theme-*` against untouched Pi. They are reclassified as superseded from the
  declaration, and the pinned behavior remains compared through `a1 pi`. A hand-maintained exclusion
  list would be the wrong fix.
- **[`test:pi-terminal-parity` runs in no CI workflow]** → The declaration-driven classification is
  worth little if the gate never runs. This change asserts the classification by ordinary fast-tier
  tests so the rule is enforced somewhere; wiring the parity gate into CI remains a separate concern.
- **[Exact-height rendering is stricter than what exists]** → Adoption is incremental: the new panes
  obey it, the pinned shell composition is untouched, and validation names the offender rather than
  failing globally.

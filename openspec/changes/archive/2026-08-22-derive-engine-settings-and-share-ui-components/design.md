## Context

Two seams are under review: what A1 knows about the engine's settings, and what a screen knows about
drawing itself. Both are working today; both are held together by hand-kept copies that nothing
checks.

The engine states its settings in its own source: an item list with wording, order, and offered
values; submenus for the settings it edits through a dialog; and clamps in its settings manager for
the numbers it accepts. A1 already reads the first three of those into
`src/foundation/pi-engine-adapter/pi-settings-metadata.json` and fails a governance test on drift.
The values are read and then ignored, and the inventory of settings A1 exposes is a separate hand-kept
list.

## Goals / Non-Goals

- Goal: every fact A1 presents about an engine setting has one source, and that source is the engine.
- Goal: an engine change that A1 has not absorbed stops the build and names itself.
- Goal: a second screen is built by composing components, not by copying a screen.
- Non-Goal: changing how the settings screen looks or behaves.
- Non-Goal: generating the accessor table. The engine's API is typed; reflecting through it would
  replace a compile error with a runtime one.

## Decisions

### The accessor table stays hand-written; its coverage is generated

Each exposed setting names an engine getter and setter. That pairing is the one thing the engine's
source does not state in a form worth parsing — the interactive mode wires callbacks to a settings
manager several layers from the item list — and it is the one thing TypeScript checks for us.

So the table stays, and the *inventory* moves: the generator writes which settings the engine presents,
and a governance test compares that inventory against the table. A setting the engine presents and A1
does not map fails the build naming the key; a setting A1 maps that the engine no longer presents
fails the same way. The failure is a build failure with a name in it, not a startup exception or a
missing row.

Alternative considered: binding by reflection (`settings[\`get\${Name}\`]()`). Rejected — it removes
the compile-time check that today catches a renamed engine method, and it makes every setting's type
`unknown` at the boundary.

### Runtime-resolved value lists are a declared provider

Most value lists are static and generated. One is not: the installed themes are the two built-ins plus
whatever theme files the reader has, readable only at runtime. That is being served today by wrapping
the settings port in the composition layer, which puts engine grammar — the key name, the `light/dark`
pair meaning "follow the terminal" — in the layer whose job is wiring.

The boundary gains a declared way to say "this setting's choices are resolved when read", and the
theme's composite grammar moves behind the engine boundary with the rest of the engine's knowledge.
Composition returns to wiring.

### Composites live in `ui-components`, screens supply data and intent

The split is: a component knows how something is drawn and pointed at; a screen knows what the thing
means. The list view knows a row has a label, a value, and pointer regions, and that the value column
aligns; it does not know what a setting is. The stepper knows a number has ends; the screen knows
which number and where the ends come from.

Each composite arrives with the tests the screen's own test file is standing in for today, and the
screen keeps only the tests that are about settings.

### The hint line is derived

A screen declares its shortcuts in a registry that already holds a description and a section for each.
The hint line becomes a rendering of that registry, so adding a key adds it to the footer and cannot
be forgotten there.

## Risks / Trade-offs

- The generated inventory could disagree with the table during an engine upgrade, which is the point:
  the upgrade pauses on a named failure. Mitigation is the existing one — `npm run sync:pi-ui`
  regenerates, and the diff shows what the engine changed.
- Extracting six composites touches the one screen that exists, so the refactor's safety rests on the
  screen's tests. They are extended first, before anything moves.
- A component layer can be over-generalised into an abstraction nothing needs. Each composite here has
  exactly one consumer today and is extracted at the shape that consumer already uses, not at an
  imagined one.

## Migration Plan

1. Extend the settings screen's tests to cover the behaviour about to move.
2. Derive the data — values, inventory, governance — with no UI change.
3. Move the engine grammar and the runtime provider behind the boundary.
4. Extract the composites one at a time, each with its tests, the screen shrinking as they land.
5. Derive the hint line last, once the shortcut registry is the only description of the keys.

## Open Questions

None.

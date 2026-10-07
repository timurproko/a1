## Context

See `proposal.md` for motivation and `specs/owned-pi-ui-foundation/spec.md` for the observable contract. The Session Tree owns label-timestamp visibility in `TreeList`, where `Shift+T` flips a private boolean. Its footer is rendered by a separate `TreeHelp` component from a static shortcut-item table, so the current `label time` action has no access to the state it controls. Resume Session already demonstrates the desired pattern by deriving `path (on)` or `path (off)` during footer rendering.

The result counter independently appends `label time` only when timestamps are enabled. That status describes the result presentation and is not the footer action the user asked to clarify, so it remains unchanged.

## Goals / Non-Goals

**Goals:**

- Render `Shift+T time (off)` when label timestamps are hidden and `Shift+T time (on)` when they are visible.
- Make the footer derive its text from the same state that controls timestamp rendering.
- Preserve shortcut ordering, styling, wrapping, and immediate state changes through the existing render cycle.

**Non-Goals:**

- Changing the `Shift+T` binding or timestamp visibility default.
- Renaming the enabled result-counter status, changing timestamp formatting, or persisting the toggle.
- Changing other Session Tree controls or the Resume Session selector.

## Decisions

### 1. Expose read-only timestamp visibility to the help presenter

`TreeList` will provide a narrow read-only state query, and `TreeHelp` will receive the owning list so each render can derive the action as `time (${state})`. This keeps the control text tied to the authoritative rendering state without duplicating a boolean or adding a callback lifecycle.

Passing only an initial label was rejected because it would become stale after `Shift+T`. Moving the toggle state into `TreeHelp` was rejected because timestamp rows and result status are rendered by `TreeList`, creating competing sources of truth.

### 2. Keep static help metadata for state-independent actions

The existing static help table will retain all ordinary actions. The timestamp item will be identified during help rendering and receive its dynamic label, preserving established ordering, semantic key/action styling, wrapping, and close-hint composition.

Rebuilding the complete footer outside the shared mapping was rejected because it would duplicate formatting and increase the chance of ordering or wrapping regressions for an otherwise local label change.

### 3. Verify both states in the focused component path

The Session Tree component test will assert the initial off hint, toggle with the existing `Shift+T` input, then assert the on hint and retained timestamp/result behavior. This proves the visible label follows interaction state rather than only checking a helper in isolation.

## Risks / Trade-offs

- **[The dynamic text changes footer width]** → Retain the existing chunk-aware help wrapping and cover the normal rendered frame without weakening width assertions.
- **[Footer and row state could diverge]** → Read both from the same `TreeList` boolean on every render.
- **[A source-attributed component hash changes]** → Refresh the copied-source provenance ledger through its repository-owned updater and run the applicable governance check during implementation.

## Migration Plan

No data or configuration migration is required. The change is presentation-only and can be rolled back without affecting sessions, labels, timestamps, or keybindings.

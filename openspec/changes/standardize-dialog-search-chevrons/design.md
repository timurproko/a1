# Design

## Context

See `proposal.md` for motivation and the delta specifications for the required behavior. Bare A1 currently has three search-field presentations: the command palette uses an accent `>`, Pi `Input`-based dialogs render the default unthemed `> `, and the Settings per-model Thinking Level selector explicitly suppresses its marker. Recent input unification intentionally made general Settings and auxiliary inputs marker-free, so this change must distinguish standard dialog search from full-screen application search and from ordinary text entry.

Several searchable dialogs own their `Input` directly, while the model and authentication selectors are public Pi components adapted at the A1 modal boundary. The implementation cannot inspect private fields, cache themed ANSI in component state, or rewrite arbitrary rendered rows heuristically.

## Goals / Non-Goals

**Goals:**

- Give every bare-A1 standard dialog search field the exact ASCII `> ` marker in the live semantic accent role.
- Use one presentation policy for A1-owned and explicitly adapted public Pi search inputs.
- Restore the marker in the Settings per-model Thinking Level model-search step.
- Preserve input behavior, focus, geometry, clipping, filtering, and live theme changes.

**Non-Goals:**

- Adding a marker to the full-screen Settings search field.
- Restyling the main agent `❯` prompt, command palette, ordinary label/rename/API-key inputs, or extension-owned custom input surfaces.
- Changing search activation, matching, selection, navigation, cancellation, or shortcut text.
- Changing the pinned `a1 pi` comparison profile.

## Decisions

### 1. Define one semantic standard-dialog search marker

The shared presentation will define the marker as exact ASCII `> `, with only the `>` glyph painted through the active theme's `accent` role. The following space remains ordinary layout spacing. Theme resolution will happen during render so an open dialog repaints after a live accent change and no concrete ANSI string is retained as state.

A literal color or one-time themed constructor string was rejected because it would not follow the active theme. Using the Unicode agent-prompt `❯` was rejected because the requested and established dialog grammar is the ASCII greater-than marker.

### 2. Adapt the existing input component instead of replacing editing behavior

Pi `Input`-based dialogs will keep their existing input instance, value, cursor, focus, IME marker, event handling, and default two-cell prompt geometry. A shared presentation adapter will render that exact component while applying the semantic marker style. Public Pi selectors will be adapted only through explicit component identity or source-traced structural slots at the existing A1 modal boundary; no private field access or rendered-text search will be introduced.

A new search editor was rejected because it would duplicate mature editing and focus behavior. Post-processing arbitrary rows was rejected because it could recolor query content that happens to begin with `>` and would violate the explicit modal-adaptation boundary.

### 3. Treat searchable dialogs as a declared inventory

The bare-A1 standard searchable-dialog inventory for this change is Models, the legacy model selector, scoped-model configuration, Skills, Thinking Level, Resume Session, Session Tree, and login/logout provider selection. Each will use the same marker role. The Settings per-model Thinking Level step-one model search joins that inventory through the shared stepped-dialog renderer.

Label editing, session rename, extension input, authentication value entry, and other non-search text fields keep their current presentation. This avoids turning every text box into a search affordance.

### 4. Keep full-screen Settings search marker-free

The main Settings search field remains application chrome at the bottom of the full-screen screen and retains its marker-free shared-input geometry. Only the nested per-model Thinking Level selector receives `> ` because it is a standard dialog search surface. The stepped renderer will opt into the accent search marker explicitly, so other auxiliary inputs do not change implicitly.

### 5. Prove semantic color, coverage, and geometry

Focused tests will assert plain text and effective cell style for the marker, not only ANSI substrings. Coverage will include representative owned and adapted Pi dialogs, the nested Settings selector, dark and light themes, live accent changes where supported, narrow widths, typed queries, focus/cursor placement, and preserved marker-free/non-search surfaces. Existing filtering, navigation, cancellation, and comparison-profile tests remain authoritative for behavior.

## Risks / Trade-offs

- **[One dialog remains white or marker-free]** → Keep an explicit searchable-dialog inventory and add a regression for every construction path.
- **[Styling shifts query or cursor geometry]** → Reuse the existing Pi `Input` prompt width and add the marker to Settings through the shared input geometry rather than string concatenation after layout.
- **[A theme change leaves a stale marker color]** → Resolve `accent` during render and test repainting without reconstructing the dialog.
- **[A public Pi selector adapter becomes brittle]** → Use source-traced explicit component slots with fail-closed assertions and focused constructor tests.
- **[Non-search inputs gain misleading chevrons]** → Keep marker opt-in tied to the declared search inventory and assert rename/label/general Settings inputs remain unchanged.

## Migration Plan

No stored-data migration is required. Implement the shared marker presentation first, apply it across the declared dialog inventory, then opt the Settings stepped model search into the same role. Rollback removes the presentation adapters and restores the nested Settings marker-free option without changing queries, settings, or sessions.

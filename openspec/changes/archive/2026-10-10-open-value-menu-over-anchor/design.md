# Design

## Context

`valueMenuFrame` places the menu on the row below its anchor and flips it above only when it would run off the bottom. `SettingsApp` opens a pointer menu with index `-1`, so nothing is highlighted until pointer motion or a navigation key picks an entry.

## Goals / Non-Goals

**Goals:**

- Put the entry for the value in effect on the anchor row, so the source value is replaced in place rather than repeated.
- Keep the menu inside the body near either edge.
- Highlight the value in effect as soon as the pointer opens the menu.

**Non-Goals:**

- Change menu width, column alignment, previews, styling, or hit testing.
- Change keyboard navigation, Escape cancellation, confirmation, or press-outside dismissal.

## Decisions

### 1. Anchor on the value in effect, then clamp

The frame top becomes `anchorRow - indexOf(current)`, clamped to `[bodyTop, bodyBottom - rows]`. A missing current value anchors the first choice. Keeping the below/above flip as a fallback was rejected because clamping already covers both edges with a single rule.

### 2. Start every menu on the value in effect

Pointer and keyboard opening both initialize the active index to the value in effect. The pointer-opened inactive state existed so the opening press would not flash an unrelated highlight; with the menu laid over its anchor, the press already rests on the value in effect, so highlighting it is the expected result.

## Risks / Trade-offs

- **[The source row's label highlight sits beside the menu]** → The menu covers only the value columns; the selected row keeps its own treatment.
- **[Near an edge the value in effect is no longer on the anchor row]** → The shift is the minimum needed, and the value stays marked.

## Migration Plan

No data migration is required. The change affects transient menu state only.

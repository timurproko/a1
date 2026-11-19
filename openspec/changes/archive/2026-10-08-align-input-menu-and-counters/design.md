## Context

See `proposal.md` for motivation. Bare A1's shared prompt presentation reserves the two-cell `❯ ` prefix for editor text and currently applies the same two-cell prefix to the autocomplete rows returned after the editor body. The working indicator uses a one-cell gutter. Separately, relocated autocomplete counters and persistent-history counters render after three rule glyphs plus a space, so their text starts at cell four.

The menu must keep the pinned select list's content width, item layout, ANSI styling, pagination, and lifecycle. The counter movement must preserve full-width borders, narrow-width omission, and the independent centered editor-overflow cue. Comparison profiles and extension-owned replacement editors remain outside the bare-A1 presentation path.

## Goals / Non-Goals

**Goals:**

- Give autocomplete rows an explicit one-cell outer gutter without changing their internal rendering or available list width.
- Use one three-cell label inset for autocomplete and history counters.
- Keep prompt/body geometry, completion behavior, history behavior, and terminal-cell widths stable.

**Non-Goals:**

- Moving or restyling prompt text, the footer, working-status content, dialogs, or selectors.
- Recomputing completion counters, changing menu capacity, or moving centered history overflow cues.
- Changing `a1 pi`, extension replacement surfaces, or the Pi dependency.

## Decisions

### 1. Express autocomplete indentation in prompt composition

Extend the owned prompt-body composition contract with an optional indentation for rows rendered after the editor body. The prompt renderer will continue to default those rows to the full prompt-prefix width, while the bare-A1 owned editor will request one cell for its autocomplete block. The list itself will still render against the same inner width; composition will add the reduced leading gutter and pad the released cell at the right edge so every terminal row remains full width.

This is preferable to deleting the first visible cell from already styled menu rows: rendered-string surgery would have to preserve ANSI state, wide characters, selection backgrounds, and terminal width after the fact. It is also preferable to changing the prompt prefix globally, because prompt text and contextual suggestions intentionally remain aligned after `❯ `.

### 2. Share the counter's three-cell visual inset

Render counter-bearing borders as two horizontal rule cells, one separating space, then the dim counter. Apply the same start position to the autocomplete border and the persistent-history border. Update the history label's fit and overflow-collision calculations from the label's actual three-cell start rather than changing the centered `↑ N more` algorithm.

A shared visual constant or equivalently named local constants may be used where module boundaries make a direct import undesirable. The invariant is the visible three-cell start and identical fit arithmetic, not a new public API.

### 3. Preserve semantic and body geometry

The autocomplete block retains its existing row count and remains before the editor body in shell composition. Only horizontal indentation changes. Body row offsets, pointer translation, prompt selection, cursor placement, and dock allocation therefore remain unchanged. Narrow widths omit an unfittable counter using the revised inset, and every row remains bounded by visible terminal width.

Focused tests will compare the menu against the independently rendered pinned list with only the declared one-cell outer gutter difference. Separate assertions will cover autocomplete and history counter indexes, border widths, narrow terminals, persistent history on and off, multiline overflow, ANSI selection backgrounds, and unchanged comparison behavior.

## Risks / Trade-offs

- **[Risk] A reduced outer gutter could accidentally widen or reflow list content.** → Keep the editor/list inner width unchanged and place the released cell as trailing composition padding.
- **[Risk] History overflow collision math could overlap the earlier counter.** → Derive the protected range from the new label start/end and retain narrow-width collision and omission cases.
- **[Risk] ANSI selection paint could leak into the released trailing cell.** → Validate final terminal background cells and full visible row widths, not only stripped strings.
- **[Risk] A shared prompt contract could affect non-autocomplete `after` rows.** → Keep the existing full-prefix default and opt in only from the bare-A1 owned default editor.

## Migration Plan

1. Add the optional after-row indentation to the shared prompt composition boundary and select the one-cell autocomplete gutter in the owned editor.
2. Move autocomplete and history counter prefixes and fit calculations one cell left.
3. Update focused component, shell, and terminal-paint regressions, then build for physical-terminal review.
4. Roll back by restoring the two-cell after-row gutter and four-cell counter inset; no persisted data or settings migration is required.

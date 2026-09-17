## Context

See `proposal.md` for motivation. At planning base `538637b9`, `PromptInput.render` in `src/ui/components/prompt-input.ts` composes the bare-A1 prompt: the first body row gets the `❯ ` glyph, continuation rows get a two-cell blank prefix, and every `after` row (the editor's autocomplete rows, later lifted above the prompt by `shell-editor-autocomplete.ts`) also gets the two-cell blank prefix. The editor renders those rows at the inner width (frame width minus the prefix), and pi-tui's `SelectList` lays each row out as a two-cell marker column, the command label padded to the widest visible label plus a two-cell gap, then the description. The result on screen is that the `→` marker lands under the draft's `/` rather than under `❯`, and command labels start two cells right of the draft text.

## Goals / Non-Goals

**Goals:**

- The selection marker column starts at the prompt glyph column, so `→` renders under `❯` and the command label renders under the draft text.
- The whole row shifts by the same two cells, so the command-to-description gap, description truncation, and every semantic style are unchanged.
- The counter line, pagination, keyboard and pointer behavior, and both history modes keep their existing contracts.

**Non-Goals:**

- Changing the `SelectList` primary-column width, gap, or description policy.
- Changing continuation-row indentation, Settings search, prompt suggestions, or the `a1 pi` and pinned-Pi presentation.
- Re-rendering the menu at the full frame width; the editor still lays it out at the inner width.

## Decisions

### 1. Drop the prefix inset from `after` rows only

`PromptInput.render` maps `body.after` rows through `fit(row)` without the `" ".repeat(prefixWidth)` prefix. Body rows keep their glyph and continuation prefix, so the draft text, cursor column, selection geometry, and hit testing are untouched. `fit` still clips to the frame and pads the right edge, so rows rendered at the inner width end two cells short of the frame and are padded there.

Shifting only the label column while pinning the description column is rejected: it would change the gap the user wants preserved and diverge from `SelectList` layout.

Rendering the menu at the full frame width is rejected for this change: it would require a second width through `renderPrefixedEditor` for a two-cell gain in description room and would alter truncation bytes the placement tests pin against the reference editor.

### 2. Tests pin the shift, not the old inset

`test/ui/components/prompt-input.test.ts` asserts the `after` row renders as `menu` with no leading inset while continuation rows keep `  second`. `test/integrations/pi/components/editor-autocomplete-placement.test.ts` builds its expected rows from the reference editor rendered at `width - 2` and now right-pads each row by two cells instead of left-prefixing it, so the comparison still proves byte parity for candidate content, styling, sizing, pagination, and navigation across both history modes.

## Risks / Trade-offs

- **[Risk] A future presentation change re-introduces the inset through the shared component.** → The prompt-input unit test and the placement test both fail on a leading inset.
- **[Trade-off] The last two cells of each menu row are blank padding rather than description room.** → Accepted; it keeps the editor-side layout untouched.

## Migration Plan

None; presentation-only change with no stored state.

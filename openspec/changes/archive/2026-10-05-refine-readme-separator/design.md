## Context

The shared light and dark separator SVGs use the same 220-by-52 view box and place three separate `<text>` elements at fixed x coordinates. Each element uses the waves footer's monospace family and theme color, but at font weight 700 rather than the footer's 500. The README displays each asset at a wider CSS width through the existing centered `<picture>` placement.

The requested refinement is visual and intentionally narrow: make the ornament read as one centered, evenly spaced `* * *` expression and make its marks slightly lighter while retaining the current smooth sequential animation.

## Goals / Non-Goals

**Goals:**
- Center the complete `* * *` ornament as one typographic run inside each SVG.
- Keep equal single-space gaps between the three visible asterisks at every existing README placement.
- Match the waves footer's lighter monospace weight.
- Preserve the current animation cadence, colors, geometry, and reduced-motion behavior.

**Non-Goals:**
- Changing the README's separator width, placement, or number of separators.
- Redesigning the twinkle sequence, timing, easing, or opacity range.
- Changing the waves footer, navigation, prose, command examples, or other README art.

## Decisions

### 1. Center one literal typographic run

Each SVG will use one centered parent `<text>` element containing the literal visual sequence `* * *`. The asterisks remain separate animated spans inside that run, while the spaces remain ordinary shared text spacing. Keeping the complete expression under one middle anchor makes the browser lay it out as a single centered ornament instead of centering three unrelated glyph boxes.

The SVG will preserve the intended single spaces explicitly so source formatting cannot introduce indentation or line-break gaps. The existing view box and vertical baseline remain unchanged, and the README continues scaling and centering the whole asset as it does today.

### 2. Align typography with the animated footer

Change only the separator's font weight from 700 to 500, matching the animated waves footer's established monospace weight. Keep the existing 22-pixel separator size and theme-specific colors, so the ornament becomes lighter without becoming smaller or losing contrast.

### 3. Retain motion and accessibility behavior exactly

Keep the `2.4s` ease-in-out twinkle, staggered delays, opacity keyframes, and reduced-motion static state unchanged. Applying the existing star classes to the inline spans preserves independent sequential animation even though the ornament is laid out as one text run.

## Risks / Trade-offs

- [SVG whitespace handling changes the intended gaps] -> Keep the spans and literal spaces on one source line and explicitly preserve text whitespace.
- [Grouping the marks breaks independent animation] -> Retain one animation class and staggered delay per asterisk span and inspect a live rendered cycle.
- [A lighter weight becomes too faint in one theme] -> Keep the existing colors and opacity range, then inspect both light and dark GitHub renderings at the actual README size.

## Validation

Strictly validate the OpenSpec change, confirm both SVGs remain well-formed and structurally equivalent apart from theme color, and render the README through the existing GitHub preview. Inspect centering, equal spacing, lighter weight, sequential animation, and the reduced-motion static state in light and dark presentation.

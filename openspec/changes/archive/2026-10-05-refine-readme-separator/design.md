## Context

The shared light and dark separator SVGs use the same 220-by-52 view box and place three separate `<text>` elements at fixed x coordinates. Each element uses the waves footer's monospace family and theme color, but at font weight 700 rather than the footer's 500. The README displays each asset at a wider CSS width through the existing centered `<picture>` placement.

The requested refinement is visual and intentionally narrow: make the ornament read as one horizontally and visually vertically centered, evenly spaced `* * *` expression and make its marks distinctly lighter while retaining the current smooth sequential animation.

## Goals / Non-Goals

**Goals:**
- Center the complete `* * *` ornament horizontally and by its visible glyph bounds inside each SVG.
- Keep equal single-space gaps between the three visible asterisks at every existing README placement.
- Use a regular monospace weight that is lighter than the waves footer.
- Preserve the current animation cadence, colors, geometry, and reduced-motion behavior.

**Non-Goals:**
- Changing the README's separator width, placement, or number of separators.
- Redesigning the twinkle sequence, timing, easing, or opacity range.
- Changing the waves footer, navigation, prose, command examples, or other README art.

## Decisions

### 1. Center one literal typographic run

Each SVG will use one centered parent `<text>` element containing the literal visual sequence `* * *`. The asterisks remain separate animated spans inside that run, while the spaces remain ordinary shared text spacing. Keeping the complete expression under one middle anchor makes the browser lay it out as a single centered ornament instead of centering three unrelated glyph boxes.

The SVG will preserve the intended single spaces explicitly so source formatting cannot introduce indentation or line-break gaps. The existing view box remains unchanged, and the README continues scaling and centering the whole asset as it does today. Because the asterisk's painted glyph bounds sit above the font's central baseline, place the text anchor at `y="30"`; Chromium renders those bounds from y=22 through y=30, centered on the 52-unit view box's y=26 midpoint.

### 2. Use a lighter regular typographic weight

Change the separator's font weight from 700 to 400. This is one step lighter than the animated waves footer's 500 weight while retaining the same monospace family, 22-pixel separator size, and theme-specific colors, so the ornament becomes visibly lighter without becoming smaller or losing contrast.

### 3. Retain motion and accessibility behavior exactly

Keep the `2.4s` ease-in-out twinkle, staggered delays, opacity keyframes, and reduced-motion static state unchanged. Applying the existing star classes to the inline spans preserves independent sequential animation even though the ornament is laid out as one text run.

## Risks / Trade-offs

- [SVG whitespace handling changes the intended gaps] -> Keep the spans and literal spaces on one source line and explicitly preserve text whitespace.
- [Grouping the marks breaks independent animation] -> Retain one animation class and staggered delay per asterisk span and inspect a live rendered cycle.
- [A lighter weight becomes too faint in one theme] -> Keep the existing colors and opacity range, then inspect both light and dark GitHub renderings at the actual README size.
- [Font metrics leave the visible asterisks above the SVG midpoint] -> Validate painted pixel bounds rather than relying only on the declared central baseline, and offset the shared run without changing the view box.

## Validation

Strictly validate the OpenSpec change, confirm both SVGs remain well-formed and structurally equivalent apart from theme color, measure the reduced-motion glyph bounds against the SVG midpoint, and render the README through the existing GitHub preview. Inspect horizontal and visual vertical centering, equal spacing, lighter weight, sequential animation, and the reduced-motion static state in light and dark presentation.

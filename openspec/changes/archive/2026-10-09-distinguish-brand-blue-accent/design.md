## Context

Bare A1 owns six named primary accent colors and derives borders, secondary headings, selection surfaces, user-message surfaces, and optional canvas color from the selected primary. The current blue primaries are `okhsl(232 54% 67%)` for dark appearance and `okhsl(231 68% 47%)` for light appearance. Cyan uses hues 202–203 at similar saturation and lightness, leaving only about 29 degrees of hue separation and producing two subdued blue-green choices.

A1's published brand blue is `#2638d2`, whose OKHSL hue is approximately 268 degrees. The terminal palette should use that hue identity while adapting lightness instead of reproducing the dark brand swatch literally against a dark terminal.

## Goals / Non-Goals

**Goals:**
- Make `blue` read immediately as A1 royal blue rather than muted sky blue.
- Give blue and cyan clear hue and chroma separation in dark and light appearances.
- Preserve contrast, semantic-family derivation, live switching, and limited-color fallback.
- Lock the intended relationship to the A1 brand with focused tests.

**Non-Goals:**
- Change cyan or any other named palette entry.
- Change the allowed accent values, default, settings migration, or menu order.
- Introduce literal per-role colors or modify the palette-independent family transform.
- Change built-in Pi resources, custom themes, or `a1 pi`.

## Decisions

### 1. Anchor blue to the A1 brand hue

Use an OKHSL hue of 268 degrees for both appearance variants, matching the hue derived from `#2638d2`. Keep the established appearance lightness levels so the dark-theme accent remains bright enough to read and the light-theme accent remains dark enough to contrast. Increase saturation to approximately 80% in dark appearance and 90% in light appearance so the choice retains the brand's decisive royal-blue character after contrast adaptation.

The proposed primaries are therefore:

- dark: `okhsl(268 80% 67%)` (approximately `#82a0f1`)
- light: `okhsl(268 90% 47%)` (approximately `#3f60e2`)

Using `#2638d2` unchanged for dark appearance was rejected because its lightness is designed for a bright web field and is too low for primary terminal text on A1's dark surface. Changing only saturation was rejected because the existing 231–232 degree hue would remain too close to cyan.

### 2. Keep semantic-family derivation unchanged

Only the blue primary entries change. `derivePiAccentProjection` continues to calculate border, secondary heading, selection, user-message, and canvas tones from that primary. This preserves the palette architecture and ensures every existing semantic consumer updates consistently without new blue-specific role literals.

Because the new hue remains in the transform's blue sector, the existing stronger secondary-heading shift continues to provide title/heading hierarchy. No threshold or role mapping changes are needed.

### 3. Test hue intent and choice separation

Focused tests will inspect the concrete dark and light blue primaries through the public theme projection and assert:

- blue stays near the 268-degree brand hue;
- blue and cyan have substantial circular hue distance in both appearances;
- blue remains more saturated than the previous subdued entry while retaining the existing appearance lightness band;
- truecolor output differs from cyan, and 256-color output still resolves to a distinct palette result;
- selecting blue still derives the complete semantic family and leaves comparison mode unchanged.

Tests should assert tolerances rather than exact RGB bytes where conversion rounding is incidental. Existing all-palette hierarchy and parity tests remain authoritative for the shared transform and unrelated roles.

## Risks / Trade-offs

- **[Blue drifts toward purple on some displays]** → Anchor to the actual brand hue and verify the rendered terminal swatch interactively beside cyan and purple.
- **[Higher saturation reduces readability]** → Preserve the reviewed dark/light lightness levels and existing semantic contrast assertions.
- **[256-color terminals collapse nearby colors]** → Assert blue and cyan quantize distinctly through the supported color-mode boundary.
- **[Derived heading hue changes unexpectedly]** → Retain the existing transform and run the current hierarchy assertions for all choices.

## Migration Plan

No settings or stored-data migration is required because the stable value remains `blue`. Existing profiles selecting blue receive the updated swatch and full derived family on their next launch, and a live re-selection applies it immediately. Rollback restores the previous two blue primary values without changing persisted settings.

## 1. Canonical chip ranges

- [x] 1.1 Extract canonical paste, image, file, folder, and URL chip range recognition into a pure shared boundary; preserve the editor's registry-dependent handling of literal text-paste-looking markers.
- [x] 1.2 Cover canonical, adjacent, repeated, malformed, literal bracketed, Unicode, and authored presentation-marker cases without broadening chip semantics.

## 2. Atomic submitted-prompt wrapping

- [x] 2.1 Protect internal spaces of recognized chips through bare-A1 submitted-prompt Markdown wrapping and restore the exact visible label before row composition.
- [x] 2.2 Move every fitting chip intact to a continuation row when remaining space is insufficient, while retaining grapheme-safe width-bounded fallback only for chips wider than a complete content row.
- [x] 2.3 Preserve Markdown/ANSI styling, URL hyperlinks, timestamps, continuation indentation, sticky prompts, transcript selection/copy, projected visible text, and unchanged stored/model-facing text.
- [x] 2.4 Keep live editor behavior, non-user Markdown, and the `a1 pi` comparison route unchanged.

## 3. Regression coverage

- [x] 3.1 Add focused submitted-prompt component coverage for all chip families, forced wrapping after prose, adjacent chips, wide text, timestamped rows, and oversized fallback.
- [x] 3.2 Add owned-shell coverage reproducing a screenshot chip at the right edge and proving the complete chip appears on exactly one continuation row while ordinary bracketed prose retains normal wrapping.

## 4. Validation and acceptance

- [x] 4.1 Run focused tests, typecheck, build, architecture governance, strict OpenSpec validation, and diff hygiene.
- [x] 4.2 Physically verify through `./scripts/dev` that a fitting chip moves intact to the next submitted-prompt row and an oversized chip remains width-safe.

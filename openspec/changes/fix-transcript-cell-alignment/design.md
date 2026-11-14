## Context and root cause

The supplied screenshots show row-dependent rail offsets, including a command and its output containing `🖼`. `src/ui/components/text.ts` returns two cells for every code point from U+1F300 through U+1F64F. This includes U+1F5BC FRAME WITH PICTURE, whose unqualified text presentation occupies one cell under pinned Pi's width policy. The RGI-emoji check does not correct this: the bare symbol is not an RGI emoji, so measurement falls through to the over-broad range.

`padRowPreservingBackground` and `ViewportRowCaches.paintRow` use that measurement to pad a row and overlay the rail. Each miscounted symbol removes one required padding cell. `overlaySpan`, selection, and truncation also consume the same incorrect geometry. This is shared code, not an individual agent or transcript-cache failure.

A disposable investigation compared A1, pinned Pi, and independent headless terminal replay. For `🖼 filename.png #id`, A1 reports 19 cells and Pi reports 18. Padding the row to 50 cells and appending a rail paints the rail at zero-based column 49 instead of 50. An ASCII row reaches column 50. Repeated symbols should compound the error and will be included in durable regression coverage during implementation.

## Decision

Keep the existing East Asian wide/fullwidth ranges for ordinary base characters, but replace the broad supplementary-plane pictograph ranges with the runtime's Unicode `Emoji_Presentation` property. Retain RGI handling for explicit emoji-presentation and joined sequences. This distinguishes bare narrow pictographs without making default-wide emoji narrow when a text selector or incomplete sequence prevents an RGI match. Match the pinned renderer's relevant grapheme policy without importing Pi, adding special-case spacing, or changing unrelated Unicode handling.

The component owner permits imports only within itself and from neutral contracts. Built-in Unicode properties satisfy that boundary without a new runtime dependency or a widened architecture exception; an experimental direct width-library import was therefore not retained.

Keep all shared geometry operations consistent: measurement, grapheme-aligned slicing, padding, truncation, overlay replacement, selection, and copy column boundaries. Retain the ASCII fast path, zero-width ANSI/image controls, and existing tab policy. Do not widen this repair into a general terminal-tab normalization change.

## Delivery outcome

1. Correct shared pictograph cell geometry and preserve aligned transcript rails and selection across affected rows.

`tasks.md` contains one corresponding implementation group. The maintainer approved the plan and requested implementation in this same delivery.

## Validation approach

### Width fixture matrix

- Compare A1 geometry with independent pinned Pi results and literal expected widths. For both U+1F5BC `🖼` and U+1F5A8 `🖨`, cover the bare symbol (one cell), explicit VS15 text presentation (one cell), and explicit VS16 emoji presentation (two cells). Include repeated symbols and mixed ASCII/pictograph rows so errors cannot hide behind a single occurrence.
- Exercise each presentation form in plain and ANSI-styled text. Retain controls for default-wide emoji, ZWJ sequences, flags, CJK, and combining text; include default-wide emoji followed by VS15 so an unsuccessful RGI match does not accidentally narrow a wide base.
- Keep modern emoji conformance separate from legacy headless-terminal replay: Pi is the presentation-policy reference for those fixtures, not proof of every terminal host's Unicode behavior.

### Shared geometry boundaries

- Exercise padding, truncation, styled span placement, and selection/copy using explicit expected columns rather than deriving expectations or fixture padding from A1's helper.
- Place narrow and wide presentation forms immediately before, at, and across truncation and overlay boundaries. Assert complete graphemes, preserved styling, and exact remaining padding cells.
- Select before, on, and after pictographs, including reverse selections and ranges reaching the final content cell. Assert original copied text, grapheme-aligned endpoints, and exclusion of the rail gutter.

### Viewport and repaint transitions

- Replay mixed ASCII, bare, VS15-qualified, repeated, styled, and blank viewport rows through the existing headless terminal boundary. Inspect actual terminal cells and assert every visible rail is at zero-based column `width - 1`, with no rail glyph left in neighboring cells.
- Cover initial paint, an unchanged compose that reuses cached rows, and a content repaint replacing pictograph rows with ASCII and vice versa. Repeat alignment assertions after scrolling down and back up, changing viewport width, and changing dock height.
- Include rail-visible and rail-hidden states, plus selection reaching the content/gutter boundary. On resize, assert the rail occupies the new last column and no stale rail remains in the content area. These are regression requirements, not claims that the current implementation already passes them.
- Run changed test files, typecheck, and strict OpenSpec validation only; no broad local suite or physical desktop automation.

### Unicode-data and compatibility policy

- Use the supported Node runtime's built-in Unicode properties for emoji classification; retain the existing ordinary East Asian width ranges. No new production Unicode-data dependency is planned. Record the exact Node version, `process.versions.unicode`, and pinned Pi package version with conformance results so the effective data policy is identifiable.
- If a test-only width-data dependency is retained, declare it directly at an exact version and document its purpose and Unicode-data version; do not rely silently on a transitive package or import it into UI components.
- Compatibility means agreement for this fixture matrix and the affected shared geometry. It does not assert complete Unicode-width equivalence with Pi or compatibility with every terminal Unicode configuration. Runtime or Pi upgrades must expose fixture disagreements rather than silently change expected widths.

## Known gaps and boundaries

Headless xterm's default legacy Unicode table does not model every modern emoji sequence. Use independent terminal replay for the narrow pictographs that reproduce this defect and pinned Pi conformance for modern emoji geometry; do not report legacy-table differences as fixed by this change. Terminal hosts configured with a genuinely different Unicode policy remain an environmental compatibility boundary. No screenshot evidence alone proves every row-level anomaly has this cause; implementation regressions must establish the shared-width repair directly.

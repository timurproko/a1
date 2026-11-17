## Context and investigation

The reported screenshot shows rail cells displaced horizontally on particular queued-steering rows. The screenshot alone does not identify their exact underlying Unicode/control bytes or prove which Herdr width behavior triggered the symptom.

The current path is:

1. `TranscriptViewport.compose` reserves one content-excluded column.
2. `padViewportRowWithGutter` pads with neutral `displayWidth` geometry.
3. `ViewportRowCaches.paintRow` uses `overlaySpan` to replace the last logical cell with the rail glyph.
4. `ComponentBridge.render` calls `containRows`, which clips only over-width rows according to pinned Pi measurement.
5. The physical terminal receives the content and rail in one row string; no independent rail-column placement occurs.

A fitting row is forwarded unchanged. Width overestimation is not repaired. Clipping an under-measured over-width row can instead remove the rail. Text width strips ANSI before grapheme segmentation, while span overlay segments individual ANSI-separated fragments; styling inside a cluster can make their column arithmetic disagree. A tab is counted as three cells but remains a real terminal tab; carriage returns count as zero cells but still reposition the physical cursor.

## Reproduced evidence

On the starting `develop` commit `0744623b`, replayed composed frames into the existing `@xterm/headless` dependency. Fixtures used width 64, height 5, a visible thin rail, overflowing document rows, one editor row, and scrollTop zero. The fixture was placed on the second transcript row. Actual positions were read from terminal cells, not A1 helpers.

| Fixture source | A1 source width | Pinned Pi source width | Reported composed-row width | Physical rail column |
| --- | ---: | ---: | ---: | --- |
| `Steering: plain text` | 20 | 20 | 64 | 64 |
| `Steering: a ⏎ Run bin/fm-wake-drain.sh` | 38 | 38 | 64 | 64 |
| `Steering: a\u2060b` | 13 | 12 | 64 | 63 |
| `Steering:\tx` | 13 | 13 | 64 | missing on intended row |
| `Steering: a\rb` | 12 | 12 | 64 | 53 |
| `Steering: ❤\u001b[2m\ufe0f\u001b[22m x` | 14 | 14 | 65 | missing on intended row |

The U+2060 word-joiner fixture reproduces exactly a one-column left shift. This establishes a real content-dependent rendering defect, not the exact trigger in the user's captured session. The visible U+23CE newline marker alone did not reproduce it. Tests must retain that distinction and must not remove legitimate newline markers as a speculative repair.

## Goals and non-goals

The invariant is physical: an exposed rail cell occupies its declared terminal column on every emitted frame, with no rail outside the current transcript bounds. Logical string-width equality is insufficient evidence.

Preserve the current clear top boundary, final-row coverage, theme colors, background continuity, appearance modes, thin/thick glyphs, semantic copy exclusions, selection, pointer geometry, and modal coverage. Keep image payloads intact and avoid replaying one-shot image commands.

Do not modify the external Herdr renderer, promise correct rendering from a nonconforming terminal, implement a new terminal parser/emulator, broaden this into all UI layout, or alter pinned Pi comparison presentation.

## Decisions

### 1. Establish a consistent safe transcript-row representation

Resolve width mismatches across measurement, clipping, padding, spans, and selection using the same grapheme interpretation, including clusters interrupted by styling. Cover general Unicode format/combining behavior rather than special-casing U+2060 alone. Keep the neutral UI boundary free of Pi imports; use existing pinned geometry as a conformance oracle through the integration boundary.

Expand raw tabs to deterministic spaces before they become row paint. Prevent raw carriage returns, line breaks inside rows, backspaces, and cursor/erase/mode-changing sequences from executing as transcript content. Use existing supported tokenization/formatting facilities rather than building a second terminal backend. Preserve supported SGR, bounded OSC 8 links, and authorized image payloads. Preserve source text and semantic chip identities independently from paint normalization; copy/selection mappings must remain truthful.

Normalizing only queued-steering text is insufficient: tool output, assistant text, and extension rows can produce the same failure. Apply the policy at the shared owned transcript boundary. Existing component overflow containment remains a last-resort crash guard, not rail placement authority.

### 2. Make physical rail placement independent from content advance

Carry bounded semantic rail metadata with the owned frame through the existing neutral presentation contracts. The terminal adapter paints current exposed rail cells at explicit physical columns after row-content painting, inside the same synchronized output transaction, then restores cursor state. Do not embed arbitrary cursor commands in ordinary component row strings: that would conflict with Pi measurement, row-containment, hyperlink safety inspection, and the damage adapter's fail-closed grammar.

Transport rail foreground and the already resolved row/selection background without reintroducing source links or emphasis. Respect floating-modal occlusion and replacement surfaces rather than painting the rail above them. Handle blank reserved gutter cells and clearing when visibility, width, or transcript height changes, not just visible glyphs.

Extend the existing pinned-write adapter deliberately: its known grammar, stale-frame rejection, presentation epochs, canvas background, hyperlink cleanup, cached snapshots, full writes, and regional scrolling must agree about final rail cells. Fall back to a correct bounded full repaint when a differential transformation cannot preserve those invariants. Leave unassociated comparison-profile writes unchanged.

### 3. Assert emitted terminal cells, not only composed strings

Each implementation outcome includes focused regressions. Include literal word joiners, raw controls, mixed Unicode format characters, narrow text pictographs, wide/CJK and modern emoji, style-split graphemes, hyperlinks, backgrounds, image-bearing rows, and over-width content. Modern emoji expectations must use an appropriate independent oracle or pinned integration conformance rather than assuming every older emulator has identical Unicode support.

Exercise repeated cached composition, changed-content replacement in both directions, steering arrival/removal, scrolling and follow-tail, thumb movement, dock growth/shrink, resize including minimal widths, hidden/auto/always appearance, thin/thick glyphs, selection, modal coverage, and damage-aware output. Assert rail position and continuity, absence of phantom cells, dock isolation, cursor restoration, background continuity, copy exclusions, and image preservation.

### 4. Preserve tool-block surfaces across nested ANSI resets

The maintainer's second screenshot shows dark horizontal strips inside green tool-result/diff blocks, starting at source snippets containing literal ESC reset bytes from `text.ts`. Treat this as an approved third implementation outcome in the same PR. Trace the owning tool surface and ensure nested default-background resets return to that surface rather than the terminal canvas. Preserve deliberate nested backgrounds, semantic source copy, image transport, and selection. Add independent terminal-cell color assertions for literal reset bytes inside displayed source, nested styles, clipping/padding, and repeated frames; do not merely inspect the presence of an opening green SGR.

## Validation and open evidence

Initial planning used only the focused ad hoc replay above. Implementation and bounded validation are now recorded in `implementation-evidence.md`, including explicit local validation limitations and their disposition. Broad suites and CI are not substitutes for physical-cell assertions.

A physical Herdr replay of the final candidate remains useful because the supplied PNG does not contain terminal bytes or host Unicode settings. Record it honestly if available; do not claim that an emulator replay proves the exact screenshot trigger. Any host-specific failure remaining after the bounded physical placement change must be explicitly dispositioned rather than hidden behind a universal guarantee.

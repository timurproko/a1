# Implementation evidence

## Delivered behavior

- Shared visible grapheme segmentation crosses ANSI boundaries. Unicode marks/default-ignorable characters no longer add phantom cells. Owned transcript paint expands tabs and makes other content controls inert, with source-backed metadata retaining their original text for selection copy.
- Logical inspection rows retain the rail. Runtime rows omit rail glyphs, and bounded neutral frame metadata carries their resolved cells to the terminal adapter. Dirty/changed gutter cells are explicitly addressed inside the existing synchronized transaction and the cursor is restored. Cached unchanged frames add no rail work. Regional scrolling, hyperlink cleanup, stale-frame rejection, resets, image-bearing batched writes, and outro snapshots use the same metadata. Unknown/covered overlay geometry suppresses independent paint rather than drawing over a modal.
- The green-block counterexample was reproduced using the public built-in edit renderer: a literal full reset in `details.diff` changed the physical background from green to terminal default mid-row. Built-in edit uses a self-rendered shell, bypassing the existing default-shell reset repair. Completed themed self-shell rows now restore their chosen tool surface after nested defaults while preserving explicit nested colors and the final enclosing close. The comparison profile and unrelated extension-owned surfaces remain unchanged.

## Focused local checks

- 329 tests passed across these explicit files: `text.test.ts`, `spans.test.ts`, `transcript-row-geometry.test.ts`, `transcript-viewport.test.ts`, `transcript-pictograph-geometry.test.ts`, `scrollbar-paint.test.ts`, `damage-aware-terminal.test.ts`, `tool-background-continuity.test.ts`, `tool-shell-parity.test.ts`, `session-content-geometry.test.ts`, `shell-layout.test.ts`, and `session-viewport-controller.test.ts`.
- New coverage comprises 31 row-geometry/control cases, seven physical-scrollbar cases with repeated multi-step frame transitions, and six tool-background cases including truecolor/indexed themes. Existing independent real-fullscreen child geometry checks passed.
- The explicit `session-shell-viewport.test.ts` run passed its 29 cases. `selection-scrollbar-edge.test.ts` passed 20 cases. The selected shell autocomplete checkpoints and live-scrollbar cases passed after adapting the production runtime handoff while retaining logical frame inspection.
- Source and bin typechecks passed after building the checkout. The full product build passed. Architecture boundaries, session writer protection, product identity, and pinned source provenance passed.
- Regenerated source-port provenance, public API consumer evidence, and measured startup reachability using the owning tools. The added focused row/painter modules increase eager owned reachability by one net file and about 11 KiB versus the baseline; the pinned Pi public artifact is unchanged. No unit-size limit was raised: cached width/height now share one geometry field, preserving the adapter field-count ceiling.

## Known gaps and disposition

- The supplied PNGs contain no original terminal bytes. The exact first screenshot trigger and physical Herdr behavior have not been captured from this environment. Disposition: retain the independent word-joiner/reset counterexamples and emitted-cell regressions as implementation evidence; offer the built candidate for optional Herdr inspection and do not claim a physical-host test or universal behavior from a nonconforming renderer.
- An earlier complete `session-shell-selection.test.ts` invocation also exercised two unrelated clipboard paths. The right-click paste case consumed a real clipboard image instead of its text fixture; the prompt triple-click copy case failed its expected line-copy observation. Disposition: leave their assertions and product clipboard behavior unchanged, record these local observations rather than report the entire file green, and rely on exact-head CI for its isolated environment. The affected viewport/autocomplete/rail cases were rerun explicitly and passed. No broader test suite or foreground CI watcher was run.

These are validation limitations, not accepted product behavior changes. Trusted automation owns finalization and required exact-head CI; integration remains a separate maintainer decision.

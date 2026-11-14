## Delivered behavior

Shared geometry no longer treats whole supplementary pictograph blocks as wide. Built-in `Emoji_Presentation` and existing RGI matching retain wide emoji and explicit VS16 sequences while bare and VS15 frame/printer pictographs occupy one cell. The ordinary East Asian ranges, ASCII fast path, ANSI opacity, and existing tab policy remain unchanged. No production dependency or Pi import was added to UI components.

Component regressions cover literal widths, styled padding, complete-grapheme clipping/slicing, one-cell overlays across wide boundaries, hyperlinks, and forward/reverse selection of repeated styled symbols. Independent pinned-Pi fixtures cover both affected symbols in all three presentations, repeated/mixed text, default-wide emoji with VS15, ZWJ, flags, CJK, and combining controls.

Headless-terminal viewport regressions inspect every visible cell and require rails at the last column through unchanged cache reuse, pictograph-to-ASCII and ASCII-to-pictograph replacement, scrolling in both directions, narrowing/widening, dock-height changes, and hiding/restoring rails. Forward/reverse copy reaches the last content cell without including the rail. Fullscreen session replay additionally exercises the production runtime's incremental repaint and resize path.

## Focused local results

After merging `origin/develop` at `ac3f4997237d0a17e346c55e5b39d30cade34b0b`:

- Six changed test files passed, 121 tests total: `text.test.ts`, `spans.test.ts`, `text-selection.test.ts`, `transcript-pictograph-geometry.test.ts`, `text-width-conformance.test.ts`, and `session-content-geometry.test.ts` in their owning test directories.
- `npm run typecheck` passed.
- `npx openspec validate fix-transcript-cell-alignment --strict` passed.
- `git diff --check` passed.

Effective data policy: Node `v24.21.0`, runtime Unicode `17.0`, pinned `@earendil-works/pi-tui` `1.5.2`, and existing test-only `@xterm/headless` `6.0.0`. No additional width-data dependency was introduced. Literal fixture widths are asserted independently against pinned Pi; an upgrade disagreement fails those assertions rather than updating expectations silently.

## Compatibility boundaries and disposition

Legacy headless xterm does not implement all modern emoji/VS16 widths. Terminal replay therefore uses narrow pictographs, including explicit VS15 and styled rows; modern emoji geometry is asserted against pinned Pi instead. Current develop's prose presentation intentionally adds VS16, so the session replay uses protected code spans to retain the narrow source bytes that reproduce the shared-width defect. Direct viewport replay covers unmodified bare text and ANSI styling independently.

Terminal hosts with a different Unicode-width policy remain outside this fixture-scoped compatibility claim. No complete Unicode equivalence, screenshot certification, or physical desktop validation is claimed. These are documented environmental boundaries, not deferred implementation tasks; no known in-scope implementation gaps remain. Required exact-head CI and maintainer acceptance remain separate from these local results.

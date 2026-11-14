## Context and root cause

The reported 🖼, ➡, and ℹ are Unicode Emoji characters with Emoji_Presentation=false. Each becomes an RGI emoji sequence when followed by U+FE0F. A probe of the installed Pi terminal-width authority measures each bare form as one column and each emoji-presentation form as two. In contrast, 📁, 📄, 📷, 🔗, and 🟧 already default to emoji and occupy two columns.

The image-file producer in `src/app/session-shell/path-chip-presentation.ts` uses `"🖼 "` plus another separator. Extra spacing does not change the glyph presentation. Content adapters pass message text to Pi Markdown; inspection found no selector-stripping transformation. This is missing presentation intent, not evidence that all emoji fonts or cell widths are broken.

The source audit also found text-default symbols in changelog content and intentional diagram/navigation glyphs. Blanket replacement of every symbol or every Unicode Emoji code point is unsafe: digits participate in emoji sequences, diagrams rely on narrow symbols, and explicit U+FE0E means text presentation.

## Decisions

1. Use one generic policy. For an eligible standalone text-default emoji grapheme, request U+FE0F only if the resulting sequence is a valid RGI emoji. Do not maintain a list of the reported characters. A Unicode-property probe found 207 eligible single-character bases in the current runtime.
2. Preserve U+FE0E, existing U+FE0F, keycaps, flags, skin tones, combining marks, and joined sequences. Never blindly append selectors to arbitrary code points.
3. Apply the policy to display prose before Markdown width measurement and wrapping, not to already wrapped terminal rows. Cover user and assistant prose, thinking, and prose summaries that use the content-area Markdown presentation. Share the helper with generated chip-icon presentation. Do not globally transform raw tool output, code, or navigation/diagram glyphs.
4. Preserve inline/fenced/indented code, diagram content, link destinations, and path/URL bytes. Operate at a token-aware presentation boundary; preserve Markdown formatting and link labels independently of link targets.
5. Keep source messages, persistence, model-facing input, original filenames, and clipboard copy text unchanged. Any inserted selector must be distinguishable from an original selector in source-aware copy handling; stripping every selector globally is not an acceptable shortcut.
6. Generate image-file chips with an emoji-presenting icon and one separator. Extend canonical recognition for optional U+FE0F while retaining legacy bare one/two-space forms. Historical labels are not migrated.
7. Reuse actual renderer geometry and exercise streaming and narrow-width reflow. Pi's public Markdown transform runs before parsing/layout; a separate Marked token projection locates eligible prose additions without rewriting structural source. Existing code/diagram tokens remain intact. Entire canonical chip source ranges are protected even when filename underscores divide inline tokens.
8. Tag only display-added selectors with private, terminal-ignored OSC metadata. Selection uses displayed grapheme widths first, then resolves these tags to restore original selector choices; authored selectors remain untouched. No metadata is inserted into persisted or model-facing text.
9. Keep the generic Unicode policy in the neutral UI owner. The dependency-free owned-UI contract emits its already emoji-presenting canonical image icon directly; path-chip generation reuses the generic policy. Use leaf imports on the eager startup path. Record the measured two new helper modules and source-byte delta in the existing reachability inventory, without changing temporal startup budgets, optional-module exclusions, or the Pi artifact budget.

## Validation approach

Focused checks cover reported symbols and an exhaustive generated eligible-base set; already emoji-default characters; explicit text presentation; joined/modified emoji; keycaps and non-emoji symbols; code and destination preservation; original-source copying; source persistence; user/assistant streaming; wrapping and selection; and new/legacy atomic chips. Run typecheck, affected test files only, and strict OpenSpec validation.

The physical terminal still owns font artwork and size. Automated results establish valid presentation intent and correct geometry, not pixel-identical appearance across fonts. A built checkout can be manually checked with the reported three symbols and known-good file/screenshot emoji.

## Risks and compatibility

U+FE0F changes one-column text glyphs into two-column emoji, so adding it after layout is incorrect. Source/render divergence must not corrupt selection, links, copying, or streaming caches. Some emoji-capable symbols are intentionally textual; explicit text presentation and protected code/diagram contexts remain authoritative. PR #930 integrated during implementation and was merged from current develop into this branch. Its filename-bearing attachment identifiers and legacy label forms are retained; optional U+FE0F is accepted in both canonical recognition and durable identity extraction. The named attachment generator emits the emoji-presenting framed-picture sequence without changing its payload or filename policy.

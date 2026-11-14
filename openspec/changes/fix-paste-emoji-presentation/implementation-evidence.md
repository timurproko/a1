# Emoji presentation implementation evidence

## Delivered behavior

- One Unicode-property/grapheme rule requests U+FE0F only for eligible standalone text-default bases that become valid RGI emoji. The exhaustive current-runtime test covers all 207 eligible bases, not just the reported framed picture, arrow, and information symbols.
- The owned prose adapters apply presentation before Pi's width measurement and wrapping for user, assistant, thinking, summary, default custom-message, and diagnostic prose; changelog Markdown uses the same rule. Raw tool output and extension-owned custom rendering are not globally rewritten.
- Code, diagram code, link destinations, paths, authored text-presentation selectors, and existing joined/modified emoji remain intact. Complete canonical chip ranges are protected across Markdown token boundaries.
- Private ignored OSC metadata identifies only added display selectors. Application selection uses displayed geometry, then restores source selector choices. Persisted/model-facing text is unchanged; original U+FE0F selectors are not stripped.
- Image-file path chips and named attachments emit an emoji-presenting framed-picture icon with one separator. Canonical and durable-ID recognition accepts optional U+FE0F and the legacy bare one/two-space labels. Exact path expansion, attachment bytes, history, identifiers, undo/redo, and count rejection semantics are retained.
- Integrated PR #930 from current develop rather than replacing its filename-bearing image policy. The neutral UI owner holds the generic rule; the dependency-free chip contract emits the already emoji-presenting canonical icon. Startup leaf imports avoid pulling the UI barrel into the eager graph. The measured inventory adds two helper files and 4,084 source bytes, without relaxing temporal startup budgets, optional-module exclusions, or the Pi artifact budget. Public Pi export hashes remain unchanged; only the new Marked consumer is recorded.

## Focused checks

- Product build, typecheck, strict OpenSpec validation, architecture boundaries, full code-documentation check, pinned public-API inventory, final delivery-body check, and whitespace check passed.
- Twelve exact affected suites passed: 214 tests across emoji presentation, selection copy, canonical chips, durable image IDs, path-chip presentation, prompt chips, paste-chip lifecycle, source/emitted supplied-image preparation and shell integration, history sidecars/store, Markdown presentation, and public shell components.
- The larger modified `session-shell-paste.test.ts` file did not produce an all-green candidate run: an initial combined run had 83/84 passing; two diagnostic runs had different failing cases (82/84 and 83/84), including a 5-second test timeout. No emoji assertion failed. All four affected asynchronous clipboard cases passed together when selected directly, with their original assertions and deadlines unchanged. An isolated plain source export of unchanged develop passed all 84 cases; this is baseline evidence, not proof that the candidate failures are unrelated. No claim of a green full candidate file is made. Exact-head CI must resolve candidate-wide validation.
- The new image-icon focus case passed in the candidate file runs, and new/legacy chip wrapping, adjacent selection boundaries, source restoration, streaming, and protected-context regressions passed in the focused suites.

## Limitations and disposition

No confirmed emoji implementation defect remains in the focused checks. The varying candidate clipboard-file failures remain an explicit validation risk for CI and review, not a reason to weaken tests or change unrelated clipboard behavior. Physical terminal rendering was not certified; font artwork remains terminal-owned. The change requests valid emoji presentation and correct geometry, not pixel-identical glyphs across fonts. Code, raw tool output, extension-owned rendering, and explicit text presentation intentionally remain outside prose normalization. No installed runtime was replaced and no merge was authorized.

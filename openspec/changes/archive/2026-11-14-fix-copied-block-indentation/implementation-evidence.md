## Delivered behavior

- Known assistant output padding, blockquote borders, and code-renderer indentation no longer become copied continuation-line indentation.
- Rendering stays byte-identical to the uninstrumented pinned renderer. Per-component provenance tags are removed before terminal delivery; literal border characters remain source content.
- Copy exclusions travel with cached rows and preserve original pointer/display-column coordinates, including reverse drags and off-screen rows.
- Automatic selection copy and explicit Ctrl+C round-trip a multiline quote into the editor without offsets. Ordinary paste, editor-owned copy/cut, custom-renderer fallback, and the comparison profile remain unchanged.

## Focused evidence

- Six focused test files passed: 148 tests across assistant provenance, selection snapshots, document caching, pinned transcript lifecycle parity, text selection, and shell selection/copy/paste.
- Architecture, session-writer guard, product-identity boundaries/governance, and pinned-source provenance checks passed without raising limits or changing the source ledger.
- A full targeted paste-file run passed 81 of 84 tests; three existing asynchronous image-preparation/count-notice cases hit readiness/time limits. In an isolated comparison those same three tests passed against both current source and an origin/develop source overlay. The original failures are retained as observations, not rewritten as a clean whole-file run; no image behavior, timeout, or assertion was changed.
- Full product build and combined source/bin typechecking passed. Initial fresh-checkout declaration failures were resolved by generating dist; two test typings and a captured expansion-method narrowing were corrected. After the narrowing correction, both assistant-provenance and pinned transcript-lifecycle files passed again: 12 tests.
- Trusted draft promotion identified missing numeric task IDs. The task ledger was corrected to the required 1.1/1.2/1.3 format without changing scope or completion status.

## CI repair

The finalized-head run exposed two stale render-lifetime spies: the document now calls `renderWithCopyMetadata` rather than `render`. Both tests now observe that actual rendering entry point, retaining all exact call-count, lazy-history, non-recursion, and current-row assertions. The same run exposed a missing archived `.openspec.yaml`; the required spec-driven metadata was added for trusted re-finalization rather than weakening artifact validation.

The render-lifetime, document-cache, and assistant-provenance files passed together: 28 tests. Combined source/bin typechecking also passed after adapting the optional-method spy typing.

## Scope and limitations

No known implementation gaps. This change preserves visual row boundaries rather than reconstructing logical soft wraps, and unknown custom rendering remains literal. Physical Herdr clipboard confirmation remains a maintainer option; the shell round-trip evidence uses an injected clipboard, not a claim of desktop acceptance. Integration is not authorized by implementation approval.

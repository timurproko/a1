## Implementation

`TranscriptViewport.selectedText()` now resolves the current submitted-prompt anchor for each selected document row. The first and continuation rows use the shared semantic prompt extractor even when the selection includes replies, other prompts, or eligible dock text. Rows without prompt provenance retain ordinary extraction and the existing assistant copy-exclusion metadata.

The prompt extractor accepts the known prefix width. Current submitted prompts have a three-cell ` ❯ ` prefix, while existing two-cell prompt presentations remain supported. The source anchor determines which geometry applies, including when only continuation rows are selected. This removes renderer padding without removing genuine source indentation or shifting pointer boundaries. Existing timestamp handling is retained.

## Focused evidence

- Before the production change, the new viewport regressions failed on leaked markers, timestamps, and continuation padding.
- `npx vitest run test/ui/components/selection-copy.test.ts test/ui/components/transcript-viewport.test.ts --reporter=dot`: 82 passed.
- `npx vitest run test/app/session-shell/session-shell-selection.test.ts --reporter=dot`: 92 passed.
- `npm run build:core`: passed.
- `npm run typecheck`: passed.

The viewport cases cover two- and three-cell prompt geometry; multiple prompts; wrapped continuation rows; partial forward/reverse selections; Unicode; literal `>`, `❯`, and `│`; true indentation; internal blank lines; assistant prefix exclusions; off-screen selection; and replacing stale prompt anchors. Shell regressions exercise both drag directions and automatic versus explicit copy, then paste the exact copied payload back into the editor. Existing prompt/status selection expectations now require semantic prompt text in mixed ranges.

## Known gaps

None within the approved implementation scope. Terminal-native copying that bypasses A1 selection is unchanged, as are ordinary external clipboard contents, editor-owned copy/cut, and the comparison profile. Physical Herdr desktop validation was not performed; the shell tests use injected clipboard services. Existing dependency audit findings were not modified by this change.

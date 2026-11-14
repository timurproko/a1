## Evidence and root cause

The user's fresh-session screenshots show correctly aligned assistant quote text after copying, but a range beginning on the preceding submitted prompt includes `❯ test text` in the pasted draft. This is distinct from the earlier assistant-prefix repair. A second report shows quote borders and continuation indentation already embedded in a submitted prompt copied from another source session. Current installed-release extraction of a representative assistant quote removes those borders, while literal terminal extraction reproduces them. That observation does not prove every source session or copy route is using current A1 extraction; do not claim a new assistant-renderer defect without a current-route reproduction. Existing quote exclusions must continue working when prompt exclusions are applied.

`TranscriptViewport.selectedText()` currently finds one prompt anchor only when every selected transcript row belongs to that same submitted prompt. It applies `selectionCopyLineContent()` only in that case. A mixed prompt/reply range falls back to `usefulTextLineContent()` for all transcript rows, preserving the submitted prompt's rendered marker. The canonical specification explicitly preserves that mixed-range prefix today; the requested behavior changes that policy.

## Decision

Classify each selected document row against its own current submitted-prompt anchor instead of classifying the complete range as one prompt or not. Reuse the existing first/continuation prompt extraction policy at the original display coordinates, including existing first-row timestamp handling. Non-prompt rows continue through assistant copy-exclusion metadata and the ordinary visible-content path.

Do not remove the selected prompt text, reconstruct logical soft wraps, trim each line, or strip `>` or `❯` by a text heuristic. Renderer-owned chrome is excluded because prompt-anchor provenance identifies it. Literal characters within prompt or assistant content, genuine indentation, selected Unicode graphemes, and internal blank lines remain content. Selection painting, copy transport, paste normalization, editor-owned copy/cut, and comparison-profile behavior are unchanged.

## Delivery outcome

1. Omit submitted-prompt UI chrome from mixed frame-selection copies while preserving selected semantic content through automatic and explicit copy routes.

## Validation approach

Use focused viewport/selection and shell copy regression tests, TypeScript checks, and strict OpenSpec validation. Include the screenshot's prompt-plus-quote case; multiple submitted prompts; wrapped prompt continuation rows; forward/reverse and partial selections; Unicode, real indentation, and literal marker characters; off-screen selection; and automatic/explicit payload parity. A physical Herdr round trip remains optional manual confirmation, not evidence already obtained.

## Implementation

Per-row prompt-anchor classification replaces the whole-selection prompt-only condition. The shared prompt extractor accepts the renderer's known prefix width, accounting for the current three-cell inset as well as existing two-cell presentations. First-row timestamp handling and non-prompt assistant exclusion metadata remain unchanged. Both automatic and explicit copy consume the same immutable extraction result.

## Known gaps

None within the approved implementation scope. Terminal-native copying that bypasses A1's selection owner is not changed; ordinary external clipboard text is not heuristically rewritten.

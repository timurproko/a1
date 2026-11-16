## 1. Prefill and select the current session name

- [x] 1.1 Carry the current name through the internal input bridge while keeping unnamed sessions empty.
- [x] 1.2 Select a nonempty current name on opening so typing replaces it immediately; retain explicit caret movement for appending.
- [x] 1.3 Add named/unnamed, reopening, initial selection, immediate replacement, and cancellation cases.

## 2. Add prompt-consistent selection and editing to the name field

- [x] 2.1 Add opt-in name-field mouse selection and Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V handling using the existing clipboard boundary and prompt selection paint.
- [x] 2.2 Give selected-text Ctrl+C copy precedence through dialog wrappers while preserving unselected cancellation, silent Escape, retained prompt drafts, and unrelated dialog behavior.
- [x] 2.3 Keep text operations single-line, bounded, undoable, and safe across grapheme widths, horizontal scrolling, resize, and asynchronous clipboard completion after disposal.
- [x] 2.4 Add focused component and full-route shell cases for selection, replacement, cut/copy/paste, undo, pointer geometry, selection colors, and unchanged footer hints.

## 3. Open name editing directly from the padded footer name

- [x] 3.1 Reserve one blank cell on each side of the footer name and include both cells in its hover and click target without covering adjacent labels.
- [x] 3.2 Replace the right-click Edit menu with a normal left-click that directly opens the prefilled dialog.
- [x] 3.3 Preserve prompt text, cursor/selection where supported, and attachments through naming and cancellation; remove the superseded context-menu surface.
- [x] 3.4 Add direct-click, padded hover, clipped/resized target, unnamed/comparison, and draft/attachment-retention cases.

## 4. Select words and complete names with repeated clicks

- [x] 4.1 Double-click selects a word and triple-click selects the entire name, with prompt-consistent timing and grapheme boundaries.
- [x] 4.2 Keep selection through release and subsequent copy, cut, replacement, or undo; reset click tracking after editing or a drag.
- [x] 4.3 Add component and full-route cases, including Unicode and horizontally scrolled names.

## 5. Confirm successful bare-A1 naming only in the footer

- [x] 5.1 Suppress the successful `Session name set:` presentation for direct and prompted bare-A1 naming while retaining name persistence and genuine errors.
- [x] 5.2 Preserve comparison-profile naming messages and unrelated workflow feedback.
- [x] 5.3 Add focused cases for silent success, errors, cancellation, footer updates, and comparison behavior.

## 6. Open model and thinking selectors from matching footer controls

- [x] 6.1 Expose separate padded hover/click geometry for the visible active model and thinking level, excluding separators and unrelated metadata.
- [x] 6.2 Open the existing Models or Thinking Level modal on a normal left-click without submitting or clearing the retained prompt.
- [x] 6.3 Add model/level hover, click, draft retention, clipping, resize, and comparison/absent-target cases.

## 7. Keep the active thinking level visible during selection

- [x] 7.1 Stop suppressing the bare-A1 footer level while Thinking Level is open; preserve comparison behavior.
- [x] 7.2 Cover opening, default-only changes, session-level selection, and cancellation with the current footer level still visible.

## 8. Restore text-only footer controls without added spaces

- [x] 8.1 Remove the previously requested side padding from name, model, and thinking text, fitting hover/click geometry to visible text only.
- [x] 8.2 Preserve compact spacing, foreground roles, clipping priorities, and adjacent metadata; update focused geometry and layout cases.

## 9. Toggle dock dialogs from the still-hoverable footer

- [x] 9.1 Keep footer hover active while a dock dialog owns input and route a repeated control click through its normal Escape path.
- [x] 9.2 Preserve drafts, attachments, and cancellation effects without applying unsaved name, model, or thinking edits.
- [x] 9.3 Cover repeated clicks and slash-opened dialogs while keeping floating-overlay and comparison boundaries unchanged.

## 10. Match the Models dialog's provider qualifier

- [x] 10.1 Render a shown bare-A1 provider after the model name in square brackets, before the thinking level, preserving existing visibility and fitting priorities.
- [x] 10.2 Keep provider metadata outside model/level hover targets and align those targets correctly with or without the qualifier and routed-model suffix.
- [x] 10.3 Add wide/narrow, single-provider, routed-model, foreground, pointer geometry, and comparison-format cases.

## 11. Replace footer dialogs when choosing another control

- [x] 11.1 Declare the active name/model/thinking surface semantically so same-control toggles and different-control replacements do not inspect rendered titles.
- [x] 11.2 Cancel the active dialog through Escape, then open a different requested dialog without exposing or submitting the retained prompt.
- [x] 11.3 Cover all cross-control transitions, same-control cancellation, slash-opened dialogs, unsaved edits, attachments, and lazy preparation boundaries.

## 12. Include the provider in the model control

- [x] 12.1 Extend the model hover/click span through its visible space and bracketed provider, without extra padding or changes to thinking geometry.
- [x] 12.2 Cover full-label hover, preserved foregrounds, provider-edge clicks, dialog toggling, and omitted-qualifier/narrow/comparison boundaries.

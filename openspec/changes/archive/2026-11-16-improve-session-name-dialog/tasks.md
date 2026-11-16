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

- [ ] 3.1 Reserve one blank cell on each side of the footer name and include both cells in its hover and click target without covering adjacent labels.
- [ ] 3.2 Replace the right-click Edit menu with a normal left-click that directly opens the prefilled dialog.
- [ ] 3.3 Preserve prompt text, cursor/selection where supported, and attachments through naming and cancellation; remove the superseded context-menu surface.
- [ ] 3.4 Add direct-click, padded hover, clipped/resized target, unnamed/comparison, and draft/attachment-retention cases.

## 4. Select words and complete names with repeated clicks

- [ ] 4.1 Double-click selects a word and triple-click selects the entire name, with prompt-consistent timing and grapheme boundaries.
- [ ] 4.2 Keep selection through release and subsequent copy, cut, replacement, or undo; reset click tracking after editing or a drag.
- [ ] 4.3 Add component and full-route cases, including Unicode and horizontally scrolled names.

## 5. Confirm successful bare-A1 naming only in the footer

- [ ] 5.1 Suppress the successful `Session name set:` presentation for direct and prompted bare-A1 naming while retaining name persistence and genuine errors.
- [ ] 5.2 Preserve comparison-profile naming messages and unrelated workflow feedback.
- [ ] 5.3 Add focused cases for silent success, errors, cancellation, footer updates, and comparison behavior.

## 6. Open model and thinking selectors from matching footer controls

- [ ] 6.1 Expose separate padded hover/click geometry for the visible active model and thinking level, excluding separators and unrelated metadata.
- [ ] 6.2 Open the existing Models or Thinking Level modal on a normal left-click without submitting or clearing the retained prompt.
- [ ] 6.3 Add model/level hover, click, draft retention, clipping, resize, and comparison/absent-target cases.

## 1. Prefill the session-name dialog from the current name

- [ ] 1.1 Carry an initial value through the internal input bridge and pass the current name when bare-A1 opens `/name`.
- [ ] 1.2 Add focused cases for named and unnamed sessions, reopening after rename, initial caret placement, silent cancellation, and unchanged direct/comparison workflows.

## 2. Add prompt-consistent selection and editing to the name field

- [ ] 2.1 Add opt-in name-field mouse selection and Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V handling using the existing clipboard boundary and prompt selection paint.
- [ ] 2.2 Give selected-text Ctrl+C copy precedence through dialog wrappers while preserving unselected cancellation, silent Escape, retained prompt drafts, and unrelated dialog behavior.
- [ ] 2.3 Keep text operations single-line, bounded, undoable, and safe across grapheme widths, horizontal scrolling, resize, and asynchronous clipboard completion after disposal.
- [ ] 2.4 Add focused component and full-route shell cases for selection, replacement, cut/copy/paste, undo, pointer geometry, selection colors, and unchanged footer hints.

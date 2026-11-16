## 1. Prefill the session-name dialog from the current name

- [x] 1.1 Carry an initial value through the internal input bridge and pass the current name when bare-A1 opens `/name`.
- [x] 1.2 Add focused cases for named and unnamed sessions, reopening after rename, initial caret placement, silent cancellation, and unchanged direct/comparison workflows.

## 2. Add prompt-consistent selection and editing to the name field

- [x] 2.1 Add opt-in name-field mouse selection and Ctrl+A, Ctrl+Z, Ctrl+X, Ctrl+C, and Ctrl+V handling using the existing clipboard boundary and prompt selection paint.
- [x] 2.2 Give selected-text Ctrl+C copy precedence through dialog wrappers while preserving unselected cancellation, silent Escape, retained prompt drafts, and unrelated dialog behavior.
- [x] 2.3 Keep text operations single-line, bounded, undoable, and safe across grapheme widths, horizontal scrolling, resize, and asynchronous clipboard completion after disposal.
- [x] 2.4 Add focused component and full-route shell cases for selection, replacement, cut/copy/paste, undo, pointer geometry, selection colors, and unchanged footer hints.

## 3. Open name editing from the footer without losing a prompt draft

- [ ] 3.1 Expose the rendered footer-name span for bounded hover and right-click hit testing without changing adjacent footer text or comparison behavior.
- [ ] 3.2 Add a compact borderless `Edit` context menu using the pre-pivot dark popup surface, one-cell side padding, normal labels, and accent-selected hover treatment.
- [ ] 3.3 Route Edit directly to the prefilled name workflow while retaining prompt text and attachments through submission or cancellation.
- [ ] 3.4 Add focused cases for hover bounds, right-click menu placement and dismissal, clipped/resized names, draft retention, and unchanged unnamed/comparison behavior.

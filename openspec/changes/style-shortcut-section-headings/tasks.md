## 1. Refine the bare-A1 hotkeys document

- [x] 1.1 Add a scoped hotkeys-reference presentation that styles every fixed and optional section label with the Settings bold accent while leaving shared binding-derived content unchanged.
- [x] 1.2 Remove only the blank row between each hotkeys section label and its table; preserve section order, table rows, wrapping, screen title, borders, scrollbar behavior, and footer.
- [x] 1.3 Keep `createPiShellHotkeys()` and the `a1 pi` in-feed presentation unchanged.

## 2. Verify presentation and scope

- [x] 2.1 Add focused tests for accent ANSI semantics and direct heading-to-table adjacency across Navigation, Editing, Other, Models dialog, and optional Extensions sections at representative widths.
- [x] 2.2 Verify plain content, current bindings, extension shortcuts, and the pinned in-feed rendering are unchanged outside the intended style and spacing difference.
- [x] 2.3 Build the changed TypeScript candidate and inspect its generated hotkeys reference rows; verify every section uses the Settings accent and its table follows immediately, with the full repository build retained as required candidate CI evidence.

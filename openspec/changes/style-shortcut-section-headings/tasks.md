## 1. Share section layout and presentation

- [x] 1.1 Reuse shared grouped rows and layout for read-only sections, with an explicit embedded-document padding option that preserves Settings' current default spacing, clamping, and sticky-header behavior.
- [x] 1.2 Represent each read-only section as a group header plus content rows and inter-section spacer, with `renderGroupHeader()` as the only header-style authority.
- [x] 1.3 Add focused reference-screen tests for direct content adjacency, pinned headers, section transitions, and unchanged flat-document behavior.

## 2. Route structured hotkeys sections

- [x] 2.1 Refactor binding-derived hotkeys into ordered structured sections without duplicating section labels between content and presentation code.
- [x] 2.2 Keep the pinned in-feed presenter byte-compatible by joining the structured sections back into its existing Markdown document.
- [x] 2.3 Pass the bare-A1 section records through composition to `ReferenceScreenApp`; render normal and pinned labels with the shared header component and keep tables directly adjacent.
- [x] 2.4 Preserve the changelog's flat document path and all existing reference-screen keyboard, wheel, rail, title, border, and footer behavior.

## 3. Verify the reusable UX and delivery

- [x] 3.1 Cover Navigation, Editing, Other, Models dialog, and optional Extensions sections at representative widths, including exact accent semantics, no post-heading blank, and active-section pinning.
- [x] 3.2 Verify bindings, table rows, extension shortcuts, wrapping, and `a1 pi` in-feed output remain unchanged outside the intended bare-A1 grouped presentation.
- [x] 3.3 Run source typechecking, focused component/reference tests, strict OpenSpec validation, and architecture validation; record the exact results and any environment-only build limitation.

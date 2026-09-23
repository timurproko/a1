## Purpose

Defines pointer selection and copying across the complete visible bare-A1 session frame while preserving fullscreen interaction ownership, responsiveness, and comparison-profile behavior.

## ADDED Requirements

### Requirement: Every visible base-session row is selectable

Bare A1 SHALL provide one application-owned visual text selection across the complete visible base session frame. Selectable rows SHALL include visible transcript content, pending steering and working-status rows, flexible alignment and blank rows, non-working notices, above- and below-editor widgets, ordinary prompt rows, autocomplete chrome, and footer/status rows. A drag SHALL be able to cross between the scrollable viewport and pinned dock in either direction without stopping, restarting, or changing selection owner.

Selection SHALL use the existing dark-blue background while preserving source foreground colors, links, bold, italic, underline, and other source attributes. Selected interior rows SHALL paint through the final terminal column according to the existing whole-row padding rule, with foreground controls such as a scrollbar remaining visible above the selected background. Content covered by a modal or overlay SHALL remain covered.

#### Scenario: Select from transcript through the status bar
- **WHEN** a primary-button drag begins on visible transcript text and ends on footer/status text
- **THEN** one continuous selection SHALL include the intersected transcript, transient, prompt-adjacent, prompt, and footer/status rows
- **AND** no viewport/dock boundary SHALL truncate the selection

#### Scenario: Select upward from the footer
- **WHEN** a primary-button drag begins on footer/status text and moves upward into the viewport
- **THEN** the same endpoint cells SHALL be selected as the equivalent forward drag
- **AND** the footer/status origin SHALL NOT be suppressed as non-selectable chrome

#### Scenario: Select one dock surface
- **WHEN** the reader drags across a notice, widget, ordinary prompt, autocomplete row, or footer/status value
- **THEN** the intersected visible graphemes SHALL receive selection painting
- **AND** selection SHALL NOT convert that surface into transcript history or submitted input

#### Scenario: Cross blank frame rows
- **WHEN** a selection spans visible blank or alignment rows between nonempty surfaces
- **THEN** those rows SHALL remain part of the continuous visual range
- **AND** selection painting SHALL reach the declared interior-row boundary without adding printable padding to copied text

### Requirement: Frame selection remains boundary-precise

An accepted ordinary frame drag SHALL use ordered display-column boundaries that include the complete graphemes intersected by its anchor and moving pointer cells. Forward and reverse drags over the same cells SHALL paint and copy the same range. Wide characters and combining sequences SHALL remain atomic. A press and release with no accepted distinct movement SHALL remain a click and SHALL NOT create or copy a synthetic selection.

Double-click SHALL select the visible word at the pointed cell and triple-click SHALL select the useful visible content of that frame row. Once a distinct drag is active, returning to the anchor cell SHALL retain the anchor grapheme, and motion across row or region boundaries SHALL not create an empty intermediate range.

#### Scenario: Drag one grapheme in dock content
- **WHEN** a drag in a footer/status or prompt row moves into one adjacent grapheme and returns to its anchor cell
- **THEN** the resulting range SHALL retain exactly the anchor grapheme
- **AND** the same cells SHALL be selected in either direction

#### Scenario: Cross a wide or combining grapheme
- **WHEN** a frame-selection endpoint intersects a wide character or combining sequence in any row kind
- **THEN** painting and copying SHALL include the complete grapheme
- **AND** neither terminal cells nor source code points SHALL be split

#### Scenario: Click without dragging
- **WHEN** the primary button is pressed and released on one base-frame cell without accepted distinct movement
- **THEN** no frame selection SHALL remain
- **AND** the surface's ordinary click behavior SHALL remain eligible

#### Scenario: Select a visible word or line
- **WHEN** the reader double-clicks a visible word or triple-clicks a visible row outside an interaction owned by a modal or explicit control
- **THEN** the complete visible word or useful row text SHALL be selected
- **AND** the resulting selection SHALL use the same copy path as an ordinary drag

### Requirement: Copy output matches selected visible text

Completing a nonempty frame drag SHALL capture and submit the selected visible text for clipboard delivery without requiring a second keypress. Copy output SHALL include selected visible glyphs from every participating surface, including prompt prefixes and timestamps, steering and working text, notices, widgets, autocomplete text, and footer/status values. It SHALL preserve visual row boundaries as newlines while excluding ANSI and OSC controls, unselected right padding, cursor markers, scrollbar glyphs, and content covered by modal or overlay presentation.

The selected background SHALL remain visible after release. Successful delivery SHALL produce a concise copied-character acknowledgement; failed or timed-out delivery SHALL use the existing recoverable copy-failure presentation. Clipboard preparation and delivery SHALL remain bounded and asynchronous and SHALL NOT block input, streaming, scrolling, animation, rendering, or shutdown. `Ctrl+C` with a retained frame selection SHALL remain available as explicit re-copy-and-clear behavior.

#### Scenario: Release a cross-frame selection
- **WHEN** the reader releases a nonempty selection spanning transcript text, blank rows, a prompt, and footer/status content
- **THEN** clipboard submission SHALL begin from one immutable snapshot at that input boundary
- **AND** the payload SHALL contain the selected visible text in frame order with source newlines and selected blank-line boundaries
- **AND** the highlight SHALL remain visible while delivery proceeds

#### Scenario: Copy styled and linked text
- **WHEN** selected frame content contains ANSI styling, an OSC 8 link, a wide grapheme, or a combining sequence
- **THEN** the clipboard payload SHALL contain only complete plain-text graphemes in the selected range
- **AND** selection painting SHALL preserve the original visible foreground and attributes beneath its background

#### Scenario: Continue using the shell while copy is pending
- **WHEN** clipboard preparation or delivery is slow while agent output, editor input, or timers continue
- **THEN** those activities SHALL continue without waiting for copy completion
- **AND** later frame changes SHALL NOT alter the captured payload

#### Scenario: Re-copy with Ctrl+C
- **WHEN** a released frame selection is still visible and the reader presses `Ctrl+C`
- **THEN** A1 SHALL submit the same currently selected visible text through the bounded clipboard path
- **AND** clear the retained frame selection through the established copy-clearing behavior

#### Scenario: Preserve semantic copy routes
- **WHEN** the reader invokes `/copy` or copies/cuts a keyboard-selected prompt range
- **THEN** those routes SHALL retain their existing semantic last-message or exact-editor-text behavior
- **AND** complete-frame visual copy rules SHALL NOT add footer, notice, or other screen chrome to those payloads

### Requirement: Gesture ownership preserves interactive surfaces

Pointer routing SHALL choose one owner for the complete press/motion/release sequence. A primary drag over ordinary exposed base-frame content SHALL belong to frame selection. A sequence beginning on an explicit viewport control or inside a modal, selector, dialog, overlay, or replacement surface SHALL retain that surface's existing ownership. A drag already owned by frame selection MAY cross controls, prompt rows, and dock rows without activating them.

For the ordinary editor, a click without accepted drag movement SHALL retain caret/focus behavior, while a distinct drag SHALL become frame selection and MAY cross the prompt boundary. Right-click paste, wheel navigation, scrollbar drag, scroll-to-bottom activation, sticky-prompt activation, and link clicks SHALL retain their existing gestures and side effects.

#### Scenario: Drag from the prompt into the footer
- **WHEN** a primary sequence begins on ordinary prompt text and distinct motion continues into footer/status rows
- **THEN** the gesture SHALL become one frame selection
- **AND** it SHALL NOT edit, replace, submit, or move the prompt selection

#### Scenario: Click the prompt without dragging
- **WHEN** a primary press and release occurs on an ordinary prompt cell without distinct movement
- **THEN** the editor SHALL receive its existing click behavior
- **AND** no frame selection or clipboard submission SHALL occur

#### Scenario: Cross an explicit control
- **WHEN** an active frame selection moves across a scrollbar, sticky prompt, or jump-to-bottom control
- **THEN** the selection SHALL continue without activating that control
- **AND** the control's foreground presentation SHALL remain above selection paint where applicable

#### Scenario: Begin on an explicit control
- **WHEN** a fresh primary sequence begins inside an explicit control's current hit region
- **THEN** that control SHALL retain the whole gesture according to its existing behavior
- **AND** no frame selection SHALL begin from the same press

#### Scenario: Interact with a modal surface
- **WHEN** a fresh pointer sequence begins inside a visible modal, selector, dialog, overlay, or replacement surface
- **THEN** that surface SHALL retain its existing pointer behavior and focus
- **AND** base-frame selection SHALL neither paint above it nor receive the same sequence

#### Scenario: Scroll with the wheel
- **WHEN** a wheel report is addressed to exposed transcript content, transient content, or a modal-owned region
- **THEN** the existing viewport or modal wheel behavior SHALL remain in force
- **AND** wheel input SHALL NOT create or extend frame selection

### Requirement: Frame selection presents current state with bounded work

Selection motion SHALL use the immediate input presentation path and retain at most the newest unpublished endpoint. With unchanged frame content and geometry, composition SHALL recompute only visible rows whose normalized selected range changed and SHALL reuse every other row. Selection lookup and per-motion work SHALL be bounded by visible frame height rather than complete transcript length.

A content, viewport-position, dock-allocation, terminal-size, theme, hyperlink, control, input-surface, modal/overlay-geometry, or session-lifecycle change SHALL invalidate affected reuse and present a selection consistent with one current frame revision. Starting a frame drag SHALL keep the visible transcript position stable for the gesture. Reset, session replacement, focus loss, surface handoff, and disposal SHALL clear pending pointer ownership and frame selection without stale paint or later copy.

#### Scenario: Move across frame regions
- **WHEN** successive motion reports extend a selection from viewport rows through dock rows with unchanged geometry
- **THEN** each presentation SHALL recompute only rows whose selected range changed
- **AND** stable selected and unselected rows SHALL be reused

#### Scenario: Burst pointer reports while streaming
- **WHEN** several selection motions and transcript updates arrive before another frame can be presented
- **THEN** the next presentation SHALL combine the latest endpoint with the newest frame content
- **AND** no later frame SHALL restore an obsolete endpoint or overwrite newer selection feedback

#### Scenario: Select in a long session
- **WHEN** visible geometry and pointer movement are equivalent in short and very long transcripts
- **THEN** frame-selection lookup and per-motion composition work SHALL remain equivalent
- **AND** off-screen transcript rows SHALL NOT be scanned to select dock or visible viewport content

#### Scenario: Resize with a retained selection
- **WHEN** terminal size or dock allocation changes while a selection is active or retained
- **THEN** A1 SHALL recompute the affected visible-frame mapping before painting or copying
- **AND** no stale highlight, hidden row, control glyph, or out-of-bounds cell SHALL remain selected

#### Scenario: Replace or close the session during a gesture
- **WHEN** the session resets, is replaced, loses focus, or is disposed during a pending or active selection
- **THEN** pointer ownership, selection timers, retained rows, and pending auto-copy capture SHALL be cleared
- **AND** no state from the prior frame SHALL appear or copy later

### Requirement: Complete-frame selection is scoped to bare A1

Complete-frame selection SHALL apply only to bare A1's declared custom fullscreen viewport. `a1 pi` SHALL retain pinned Pi fullscreen or regular-mode selection according to its selected mode, and ordinary regular-mode terminal selection SHALL remain terminal-owned. The implementation SHALL use public Pi runtime/component boundaries and SHALL NOT patch installed Pi code or introduce a second terminal renderer.

#### Scenario: Use bare A1
- **WHEN** the reader drags across the visible bare-A1 session frame
- **THEN** A1 SHALL provide the complete-frame selection behavior in this capability

#### Scenario: Use the comparison profile
- **WHEN** the reader launches `a1 pi` and selects text
- **THEN** the comparison profile SHALL retain its pinned Pi selection, copy, and presentation behavior
- **AND** no bare-A1 frame-selection routing or acknowledgement SHALL be inserted

#### Scenario: Use regular mode
- **WHEN** a Pi-backed route runs in regular mode without a declared A1-owned application
- **THEN** the physical terminal SHALL continue to own selection and scrollback
- **AND** A1 SHALL NOT maintain complete-frame selection state

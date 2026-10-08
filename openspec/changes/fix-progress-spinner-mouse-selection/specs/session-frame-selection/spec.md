## MODIFIED Requirements

### Requirement: Copy output matches selected visible text

When automatic fullscreen copy is enabled, completing a frame drag with eligible non-whitespace transcript text SHALL capture and submit that text for clipboard delivery without requiring a second keypress. When automatic fullscreen copy is disabled, release SHALL retain the visual selection without submitting clipboard work, and the existing explicit selection-copy action SHALL remain available. Before delivery, complete-frame copy SHALL trim Unicode whitespace from the beginning and end of the complete plain-text payload. It SHALL preserve whitespace between the first and last non-whitespace characters, including multiline indentation and internal blank lines, and SHALL NOT trim each visual row independently.

The visual selected range MAY span every exposed base-frame row, but frame clipboard output SHALL admit only selected persistent transcript rows. It SHALL exclude transient steering and progress-status rows, flexible alignment rows, prompt-editor and autocomplete rows, notices and widgets in the dock, footer/status rows, and other dock chrome. A range containing only excluded rows or whitespace SHALL remain visibly selected but SHALL NOT submit or replace clipboard content through automatic copy or `Ctrl+C`. `Ctrl+C` SHALL clear such a retained visual-only selection without forwarding an interrupt.

When one submitted prompt is the only eligible transcript source in the range, clipboard text SHALL contain only its semantic prompt text, excluding the `❯` prefix, prompt padding, and timestamp. When a submitted prompt participates in a larger eligible transcript range, copy SHALL preserve its currently selected visible prefix, alignment, and timestamp together with the surrounding selected transcript text. Copy output SHALL otherwise preserve selected visual row boundaries while excluding ANSI and OSC controls, unselected right padding, cursor markers, scrollbar glyphs, and content covered by modal or overlay presentation.

The visual selected range SHALL continue to represent the exact selected cells; clipboard filtering and outer-whitespace normalization SHALL affect only the payload. The selected background SHALL remain visible after release. Successful automatic or explicit frame-selection delivery SHALL produce exactly one transient acknowledgement reading `copied N chars to clipboard`, where `N` is the character count of the normalized payload. The acknowledgement SHALL be right-aligned immediately above the editor in the active theme's accent foreground. If it overlaps selected cells, it SHALL retain the selected row background rather than painting a dark reset block. It SHALL not allocate a row, move transcript or dock content, or change pointer hit regions. A newer acknowledgement SHALL replace the prior acknowledgement and restart its lifetime. Failed or timed-out delivery SHALL use the existing recoverable copy-failure presentation. Clipboard preparation and delivery SHALL remain bounded and asynchronous and SHALL NOT block input, streaming, scrolling, animation, rendering, or shutdown.

#### Scenario: Copy an indented command
- **WHEN** eligible transcript selection has plain text `   npm run develop   `
- **THEN** the clipboard payload SHALL be exactly `npm run develop`
- **AND** the selected cells and retained highlight SHALL remain unchanged

#### Scenario: Preserve interior multiline whitespace
- **WHEN** eligible transcript selection contains outer blank space and multiple nonempty lines with indentation or blank lines between its first and last non-whitespace characters
- **THEN** clipboard normalization SHALL remove only the complete payload's leading and trailing whitespace
- **AND** indentation, spacing, newlines, and blank lines inside those boundaries SHALL remain unchanged

#### Scenario: Select only frame chrome or whitespace
- **WHEN** a completed visual range contains only transient status, alignment, autocomplete, input, dock/status chrome, or whitespace
- **THEN** the complete selected range SHALL remain painted
- **AND** automatic copy and `Ctrl+C` SHALL NOT submit or replace clipboard content

#### Scenario: Copy only whitespace
- **WHEN** the visual frame selection contains only spaces, tabs, newlines, or other Unicode whitespace
- **THEN** no clipboard submission or success acknowledgement SHALL occur
- **AND** the visual range SHALL remain selected until its ordinary clearing action

#### Scenario: Copy one submitted prompt
- **WHEN** one submitted prompt is the only eligible transcript source in a completed range
- **THEN** the payload SHALL contain its prompt text without the `❯` prefix, prompt padding, or timestamp
- **AND** visual selection MAY still include surrounding excluded frame rows

#### Scenario: Copy a bulk transcript range containing a prompt
- **WHEN** a completed range contains a submitted prompt and other eligible transcript text
- **THEN** the payload SHALL preserve all selected eligible transcript text in frame order
- **AND** the submitted prompt's selected visible prefix, alignment, and timestamp SHALL remain included

#### Scenario: Release a cross-frame selection
- **WHEN** automatic fullscreen copy is enabled and the reader releases a range spanning eligible transcript text plus transient, input, or footer/status rows
- **THEN** clipboard submission SHALL begin from one immutable snapshot of only the eligible transcript text at that input boundary
- **AND** the complete cross-frame highlight SHALL remain visible while delivery proceeds

#### Scenario: Release a selection with automatic copy disabled
- **WHEN** automatic fullscreen copy is disabled and the reader releases a frame selection
- **THEN** A1 SHALL retain the selected highlight without submitting clipboard work or showing a copied acknowledgement
- **AND** the reader SHALL remain able to invoke the established explicit selection-copy action

#### Scenario: Copy styled and linked text
- **WHEN** eligible selected content contains ANSI styling, an OSC 8 link, a wide grapheme, or a combining sequence
- **THEN** the clipboard payload SHALL contain only complete plain-text graphemes in the normalized selected range
- **AND** selection painting SHALL preserve the original visible foreground and attributes beneath its background

#### Scenario: Acknowledge copied text beside the editor
- **WHEN** a normalized frame-selection payload is delivered while the acknowledgement row is selected
- **THEN** one right-aligned accent message SHALL read `copied N chars to clipboard` using the payload's exact character count
- **AND** the message SHALL retain the selected row background without a reverse-video or dark reset box

#### Scenario: Replace rapid copy acknowledgements
- **WHEN** another frame-selection copy succeeds before the current acknowledgement expires
- **THEN** the newest count SHALL replace the prior message in the same frame location and restart its lifetime
- **AND** acknowledgements SHALL NOT stack, allocate rows, or change geometry

#### Scenario: Expire copied acknowledgement
- **WHEN** the active copied acknowledgement reaches the end of its transient lifetime
- **THEN** its cells SHALL be removed and the underlying current frame SHALL be restored
- **AND** expiry SHALL NOT change viewport position, dock allocation, editor/footer position, selected source, or hit regions

#### Scenario: Continue using the shell while copy is pending
- **WHEN** clipboard preparation or delivery is slow while agent output, editor input, or timers continue
- **THEN** those activities SHALL continue without waiting for copy completion
- **AND** later frame changes SHALL NOT alter the captured payload

#### Scenario: Re-copy with Ctrl+C
- **WHEN** a released frame selection with eligible transcript text is still visible and the reader presses `Ctrl+C`
- **THEN** A1 SHALL submit the same normalized semantic payload through the bounded clipboard path regardless of the automatic-copy setting
- **AND** clear the retained frame selection through the established copy-clearing behavior

#### Scenario: Preserve semantic copy routes
- **WHEN** the reader invokes `/copy` or copies/cuts a keyboard-selected prompt range
- **THEN** those routes SHALL retain their existing semantic last-message or exact-editor-text behavior
- **AND** complete-frame visual filtering SHALL NOT add status, input, suggestion, footer, notice, or other screen chrome to those payloads

### Requirement: Gesture ownership preserves interactive surfaces

Pointer routing SHALL choose one owner for the complete press/motion/release sequence. A primary drag over ordinary exposed base-frame content SHALL belong to frame selection. A sequence beginning on an explicit viewport control or inside a modal, selector, dialog, overlay, or replacement surface SHALL retain that surface's existing ownership. A drag already owned by frame selection MAY cross controls, prompt rows, and dock rows without activating them.

For the ordinary editor, a primary press awaiting release or distinct movement SHALL NOT create or paint a provisional frame selection. A click without accepted drag movement SHALL retain caret/focus behavior, and prompt double-click or triple-click selection SHALL remain bounded to the editor's resulting semantic word or useful logical-line text without an intermediate highlight across unused row cells. Once distinct movement occurs, the sequence SHALL become frame selection from its original prompt anchor and MAY cross the prompt boundary. Right-click paste, wheel navigation, scrollbar drag, scroll-to-bottom activation, sticky-prompt activation, and link clicks SHALL retain their existing gestures and side effects.

The live progress-spinner row SHALL be ordinary exposed base-frame content for primary drag ownership. Its status component and hit region SHALL leave primary-button press, drag or motion, and release events unhandled and SHALL NOT request pointer capture or focus. Frame selection SHALL therefore be able to begin on the spinner row or cross it in either direction as one uninterrupted gesture. Spinner animation SHALL remain a presentation update and SHALL NOT acquire, truncate, or clear an otherwise valid selection.

#### Scenario: Drag from the prompt into the footer
- **WHEN** a primary sequence begins on ordinary prompt text and distinct motion continues into footer/status rows
- **THEN** the gesture SHALL become one frame selection
- **AND** it SHALL NOT edit, replace, submit, or move the prompt selection

#### Scenario: Click the prompt without dragging
- **WHEN** a primary press and release occurs on an ordinary prompt cell without distinct movement
- **THEN** the editor SHALL receive its existing click behavior
- **AND** no frame selection or clipboard submission SHALL occur

#### Scenario: Multi-click prompt text without a full-width flash
- **WHEN** the reader double-clicks or triple-clicks nonempty ordinary prompt text and a frame is presented between any press and release
- **THEN** every visible selection SHALL remain bounded to the editor's selected word or useful logical-line text
- **AND** no intermediate frame SHALL highlight unused cells through the remainder of the prompt row

#### Scenario: Begin selection on the progress spinner
- **WHEN** a primary drag begins on an ordinary cell of the live `Working…` progress-spinner row and moves into adjacent base-session content
- **THEN** frame selection SHALL own the complete sequence from its original spinner-row anchor
- **AND** the progress status SHALL NOT handle, capture, focus, truncate, or cancel that sequence

#### Scenario: Cross the progress spinner in either direction
- **WHEN** an active frame selection moves across the live progress-spinner row from above to below or from below to above
- **THEN** the selection SHALL continue as one range with the same endpoint semantics in both directions
- **AND** spinner animation or status repaint SHALL NOT interrupt or overwrite the selected range

#### Scenario: Begin below the progress spinner
- **WHEN** a primary drag begins on an ordinary input, autocomplete, or footer/status cell below `Working…` and crosses into transcript content
- **THEN** one frame selection SHALL paint the complete range through every crossed row
- **AND** excluded chrome SHALL remain visual-only under the frame-copy rules

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

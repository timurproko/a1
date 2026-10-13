# Spec Delta

## MODIFIED Requirements

### Requirement: Copy output matches selected visible text

When automatic fullscreen copy is enabled, completing a frame drag with eligible non-whitespace transcript text SHALL capture and submit that text for clipboard delivery without requiring a second keypress. Automatic copy SHALL NOT include footer/status-bar text. When automatic fullscreen copy is disabled, release SHALL retain the visual selection without submitting clipboard work, and the existing explicit selection-copy action SHALL remain available. Before delivery, complete-frame copy SHALL trim Unicode whitespace from the beginning and end of the complete plain-text payload. It SHALL preserve whitespace between the first and last non-whitespace characters, including multiline indentation and internal blank lines, and SHALL NOT trim each visual row independently.

The visual selected range MAY span every exposed base-frame row. Automatic frame-copy output SHALL admit only selected persistent transcript rows. Explicit `Ctrl+C` frame-copy output SHALL admit selected persistent transcript rows and selected footer/status-bar rows in frame order. Both routes SHALL exclude transient steering and progress-status rows, flexible alignment rows, prompt-editor and autocomplete rows, notices and widgets in the dock, and other dock chrome. A range containing only footer/status-bar text SHALL remain visibly selected on release without automatic clipboard submission, then SHALL be copied when the reader presses `Ctrl+C`. A range containing only other excluded rows or whitespace SHALL remain visibly selected but SHALL NOT submit or replace clipboard content through automatic copy or `Ctrl+C`; `Ctrl+C` SHALL clear such a retained visual-only selection without forwarding an interrupt.

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
- **WHEN** a completed visual range contains only transient status, alignment, autocomplete, input, non-status dock chrome, or whitespace
- **THEN** the complete selected range SHALL remain painted
- **AND** automatic copy and `Ctrl+C` SHALL NOT submit or replace clipboard content

#### Scenario: Select only the status bar
- **WHEN** a completed visual range contains selected footer/status-bar text and automatic fullscreen copy is enabled
- **THEN** release SHALL retain the complete selected range without submitting or replacing clipboard content
- **AND** a subsequent `Ctrl+C` SHALL submit the normalized selected status-bar text and clear the retained selection

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
- **WHEN** automatic fullscreen copy is enabled and the reader releases a range spanning eligible transcript text plus transient, input, or footer/status-bar rows
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
- **WHEN** a released frame selection with eligible transcript or footer/status-bar text is still visible and the reader presses `Ctrl+C`
- **THEN** A1 SHALL submit the normalized semantic transcript and selected status-bar payload through the bounded clipboard path regardless of the automatic-copy setting
- **AND** clear the retained frame selection through the established copy-clearing behavior

#### Scenario: Preserve semantic copy routes
- **WHEN** the reader invokes `/copy` or copies/cuts a keyboard-selected prompt range
- **THEN** those routes SHALL retain their existing semantic last-message or exact-editor-text behavior
- **AND** complete-frame visual filtering SHALL NOT add status, input, suggestion, footer, notice, or other screen chrome to those payloads

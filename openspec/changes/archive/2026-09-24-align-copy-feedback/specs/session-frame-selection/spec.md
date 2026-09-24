## MODIFIED Requirements

### Requirement: Copy output matches selected visible text

When automatic fullscreen copy is enabled, completing a nonempty frame drag SHALL capture and submit the selected visible text for clipboard delivery without requiring a second keypress. When automatic fullscreen copy is disabled, release SHALL retain the nonempty selection without submitting it, and the existing explicit selection-copy action SHALL remain available. Copy output SHALL include selected visible glyphs from every participating surface, including prompt prefixes and timestamps, steering and working text, notices, widgets, autocomplete text, and footer/status values. It SHALL preserve visual row boundaries as newlines while excluding ANSI and OSC controls, unselected right padding, cursor markers, scrollbar glyphs, and content covered by modal or overlay presentation.

The selected background SHALL remain visible after release. Successful automatic or explicit frame-selection delivery of payload containing non-whitespace text SHALL produce exactly one transient acknowledgement reading `copied N chars to clipboard`, where `N` is the character count of the exact copied plain-text payload. The acknowledgement SHALL be right-aligned in the active theme's accent role on one row immediately above the editor, without reverse-video or panel background styling. A newer acknowledgement SHALL replace the prior acknowledgement and restart its transient lifetime rather than stacking another row. Successful delivery of a payload containing only whitespace SHALL show no acknowledgement. Failed or timed-out delivery SHALL use the existing recoverable copy-failure presentation. Clipboard preparation and delivery SHALL remain bounded and asynchronous and SHALL NOT block input, streaming, scrolling, animation, rendering, or shutdown. `Ctrl+C` with a retained frame selection SHALL remain available as explicit re-copy-and-clear behavior.

#### Scenario: Release a cross-frame selection
- **WHEN** automatic fullscreen copy is enabled and the reader releases a nonempty selection spanning transcript text, blank rows, a prompt, and footer/status content
- **THEN** clipboard submission SHALL begin from one immutable snapshot at that input boundary
- **AND** the payload SHALL contain the selected visible text in frame order with source newlines and selected blank-line boundaries
- **AND** the highlight SHALL remain visible while delivery proceeds

#### Scenario: Release a selection with automatic copy disabled
- **WHEN** automatic fullscreen copy is disabled and the reader releases a nonempty frame selection
- **THEN** A1 SHALL retain the selected highlight without submitting clipboard work or showing a copied acknowledgement
- **AND** the reader SHALL remain able to invoke the established explicit selection-copy action

#### Scenario: Copy styled and linked text
- **WHEN** selected frame content contains ANSI styling, an OSC 8 link, a wide grapheme, or a combining sequence
- **THEN** the clipboard payload SHALL contain only complete plain-text graphemes in the selected range
- **AND** selection painting SHALL preserve the original visible foreground and attributes beneath its background

#### Scenario: Acknowledge copied text beside the editor
- **WHEN** a frame-selection payload containing non-whitespace text is delivered
- **THEN** one right-aligned accent row immediately above the editor SHALL read `copied N chars to clipboard` using the exact payload's character count
- **AND** no reverse-video box, panel background, or top-right flash SHALL be shown

#### Scenario: Replace rapid copy acknowledgements
- **WHEN** another frame-selection copy succeeds before the current acknowledgement expires
- **THEN** the newest count SHALL replace the existing acknowledgement in the same row and restart its transient lifetime
- **AND** copy acknowledgements SHALL NOT accumulate into multiple rows

#### Scenario: Copy only whitespace
- **WHEN** the delivered frame-selection payload contains only spaces, tabs, newlines, or other whitespace
- **THEN** the exact whitespace payload SHALL still be delivered to the clipboard
- **AND** no success acknowledgement SHALL be shown

#### Scenario: Continue using the shell while copy is pending
- **WHEN** clipboard preparation or delivery is slow while agent output, editor input, or timers continue
- **THEN** those activities SHALL continue without waiting for copy completion
- **AND** later frame changes SHALL NOT alter the captured payload

#### Scenario: Re-copy with Ctrl+C
- **WHEN** a released frame selection is still visible and the reader presses `Ctrl+C`
- **THEN** A1 SHALL submit the same currently selected visible text through the bounded clipboard path regardless of the automatic-copy setting
- **AND** clear the retained frame selection through the established copy-clearing behavior

#### Scenario: Preserve semantic copy routes
- **WHEN** the reader invokes `/copy` or copies/cuts a keyboard-selected prompt range
- **THEN** those routes SHALL retain their existing semantic last-message or exact-editor-text behavior
- **AND** complete-frame visual copy rules SHALL NOT add footer, notice, or other screen chrome to those payloads

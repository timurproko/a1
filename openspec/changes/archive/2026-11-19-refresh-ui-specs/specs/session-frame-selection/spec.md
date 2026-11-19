## ADDED Requirements

### Requirement: Frame copy delivers the eligible selected text

When automatic fullscreen copy is enabled, completing a pointer selection with eligible non-whitespace persistent transcript, ordinary prompt-input, footer/status-bar, or user-facing application-message text SHALL capture and submit that text for clipboard delivery without requiring a second keypress. User-facing application messages SHALL include visible status, warning, error, command-result, and notice text. A complete-frame gesture that begins outside the prompt MAY span ordinary prompt-input text. Every pointer gesture that begins inside the prompt SHALL remain editor-owned through motion and release, including wrapped rows, motion beyond prompt bounds, and atomic chips. Editor-owned prompt drag, word, or line selection SHALL retain the selected draft range without submitting clipboard work or replacing the current clipboard, regardless of the automatic fullscreen copy setting. While that editor-owned range remains selected, clipboard paste SHALL replace it through the established asynchronous paste path, `Ctrl+C` SHALL copy it without changing the draft, and `Ctrl+X` SHALL copy and delete it. When automatic fullscreen copy is disabled, complete-frame release SHALL retain the visual selection without submitting clipboard work, and both `Ctrl+C` and the general message-copy action SHALL copy that active non-editable frame selection before any last-agent-message fallback. Before delivery, complete-frame copy SHALL trim Unicode whitespace from the beginning and end of the complete plain-text payload. It SHALL preserve whitespace between the first and last non-whitespace characters, including multiline indentation and internal blank lines, and SHALL NOT trim each visual row independently.

The visual selected range MAY span every exposed base-frame row. Automatic and explicit `Ctrl+C` frame-copy output SHALL admit selected persistent transcript rows, selected ordinary prompt-input body rows, selected footer/status-bar rows, and selected user-facing application-message rows in frame order. Both routes SHALL exclude flexible alignment rows, autocomplete controls, input borders and presentation-only prompt chrome, prompt-input rows while the draft contains chip tags, scrollbar and selection controls, and other structural dock chrome. A complete-frame range containing only eligible prompt-input, footer/status-bar, or application-message text SHALL copy automatically on release when enabled, or remain visibly selected and copy through `Ctrl+C` when automatic copying is disabled. A range containing only excluded rows or whitespace SHALL remain visibly selected but SHALL NOT submit or replace clipboard content through automatic copy or `Ctrl+C`; `Ctrl+C` SHALL clear such a retained visual-only selection without forwarding an interrupt.

Every selected submitted-prompt row SHALL contribute only its semantic prompt text, excluding the renderer-owned `❯` prefix and prompt padding, whether it is the only eligible transcript source in the range or part of a larger one. Selected ordinary prompt-input text SHALL preserve the selected semantic draft characters while excluding gutter padding, cursor markers, borders, counters, and autocomplete presentation. Selected application-message text SHALL preserve the selected visible message columns and wrapping while excluding message padding and presentation controls. Copy output SHALL otherwise preserve selected visible row boundaries while excluding ANSI and OSC controls, unselected right padding, scrollbar glyphs, and content covered by modal or overlay presentation.

The visual selected range SHALL continue to represent the exact selected cells; clipboard filtering and outer-whitespace normalization SHALL affect only the payload. Ordinary selected transcript and prompt text SHALL use the shared component-owned blue text-selection surface, preserving existing foregrounds, attributes, hyperlinks, and grapheme boundaries. The selected background SHALL remain visible after release. Successful automatic or explicit selection delivery SHALL produce exactly one transient acknowledgement reading `Copied N chars to clipboard`, where `N` is the character count of the normalized payload. The acknowledgement SHALL be right-aligned immediately above the editor in the active theme's accent foreground. If it overlaps selected cells, it SHALL retain the selected row background rather than painting a dark reset block. It SHALL not allocate a row, move transcript or dock content, or change pointer hit regions. A newer acknowledgement SHALL replace the prior acknowledgement and restart its lifetime. Internal clipboard import, contention, transport, denial, timeout, or routing failures SHALL NOT append a status, warning, error, or notice to the session. Clipboard preparation, retry, fallback, and delivery SHALL remain bounded and asynchronous and SHALL NOT block input, streaming, scrolling, animation, rendering, or shutdown.

#### Scenario: Copy an indented command
- **WHEN** eligible transcript selection has plain text `   npm run develop   `
- **THEN** the clipboard payload SHALL be exactly `npm run develop`
- **AND** the selected cells and retained highlight SHALL remain unchanged

#### Scenario: Preserve interior multiline whitespace
- **WHEN** eligible selection contains outer blank space and multiple nonempty lines with indentation or blank lines between its first and last non-whitespace characters
- **THEN** clipboard normalization SHALL remove only the complete payload's leading and trailing whitespace
- **AND** indentation, spacing, newlines, and blank lines inside those boundaries SHALL remain unchanged

#### Scenario: Select only frame chrome or whitespace
- **WHEN** a completed visual range contains only alignment, autocomplete, prompt chrome, structural dock chrome, or whitespace
- **THEN** the complete selected range SHALL remain painted
- **AND** automatic copy and `Ctrl+C` SHALL NOT submit or replace clipboard content

#### Scenario: Select a visible application message
- **WHEN** a completed visual range contains status, warning, error, command-result, or notice text and automatic fullscreen copy is enabled
- **THEN** release SHALL submit the normalized selected message text once
- **AND** message padding, styling controls, and unselected columns SHALL NOT enter the payload

#### Scenario: Copy a retained application message
- **WHEN** automatic fullscreen copy is disabled and a visible application message remains selected after release
- **THEN** a subsequent `Ctrl+C` SHALL submit the same eligible message text once
- **AND** clear the retained selection through the established copy-clearing behavior

#### Scenario: Select ordinary prompt text with automatic copy enabled
- **WHEN** a complete-frame gesture begins outside the editor, extends over non-whitespace ordinary prompt-input text, and automatic fullscreen copy is enabled
- **THEN** A1 SHALL submit the exact selected semantic draft text once without its gutter padding, cursor, borders, counters, or autocomplete presentation
- **AND** the complete-frame prompt-row selection SHALL remain visibly selected after release

#### Scenario: Drag an editable prompt selection
- **WHEN** the reader begins a pointer drag inside ordinary prompt-input text and releases after selecting characters on the same or another wrapped prompt row
- **THEN** the editor SHALL retain the exact selected draft range without automatic clipboard submission
- **AND** moving beyond the prompt bounds before release SHALL clamp the selection to the nearest editor text edge without transferring ownership to the complete frame

#### Scenario: Replace an editor-owned prompt selection
- **WHEN** the reader selects a prompt word or line through editor-owned multi-click selection and invokes clipboard paste
- **THEN** selection release SHALL NOT submit or replace clipboard content
- **AND** paste SHALL replace the selected draft range with the existing clipboard content

#### Scenario: Keep a replacement selection visible while paste prepares
- **WHEN** the reader pastes from the clipboard over an editor-owned prompt word, wrapped range, or multiline selection and preparation is still pending
- **THEN** the original text and its selected highlight SHALL remain visually steady until the replacement is ready
- **AND** the pending semantic reservation SHALL NOT be exposed or change clipboard content

#### Scenario: Finish or interrupt a replacement paste
- **WHEN** preparation succeeds, fails, or is cancelled, or the reader edits the prompt while the replacement is pending
- **THEN** the visible preview SHALL not overwrite intervening input; completion SHALL display the replacement without a blank intermediate frame
- **AND** the established semantic marker, undo, cancellation, and selection restoration behaviors SHALL remain intact

#### Scenario: Explicitly copy an editor-owned prompt selection
- **WHEN** an editor-owned prompt drag, word, or line selection remains highlighted and the reader presses `Ctrl+C`
- **THEN** A1 SHALL submit the exact selected semantic draft text through the established editor copy route
- **AND** the editor SHALL retain its established explicit-copy selection-collapse behavior

#### Scenario: Cut an editor-owned prompt selection
- **WHEN** an editor-owned prompt drag, word, line, wrapped, or atomic-chip selection remains highlighted and the reader presses `Ctrl+X`
- **THEN** A1 SHALL submit the exact selected semantic draft text through the established editor cut route
- **AND** delete only that selected range without invoking last-agent-message copy or showing a last-agent success or failure notice

#### Scenario: Select only the status bar
- **WHEN** a completed visual range contains selected footer/status-bar text and automatic fullscreen copy is enabled
- **THEN** release SHALL submit the normalized selected status-bar text once
- **AND** the complete selected range SHALL remain visible

#### Scenario: Copy only whitespace
- **WHEN** the visual selection contains only spaces, tabs, newlines, or other Unicode whitespace
- **THEN** no clipboard submission or success acknowledgement SHALL occur
- **AND** the visual range SHALL remain selected until its ordinary clearing action

#### Scenario: Copy one submitted prompt
- **WHEN** one submitted prompt is the only eligible transcript source in a completed range
- **THEN** the payload SHALL contain its prompt text without the `❯` prefix or prompt padding
- **AND** visual selection MAY still include surrounding excluded frame rows

#### Scenario: Release a cross-frame selection
- **WHEN** automatic fullscreen copy is enabled and the reader releases a range spanning eligible transcript, application-message, ordinary prompt-input, or footer/status-bar text plus excluded frame rows
- **THEN** clipboard submission SHALL begin from one immutable snapshot of all eligible selected text in visible frame order at that input boundary
- **AND** the complete cross-frame highlight SHALL remain visible while delivery proceeds

#### Scenario: Release a selection with automatic copy disabled
- **WHEN** automatic fullscreen copy is disabled and the reader releases a pointer selection over application-message, ordinary prompt-input, footer/status-bar, or transcript text
- **THEN** A1 SHALL retain the selected highlight without submitting clipboard work or showing a copied acknowledgement
- **AND** a subsequent `Ctrl+C` SHALL submit the eligible selected text once and clear the retained selection through its established route

#### Scenario: Copy styled and linked text
- **WHEN** eligible selected content contains ANSI styling, an OSC 8 link, a wide grapheme, or a combining sequence
- **THEN** the clipboard payload SHALL contain only complete plain-text graphemes in the normalized selected range
- **AND** selection painting SHALL preserve the original visible foreground and attributes beneath its background

#### Scenario: Match the shared selected-text surface
- **WHEN** ordinary transcript or prompt text is selected in the session frame
- **THEN** its selected cells SHALL use the shared blue component background used by other selected-text recipients
- **AND** session-shell recipients SHALL NOT declare their own selection RGB or reset sequence

#### Scenario: Acknowledge copied text beside the editor
- **WHEN** a normalized selection payload is delivered while the acknowledgement row is selected
- **THEN** one right-aligned accent message SHALL read `Copied N chars to clipboard` using the payload's exact character count
- **AND** the message SHALL retain the selected row background without a reverse-video or dark reset box

#### Scenario: Replace rapid copy acknowledgements
- **WHEN** another selection copy succeeds before the current acknowledgement expires
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

#### Scenario: Recover from a clipboard writer failure
- **WHEN** an admitted copy encounters transient contention or one supported writer is unavailable
- **THEN** A1 SHALL retry or use an alternate certified route within the bounded copy lifetime
- **AND** SHALL NOT append copy-failure text to the session

#### Scenario: Re-copy with Ctrl+C
- **WHEN** a released frame selection with eligible transcript, application-message, ordinary prompt-input, or footer/status-bar text is still visible and the reader presses `Ctrl+C`
- **THEN** A1 SHALL submit the normalized eligible payload through the bounded clipboard path regardless of the automatic-copy setting
- **AND** clear the retained frame selection through the established copy-clearing behavior

#### Scenario: Copy a frame selection through the general copy action
- **WHEN** a released non-editable frame selection remains visible and the reader invokes the general message-copy action
- **THEN** A1 SHALL submit and clear that selected payload through the same bounded path as `Ctrl+C`
- **AND** SHALL NOT invoke last-agent-message copy or show its success or failure notice

#### Scenario: Preserve semantic copy routes
- **WHEN** the reader invokes `/copy`, or invokes the general message-copy action with no editor or frame selection
- **THEN** the established last-agent-message workflow SHALL remain available
- **AND** complete-frame filtering SHALL admit only declared application-message, ordinary prompt-input, and footer/status rows among dock content

#### Scenario: No agent message exists to copy
- **WHEN** the reader invokes `/copy` or the general message-copy action with no selected text and the last agent message has no text
- **THEN** the workflow SHALL complete silently without a clipboard submission or an error, status, or success notice
- **AND** existing clipboard contents and the visible session SHALL remain unchanged

#### Scenario: Copy an available last agent message
- **WHEN** the reader invokes `/copy` or the general message-copy action with no selected text and the last agent message contains text
- **THEN** the workflow SHALL submit that text to the clipboard through its existing route
- **AND** retain its existing successful-copy acknowledgement

## MODIFIED Requirements

### Requirement: Gesture ownership preserves interactive surfaces

Pointer routing SHALL choose one owner for the complete press/motion/release sequence. A primary drag over ordinary exposed base-frame content SHALL belong to frame selection. A sequence beginning on an explicit viewport control or inside a modal, selector, dialog, overlay, or replacement surface SHALL retain that surface's existing ownership. A drag already owned by frame selection MAY cross controls, prompt rows, and dock rows without activating them. A primary drag that begins inside the ordinary editor SHALL belong to the editor.

For the ordinary editor, a primary press awaiting release or distinct movement SHALL NOT create or paint a provisional frame selection. A click without accepted drag movement SHALL retain caret/focus behavior, and prompt double-click or triple-click selection SHALL remain bounded to the editor's resulting semantic word or useful logical-line text without an intermediate highlight across unused row cells. Once distinct movement occurs, the sequence SHALL become an editor-owned drag selection that stays editor-owned through release and is clamped to the editor when the pointer leaves the prompt; it SHALL become a frame selection from the original press cell only when the editor declines the press. Right-click paste, wheel navigation, scrollbar drag, scroll-to-bottom activation, sticky-prompt activation, and link clicks SHALL retain their existing gestures and side effects.

The live progress-spinner row SHALL be ordinary exposed base-frame content for primary drag ownership. Its status component and hit region SHALL leave primary-button press, drag or motion, and release events unhandled and SHALL NOT request pointer capture or focus. Frame selection SHALL therefore be able to begin on the spinner row or cross it in either direction as one uninterrupted gesture. Spinner animation SHALL remain a presentation update and SHALL NOT acquire, truncate, or clear an otherwise valid selection.

#### Scenario: Drag from the prompt into the footer
- **WHEN** a primary sequence begins on ordinary prompt text and distinct motion continues into footer/status rows
- **THEN** the gesture SHALL remain one editor-owned selection clamped to the nearest editor text edge
- **AND** it SHALL NOT become a frame selection, select footer/status cells, or submit clipboard work

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

#### Scenario: Stream while approaching the progress spinner
- **WHEN** a held frame-selection endpoint is in the live assistant tail and a streaming update replaces or reflows that tail before the pointer crosses `Working…`
- **THEN** the active gesture SHALL remain continuous through the latest live tail and progress row
- **AND** release SHALL restore ordinary identity-qualified retained-selection behavior

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

### Requirement: Submitted prompt chrome is excluded in every frame selection

Bare A1 frame-selection copy SHALL omit renderer-owned submitted-prompt markers and padding for each selected submitted-prompt row, whether the selection contains only that prompt or also contains assistant replies, other submitted prompts, or eligible dock text. Automatic selection copy and explicit frame copy SHALL use the same extraction policy. The selected prompt text SHALL remain included in frame order, with source indentation, literal `>` and `❯` characters, internal blank lines, visible row boundaries, and selected Unicode graphemes preserved. Prompt-anchor provenance SHALL identify presentation-only cells; arbitrary pasted or selected text SHALL NOT be heuristically stripped. Assistant quote-border and padding exclusions SHALL remain effective alongside prompt exclusions. Clipboard filtering SHALL NOT change selection painting, ordinary paste normalization, editor-owned copy/cut, or the independent comparison profile.

#### Scenario: Copy a submitted prompt and an assistant quote

- **WHEN** a completed frame selection includes the submitted prompt `test text` and the following assistant quote
- **THEN** the payload SHALL include `test text` followed by the selected assistant content in frame order
- **AND** SHALL omit the submitted prompt's UI `❯` marker and padding as well as renderer-owned assistant quote borders and padding

#### Scenario: Copy several submitted prompts with their replies

- **WHEN** a forward or reverse frame selection spans multiple submitted prompts and assistant replies
- **THEN** each selected prompt row SHALL use its own current prompt anchor to exclude its presentation prefix
- **AND** every selected semantic prompt and reply character SHALL remain in frame order

#### Scenario: Preserve partial and wrapped prompt selections

- **WHEN** a mixed selection begins or ends inside a submitted prompt row, includes wrapped continuation rows, or retains document rows scrolled off-screen
- **THEN** extraction SHALL clip semantic text using the original display-column boundaries and current prompt anchors
- **AND** SHALL preserve selected graphemes, genuine indentation, blank lines, and literal marker characters without copying prompt chrome

#### Scenario: Preserve text without prompt provenance

- **WHEN** selected source content or external clipboard text contains literal `>` or `❯` characters that are not renderer-owned prompt chrome
- **THEN** those characters SHALL remain unchanged
- **AND** no blanket per-line trimming or marker-removal rule SHALL apply to pasted text

## REMOVED Requirements

### Requirement: Copy output matches selected visible text
**Reason**: One paragraph and one scenario kept a superseded rule that a submitted prompt inside a larger range is copied with its visible prefix; the code strips prompt chrome in every range, and the ordinary prompt has no `❯` marker.
**Migration**: Covered by "Frame copy delivers the eligible selected text" together with "Submitted prompt chrome is excluded in every frame selection".

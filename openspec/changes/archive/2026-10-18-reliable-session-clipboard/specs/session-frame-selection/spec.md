# Spec Delta

## MODIFIED Requirements

### Requirement: Copy output matches selected visible text

When automatic fullscreen copy is enabled, completing a pointer selection with eligible non-whitespace persistent transcript, ordinary prompt-input, footer/status-bar, or user-facing application-message text SHALL capture and submit that text for clipboard delivery without requiring a second keypress. User-facing application messages SHALL include visible status, warning, error, command-result, and notice text. This SHALL include complete-frame drags and editor-owned prompt word or line multi-click selection. When automatic fullscreen copy is disabled, release SHALL retain the visual selection without submitting clipboard work, and the existing explicit selection-copy action SHALL remain available. Before delivery, complete-frame copy SHALL trim Unicode whitespace from the beginning and end of the complete plain-text payload. It SHALL preserve whitespace between the first and last non-whitespace characters, including multiline indentation and internal blank lines, and SHALL NOT trim each visual row independently.

The visual selected range MAY span every exposed base-frame row. Automatic and explicit `Ctrl+C` frame-copy output SHALL admit selected persistent transcript rows, selected ordinary prompt-input body rows, selected footer/status-bar rows, and selected user-facing application-message rows in frame order. Both routes SHALL exclude flexible alignment rows, autocomplete controls, input borders and presentation-only prompt chrome, prompt-input rows while the draft contains chip tags, scrollbar and selection controls, and other structural dock chrome. A range containing only eligible prompt-input, footer/status-bar, or application-message text SHALL copy automatically on release when enabled, or remain visibly selected and copy through `Ctrl+C` when automatic copying is disabled. A range containing only excluded rows or whitespace SHALL remain visibly selected but SHALL NOT submit or replace clipboard content through automatic copy or `Ctrl+C`; `Ctrl+C` SHALL clear such a retained visual-only selection without forwarding an interrupt.

When one submitted prompt is the only eligible transcript source in the range, clipboard text SHALL contain only its semantic prompt text, excluding the `❯` prefix, prompt padding, and timestamp. When a submitted prompt participates in a larger eligible transcript range, copy SHALL preserve its currently selected visible prefix, alignment, and timestamp together with the surrounding selected transcript text. Selected ordinary prompt-input text SHALL preserve the selected semantic draft characters while excluding the `❯` prefix, padding, cursor markers, borders, counters, and autocomplete presentation. Selected application-message text SHALL preserve the selected visible message columns and wrapping while excluding message padding and presentation controls. Copy output SHALL otherwise preserve selected visible row boundaries while excluding ANSI and OSC controls, unselected right padding, scrollbar glyphs, and content covered by modal or overlay presentation.

The visual selected range SHALL continue to represent the exact selected cells; clipboard filtering and outer-whitespace normalization SHALL affect only the payload. The selected background SHALL remain visible after release. Successful automatic or explicit selection delivery SHALL produce exactly one transient acknowledgement reading `copied N chars to clipboard`, where `N` is the character count of the normalized payload. The acknowledgement SHALL be right-aligned immediately above the editor in the active theme's accent foreground. If it overlaps selected cells, it SHALL retain the selected row background rather than painting a dark reset block. It SHALL not allocate a row, move transcript or dock content, or change pointer hit regions. A newer acknowledgement SHALL replace the prior acknowledgement and restart its lifetime. Internal clipboard import, contention, transport, denial, timeout, or routing failures SHALL NOT append a status, warning, error, or notice to the session. Clipboard preparation, retry, fallback, and delivery SHALL remain bounded and asynchronous and SHALL NOT block input, streaming, scrolling, animation, rendering, or shutdown.

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
- **WHEN** the reader completes a frame drag or editor-owned word or line selection over non-whitespace ordinary prompt-input text while automatic fullscreen copy is enabled
- **THEN** A1 SHALL submit the exact selected semantic draft text once without its prefix, padding, cursor, borders, counters, or autocomplete presentation
- **AND** the prompt selection SHALL remain visibly selected after release

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
- **THEN** the payload SHALL contain its prompt text without the `❯` prefix, prompt padding, or timestamp
- **AND** visual selection MAY still include surrounding excluded frame rows

#### Scenario: Copy a bulk transcript range containing a prompt
- **WHEN** a completed range contains a submitted prompt and other eligible transcript text
- **THEN** the payload SHALL preserve all selected eligible transcript text in frame order
- **AND** the submitted prompt's selected visible prefix, alignment, and timestamp SHALL remain included

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

#### Scenario: Acknowledge copied text beside the editor
- **WHEN** a normalized selection payload is delivered while the acknowledgement row is selected
- **THEN** one right-aligned accent message SHALL read `copied N chars to clipboard` using the payload's exact character count
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

#### Scenario: Preserve semantic copy routes
- **WHEN** the reader invokes `/copy` or copies or cuts a keyboard-selected prompt range
- **THEN** those routes SHALL retain their existing semantic last-message or exact-editor-text behavior
- **AND** complete-frame filtering SHALL admit only declared application-message, ordinary prompt-input, and footer/status rows among dock content

## ADDED Requirements

### Requirement: Supported sessions provide a writable standard clipboard route

Bare A1 SHALL treat standard text clipboard writing as a required capability on every supported local desktop and resident launch. Local sessions SHALL commit admitted text to the operating-system standard clipboard through a native writer, bounded transient retry, or a supported platform writer. Remote, WSL, pseudoterminal, and terminal-multiplexer sessions SHALL commit through the certified user-terminal clipboard route when the process-local clipboard would target the wrong host. Destination selection SHALL NOT rely only on optional native-package availability or Node `stdout` TTY classification. Fallback attempts SHALL be sequential, cancelable, and fenced so one copy intent changes the clipboard at most once.

#### Scenario: Native clipboard is temporarily busy
- **WHEN** the preferred local clipboard writer reports transient contention
- **THEN** A1 SHALL retry within the existing bounded copy deadline or continue to the supported platform writer
- **AND** the complete payload SHALL reach the standard clipboard exactly once

#### Scenario: Optional native binding is unavailable
- **WHEN** the native clipboard package or platform binary cannot load in a supported installed local session
- **THEN** A1 SHALL use the supported operating-system command writer without losing the triggering copy
- **AND** repository-parent dependencies SHALL NOT be required

#### Scenario: Copy from a remote session
- **WHEN** destination policy identifies SSH, WSL, or a terminal multiplexer where a process-local clipboard is not the user's clipboard
- **THEN** A1 SHALL submit one bounded clipboard effect through the active user terminal
- **AND** SHALL NOT write the remote host's unrelated desktop clipboard

#### Scenario: Every supported packaged launch has a writer
- **WHEN** a clean supported package is installed and launched outside a repository checkout
- **THEN** at least one declared standard-clipboard writer SHALL be reachable for local selection copy
- **AND** its first admitted copy SHALL NOT depend on a prior clipboard or focus action

## MODIFIED Requirements

### Requirement: Viewport pointer handling preserves unrelated input
The viewport SHALL claim wheel events addressed to exposed transcript content and pointer events addressed to its exposed scrollbar, scroll-to-bottom control, pinned prompt, or transcript selection, whether the ordinary editor or any modal surface has focus. It SHALL leave unrelated keyboard and pointer input to the focused surface. Modal ownership SHALL be resolved from visible surface geometry and an active gesture's owner rather than from the presence of a modal alone. A selector, dialog, overlay, or replacement input SHALL retain events beginning within its own visible bounds; covered transcript cells SHALL NOT accept new background interactions. Engine events SHALL be delivered cooperatively so terminal input receives an event-loop turn between transcript updates.

#### Scenario: Scroll the transcript with the wheel
- **WHEN** a wheel event is addressed to exposed transcript content while the ordinary editor or a modal owns focus
- **THEN** the transcript SHALL scroll and the wheel sequence SHALL NOT be inserted into or navigate the focused input surface

#### Scenario: Select ordinary transcript text
- **WHEN** a pointer drag starts on exposed transcript text outside every viewport control hit region
- **THEN** the viewport SHALL NOT treat it as a scrollbar or navigation action
- **AND** A1's custom transcript selection behavior SHALL remain available even while a modal has focus

#### Scenario: Select while the agent is active
- **WHEN** agent operations produce a sustained burst of transcript or lifecycle events during a pointer selection
- **THEN** event delivery SHALL yield between updates so pointer reports, editor input, and animation timers continue to run
- **AND** selection drags, content-area wheel scrolling, scrollbar interaction, and the jump-to-bottom control SHALL remain responsive
- **AND** an active selection SHALL continue through intermediate no-button motion reports until release

#### Scenario: Paint selected transcript text
- **WHEN** transcript text is selected
- **THEN** selection SHALL add the declared dark-blue background only
- **AND** every source foreground color, link, bold, italic, and underline attribute SHALL remain unchanged
- **AND** whole and interior selected rows SHALL paint through the final terminal column while any visible scrollbar glyph remains above the selection background

#### Scenario: Render ordinary content through the rail overlay column
- **WHEN** an ordinary transcript row reaches the right edge in `always` or `auto` scrollbar mode
- **THEN** its wrapping width SHALL include the final terminal column
- **AND** a visible scrollbar SHALL overlay that column rather than permanently removing one content cell
- **AND** submitted prompt rows SHALL retain their intentional blank rail cell after a fitting timestamp

#### Scenario: Double-click at the final reserved cell
- **WHEN** a double-click selects trailing whitespace that reaches the transcript content edge
- **THEN** the selection background SHALL continue through the final terminal column, including the reserved scrollbar cell
- **AND** copied text SHALL remain the semantic selected content without appended padding
- **AND** any visible scrollbar glyph SHALL remain painted above that background

#### Scenario: Double-click a full-width content run
- **WHEN** a double-click selects a word or other non-whitespace run that ends beside the final empty cell
- **THEN** the selection background SHALL end with the content and SHALL NOT include that empty cell
- **AND** if the selection subsequently continues onto another row, every completed interior row SHALL paint through the final terminal column

#### Scenario: Hold an active selection beyond a viewport edge
- **WHEN** the pointer remains above or below the transcript viewport during an active selection
- **THEN** at `normal` scrollbar speed the transcript SHALL auto-scroll exactly one row every 30 milliseconds without requiring new motion reports
- **AND** at `fast` scrollbar speed it SHALL auto-scroll exactly two rows every 30 milliseconds
- **AND** at `high` scrollbar speed it SHALL auto-scroll exactly three rows every 30 milliseconds
- **AND** additional edge-motion reports SHALL update the pointer endpoint without adding unscheduled scroll rows
- **AND** the selection endpoint SHALL extend with each scrolled row
- **AND** auto-scroll SHALL stop on release, re-entry, reset, or the document boundary

#### Scenario: Begin a drag on dock chrome
- **WHEN** a left-button sequence begins on the transient working-status tail, an ordinary input prompt row, a widget, or the footer outside a viewport control hit region and outside a modal-owned region
- **THEN** the complete sequence SHALL be consumed without creating transcript or fullscreen selection
- **AND** neither the working-status tail nor dock chrome SHALL receive transcript selection painting

#### Scenario: A modal surface owns input
- **WHEN** a new pointer interaction begins inside a selector, dialog, overlay, or replacement input, or unrelated keyboard input is addressed to that surface
- **THEN** the viewport SHALL leave the event to that active surface
- **AND** the mere presence of that surface SHALL NOT transfer ownership of exposed transcript content to it

#### Scenario: Viewport closes during a drag
- **WHEN** the session is replaced, stopped, or disposed while a viewport control is hovered or dragged
- **THEN** its transient pointer state SHALL be cleared and the terminal SHALL be restored

## ADDED Requirements

### Requirement: Every modal preserves interaction with exposed transcript content
In bare A1, all built-in and extension-provided modal surfaces SHALL leave exposed transcript content under A1 viewport ownership. This SHALL apply uniformly to selectors, dialogs, confirmations, permission and authentication flows, nested surfaces, floating overlays, and replacement inputs or editors without a per-command opt-in. The existing scrollbar appearance, style, speed, follow/detach behavior, and exposed navigation controls SHALL remain functional. A modal SHALL NOT suppress an otherwise-visible scrollbar; `auto`, `always`, and `hidden` SHALL retain their existing meanings.

#### Scenario: Open Model Configuration above an overflowing transcript
- **WHEN** Model Configuration is open with transcript content visible above it
- **THEN** wheel scrolling over that content, exposed scrollbar hover, thumb drag, track paging, and the exposed jump-to-bottom control SHALL work as they do without the modal
- **AND** these interactions SHALL NOT change the model selection, close the dialog, or move keyboard focus

#### Scenario: Apply the same behavior to every modal family
- **WHEN** any built-in or extension modal, nested modal, overlay, selector, or replacement input leaves transcript cells exposed
- **THEN** those cells and exposed viewport controls SHALL retain the same A1 scrolling and selection behavior without requiring that modal to opt in
- **AND** modal-local wheel actions, buttons, editing, completion, save, and cancel SHALL retain their existing behavior

#### Scenario: Copy transcript text with a modal open
- **WHEN** the reader selects exposed transcript text using a drag, double-click, or triple-click and presses `Ctrl+C` while a modal remains open
- **THEN** A1 SHALL copy the semantic selected transcript text exactly once, clear the selection using its existing copy behavior, and preserve source foreground styling beneath its custom selection background
- **AND** copied text SHALL exclude modal text, dock rows, viewport controls, and visual padding
- **AND** neither vanilla fullscreen selection nor its copy notification SHALL be invoked
- **AND** the copy chord SHALL NOT also cancel or edit the modal

#### Scenario: Type or cancel without a transcript selection
- **WHEN** no transcript range is selected and the reader types or invokes a navigation, paste, save, or cancel shortcut while a modal has keyboard focus
- **THEN** the modal SHALL retain its established keyboard behavior, including its existing handling of `Ctrl+C`
- **AND** hidden ordinary-editor state SHALL NOT intercept that input

#### Scenario: Cross a surface boundary during a drag
- **WHEN** a drag begun on exposed transcript text or scrollbar crosses into modal bounds, or a modal-owned drag crosses into the transcript
- **THEN** the initiating surface SHALL retain the gesture through release without activating the crossed surface
- **AND** transcript selection SHALL remain confined to semantic transcript content and paint beneath the modal, with no selection highlight over modal cells
- **AND** a transcript drag held beyond the viewport edge SHALL retain the existing edge auto-scroll behavior

#### Scenario: Resize or transition modal surfaces
- **WHEN** a modal opens, nests, changes size, closes, or is cancelled, or the terminal resizes while a modal is active
- **THEN** visible transcript bounds, scrollbar geometry, occlusion, and hit targets SHALL agree with the current frame
- **AND** valid detached transcript position SHALL be preserved, clamped only as needed for the new extent, while end-following remains end-following
- **AND** a geometry or ownership transition SHALL end any in-flight gesture and its auto-scroll timer without leaking its remaining reports into another surface
- **AND** no stale selection paint or obsolete hit target SHALL remain

#### Scenario: A modal covers all transcript content
- **WHEN** a full-cover modal leaves no transcript cells or controls exposed
- **THEN** no new background scroll, selection, or control interaction SHALL begin through that modal
- **AND** closing it SHALL restore the A1 viewport without changing its valid navigation state solely because a modal was present

#### Scenario: Stream while reading behind a modal
- **WHEN** new output arrives while the reader is detached and scrolling or selecting exposed transcript content behind a modal
- **THEN** the valid transcript position SHALL remain stable and pointer feedback SHALL remain responsive
- **AND** modal contents, focus, and controls SHALL remain usable

#### Scenario: Preserve comparison behavior
- **WHEN** the same modal workflow runs in `a1 pi`
- **THEN** its pinned selection, copy, input routing, and presentation SHALL remain unchanged

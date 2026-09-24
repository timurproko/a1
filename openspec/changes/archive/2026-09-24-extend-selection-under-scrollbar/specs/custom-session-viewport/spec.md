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
- **AND** whole and interior selected rows SHALL paint through the final terminal column, including beneath scrollbar chrome, while the gutter remains excluded from source and copy semantics

#### Scenario: Render ordinary content through the rail overlay column
- **WHEN** an ordinary transcript row reaches the right edge in `always` or `auto` scrollbar mode
- **THEN** its wrapping width and source glyphs SHALL end immediately before the final-column rail gutter
- **AND** its full-row content background SHALL continue through an unselected gutter while source text, hyperlinks, and emphasis remain outside it
- **AND** selection paint SHALL replace that gutter background whenever the adjacent selected range reaches the content boundary
- **AND** a visible scrollbar SHALL overlay the resulting background rather than replace a source or selection cell
- **AND** revealing or hiding an automatic rail SHALL NOT change content width, background continuity, selection coverage, or row reflow

#### Scenario: Double-click at the final reserved cell
- **WHEN** a double-click selects trailing whitespace that reaches the transcript content edge
- **THEN** the selection background SHALL continue through the final terminal column beneath any visible scrollbar glyph
- **AND** copied text SHALL remain the semantic selected content without appended padding or a scrollbar glyph
- **AND** the gutter SHALL remain independently owned by scrollbar gestures

#### Scenario: Double-click a full-width content run
- **WHEN** a double-click selects a word or other non-whitespace run that ends in the final content cell
- **THEN** the complete source run SHALL be selected and its background SHALL continue through the gutter without making the gutter copyable
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

### Requirement: Right-edge selection remains truthful across scrollbar presentation
Bare A1 SHALL allow a transcript selection begun outside viewport controls to extend through the final rendered source grapheme in the content area immediately before the dedicated scrollbar gutter. Whole-row selections, completed interior rows of a multiline selection, and endpoints that reach the content boundary SHALL continue their selection background through the gutter to the final terminal column. A partial endpoint that excludes the final source grapheme SHALL leave that grapheme and the gutter unselected. The gutter SHALL contain no source glyph, hyperlink, emphasis decoration, semantic selection endpoint, or copyable content; its selection background is a visual continuation of the adjacent selected range.

With document content, geometry, viewport position, and selection endpoints unchanged, scrollbar hover, reveal, style changes, and hide SHALL NOT change selection membership, copied text, content wrapping, block extent, or the gutter's selected or unselected background. A visible glyph SHALL remain confined to the gutter and SHALL be drawn over that background without entering copied text; hiding an automatic rail SHALL expose the same selected or ordinary background without exposing source content.

#### Scenario: Complete several lines through the right edge
- **WHEN** a transcript drag selects complete lines and ends through the last source grapheme immediately before the scrollbar gutter
- **THEN** every included final grapheme SHALL be selected and copied without needing a scrollbar hover
- **AND** each whole or completed interior row's selection background SHALL continue through the final terminal column
- **AND** equivalent forward and reverse ranges SHALL highlight and copy the same source text
- **AND** neither rail visibility nor gutter reservation SHALL truncate the final source grapheme

#### Scenario: Hover with the last character selected
- **WHEN** a released selection includes the final source grapheme and the pointer enters and leaves the scrollbar without pressing or scrolling
- **THEN** the final content cell and neighboring gutter SHALL retain the selection background
- **AND** the scrollbar glyph SHALL reveal and hide over that background without replacing any source character
- **AND** selection endpoints and copied text SHALL remain unchanged throughout

#### Scenario: Hover with the last character deliberately excluded
- **WHEN** a released partial selection ends immediately before the final source grapheme and the pointer enters and leaves the scrollbar without pressing or scrolling
- **THEN** neither that final source cell nor the scrollbar gutter SHALL gain selection background from the selected neighbor
- **AND** rail visibility SHALL NOT change the final source cell or the gutter's continued ordinary row background
- **AND** copied text SHALL exclude that grapheme before, during, and after hover

#### Scenario: Change rail presentation without changing the selection
- **WHEN** the rail reveals from activity, changes between normal and hovered presentation, or hides after activity expires while the source range remains fixed
- **THEN** the first frame of each transition SHALL preserve the same final content cell and selected or ordinary gutter background without stale or transient styling
- **AND** this behavior SHALL hold for thin and thick rails in auto and always modes, while hidden mode SHALL return the gutter column to content and recompute the source layout

#### Scenario: Preserve styled and wide right-edge content
- **WHEN** selected or unselected boundary content contains a wide grapheme, a combining sequence, source background styling, or a hyperlink
- **THEN** selection and copy SHALL preserve whole source graphemes and existing source-selection styling rules within the content area
- **AND** the gutter SHALL use the selection background when the adjacent range reaches the boundary and the ordinary row background otherwise
- **AND** source hyperlinks, foregrounds, and emphasis decoration SHALL terminate before the gutter
- **AND** no scrollbar glyph, visual padding, or partial grapheme SHALL be added to copied text

#### Scenario: Continue selection into the rail without stealing a new rail gesture
- **WHEN** a selection drag begun on ordinary transcript content reaches the final content column
- **THEN** the active selection SHALL extend through the source grapheme in that column and visually through the scrollbar gutter
- **AND** the gutter SHALL remain absent from copied text and semantic selection endpoints
- **AND** a separate press beginning on the scrollbar gutter SHALL retain its established scrollbar ownership

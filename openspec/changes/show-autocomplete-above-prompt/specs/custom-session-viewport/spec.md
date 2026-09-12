## ADDED Requirements

### Requirement: Default-editor autocomplete grows above a stable prompt
Bare A1 SHALL render the default editor's autocomplete list immediately above the editor's upper border, after any above-editor widgets, rather than below the editor. At unchanged terminal dimensions, editor text layout, and other dock content, opening, closing, filtering, paging, or asynchronously updating autocomplete SHALL NOT change the terminal rows occupied by the editor borders, prompt text, caret, below-editor widgets, or footer. The menu SHALL consume space upward from the transcript viewport, not from below the prompt, and SHALL NOT reserve empty menu rows after it closes.

While the menu has rendered rows, bare A1 SHALL render exactly one horizontal line immediately above it, after above-editor widgets and without a blank spacer. The line SHALL match the input prompt border's horizontal glyph, full rendered width, and current color, including theme or editor-mode color changes. It SHALL contain no copied history or editor-scroll labels. When the existing completion list emits its trailing counter, bare A1 SHALL instead show that counter in the top line as `1/24`, without parentheses, at the history border label's four-cell inset and in its dim color. The original counter row SHALL be removed without a blank replacement. Counter values, updates, and visibility conditions SHALL remain those of the existing list; fitting lists without a counter retain a plain top line. If a complete counter cannot be obtained or fitted at a narrow width, its label SHALL be omitted rather than misrepresented. The existing prompt upper border SHALL remain between the menu and input. The top line SHALL be included in the upward allocation and body offset so its appearance or disappearance does not move the input or footer. The menu SHALL retain its original background and padding; no panel shading SHALL be added.

The list and its top line SHALL remain transient, non-transcript presentation. It SHALL NOT enter scrollback history, transcript selection, copied prompt text, or submitted text. Changes unrelated to autocomplete, including prompt wrapping, terminal resizing, and widget or footer height changes, SHALL retain their existing reflow behavior.

#### Scenario: Open the slash-command list
- **WHEN** the user types `/` in a single-line bare-A1 prompt
- **THEN** the completion list SHALL appear above the prompt's upper border
- **AND** the prompt and footer SHALL occupy the same terminal rows as the equivalent frame without the list
- **AND** no completion rows SHALL appear between the prompt's lower border and footer

#### Scenario: Match the menu top line to the prompt
- **WHEN** the default editor displays autocomplete, including after a theme, editor-mode color, or terminal-width change
- **THEN** exactly one horizontal line SHALL appear directly above the suggestions with the prompt border's current color, glyph, and width
- **AND** the original prompt upper border SHALL remain below the suggestions
- **AND** the top line SHALL NOT replace any candidate row
- **AND** candidate rows SHALL retain their original background and padding without menu-panel shading

#### Scenario: Relocate the existing completion counter
- **WHEN** the existing list would display a trailing counter such as `(1/24)`
- **THEN** the same value SHALL appear as `1/24` in the top line at the history label inset and in the same dim color
- **AND** the trailing counter row SHALL be absent, not duplicated or left blank
- **AND** navigation, filtering, and asynchronous results SHALL update the top counter using the existing list semantics without moving the prompt

#### Scenario: Filter and dismiss suggestions
- **WHEN** filtering reduces or grows the visible list without changing prompt wrapping, or Escape or a no-match result closes it
- **THEN** the menu SHALL grow or shrink upward without moving the prompt or footer
- **AND** closing the menu SHALL remove its top line in the same frame
- **AND** vacated menu and top-line rows SHALL be repainted with the current underlying viewport content without stale suggestions, lines, or reserved blank menu space

#### Scenario: Receive asynchronous results
- **WHEN** a current asynchronous completion result opens or resizes the list
- **THEN** the same stable-prompt placement SHALL apply to its first visible frame
- **AND** a canceled or superseded result SHALL NOT reopen or repaint an obsolete menu

#### Scenario: Navigate suggestions without changing height
- **WHEN** keyboard navigation changes the active item or page while the menu fits within the terminal and its visible height remains unchanged
- **THEN** the prompt SHALL remain stationary and the active item SHALL be visible
- **AND** established transcript rows SHALL retain the existing bounded dock-only rendering behavior

#### Scenario: Complete within a multiline prompt
- **WHEN** autocomplete opens or changes height within an unchanged wrapped or multiline draft
- **THEN** the complete visible editor body and caret SHALL retain their terminal rows
- **AND** any existing editor scroll indicator or history border presentation SHALL remain attached to its editor border rather than to the menu

#### Scenario: Use autocomplete beside a detached or streaming transcript
- **WHEN** autocomplete opens, closes, or resizes while the transcript is detached or receiving output
- **THEN** the viewport SHALL reallocate available rows using its existing follow, detach, and valid-position clamping rules
- **AND** the menu SHALL neither become transcript content nor force an otherwise valid detached position to follow the end
- **AND** the prompt and footer SHALL remain stable when their own geometry is unchanged

### Requirement: Above-prompt autocomplete preserves existing sizing and input geometry
Moving autocomplete above the input SHALL preserve the existing menu size limits, selection window, pagination, and `autocompleteMaxVisible` setting behavior. The existing terminal clipping and resize policy SHALL remain in force. This placement change SHALL NOT introduce a terminal-space-derived item limit, a one-row menu mode, special zero-capacity completion state, or a different pagination policy.

Rendering, cursor placement, prompt selection, and pointer hit regions SHALL agree on the editor body's actual position. Menu rows and the top line SHALL NOT be interpreted as prompt text or exposed transcript rows. The decorative line SHALL absorb the existing counter row when present, or add one dock row when absent, without modifying completion-item limits or selection-window behavior. Resizing or changing the visible list height SHALL update affected geometry in the same frame.

#### Scenario: Resize with autocomplete visible
- **WHEN** the terminal is resized while autocomplete is open
- **THEN** the existing menu and terminal sizing/clipping rules SHALL apply to the new geometry with the menu positioned above the input
- **AND** the placement change SHALL NOT modify the completion selection, configured item limit, or pagination behavior

#### Scenario: Use the visible-item setting
- **WHEN** autocomplete renders with a configured `autocompleteMaxVisible` value
- **THEN** its existing visible-item and setting-application behavior SHALL be preserved
- **AND** moving the list above the input SHALL NOT write or override that setting

#### Scenario: Select and copy prompt text with a menu visible
- **WHEN** the user clicks or drags across visible prompt text while autocomplete is open
- **THEN** caret placement, selection highlighting, and copied text SHALL correspond to the actual prompt cells
- **AND** a pointer sequence beginning on a menu row or its top line SHALL NOT select prompt or transcript text

#### Scenario: Render narrow or Unicode content
- **WHEN** the draft or menu contains wide or combining characters, or the terminal is narrow
- **THEN** wrapping, clipping, selection, and cursor geometry SHALL remain cell-correct within the available width
- **AND** menu height changes alone SHALL NOT move the prompt

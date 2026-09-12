## ADDED Requirements

### Requirement: Default-editor autocomplete grows above a stable prompt
Bare A1 SHALL render the default editor's autocomplete list immediately above the editor's upper border, after any above-editor widgets, rather than below the editor. At unchanged terminal dimensions, editor text layout, and other dock content, opening, closing, filtering, paging, or asynchronously updating autocomplete SHALL NOT change the terminal rows occupied by the editor borders, prompt text, caret, below-editor widgets, or footer. The menu SHALL consume space upward from the transcript viewport, not from below the prompt, and SHALL NOT reserve empty menu rows after it closes.

The list SHALL remain transient, non-transcript presentation. It SHALL NOT enter scrollback history, transcript selection, copied prompt text, or submitted text. Changes unrelated to autocomplete, including prompt wrapping, terminal resizing, and widget or footer height changes, SHALL retain their existing reflow behavior.

#### Scenario: Open the slash-command list
- **WHEN** the user types `/` in a single-line bare-A1 prompt
- **THEN** the completion list SHALL appear above the prompt's upper border
- **AND** the prompt and footer SHALL occupy the same terminal rows as the equivalent frame without the list
- **AND** no completion rows SHALL appear between the prompt's lower border and footer

#### Scenario: Filter and dismiss suggestions
- **WHEN** filtering reduces or grows the visible list without changing prompt wrapping, or Escape or a no-match result closes it
- **THEN** the menu SHALL grow or shrink upward without moving the prompt or footer
- **AND** vacated menu rows SHALL be repainted with the current underlying viewport content without stale suggestions or reserved blank menu space

#### Scenario: Receive asynchronous results
- **WHEN** a current asynchronous completion result opens or resizes the list
- **THEN** the same stable-prompt placement SHALL apply to its first visible frame
- **AND** a canceled or superseded result SHALL NOT reopen or repaint an obsolete menu

#### Scenario: Navigate suggestions without changing height
- **WHEN** keyboard navigation changes the active item or page while the visible menu height remains unchanged
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

### Requirement: Above-prompt autocomplete fits available space and preserves input geometry
The autocomplete menu SHALL fit within the current terminal dimensions after the existing non-menu dock allocation is determined. It SHALL honor the effective `autocompleteMaxVisible` limit, further reducing visible choices when terminal space requires it. When at least one menu row fits, the selected item SHALL remain visible and every completion SHALL remain reachable through existing navigation. If no menu row fits, the menu SHALL remain unpainted rather than displace or cover the input/footer; its current completion state and established key behavior SHALL remain intact. Restoring space SHALL reveal the current list and selection. Auxiliary pagination rows SHALL yield to an active-choice row when necessary.

Rendering, cursor placement, prompt selection, and pointer hit regions SHALL agree on the editor body's actual position. Menu rows SHALL NOT be interpreted as prompt text or exposed transcript rows. Resizing or changing the visible list height SHALL update affected geometry in the same frame.

#### Scenario: Resize to a short terminal
- **WHEN** the terminal has less space above the non-menu dock than the configured list needs
- **THEN** the menu SHALL show only the choices that fit, including the active choice when any menu row is available
- **AND** the complete frame SHALL stay within bounds without moving the editor or footer relative to their no-menu allocation at that size

#### Scenario: No room remains for a menu
- **WHEN** the existing dock consumes all available terminal rows
- **THEN** autocomplete SHALL NOT add rows or obscure the input
- **AND** its completion state and existing key semantics SHALL remain intact until dismissal, application, or a new result
- **WHEN** additional space becomes available
- **THEN** the current menu selection SHALL reappear above the prompt

#### Scenario: Update the visible-item setting
- **WHEN** the effective `autocompleteMaxVisible` setting changes while a menu is active
- **THEN** the next frame SHALL apply the new limit, subject to terminal capacity, without restarting the shell
- **AND** only autocomplete allocation SHALL change if the other geometry is unchanged

#### Scenario: Select and copy prompt text with a menu visible
- **WHEN** the user clicks or drags across visible prompt text while autocomplete is open
- **THEN** caret placement, selection highlighting, and copied text SHALL correspond to the actual prompt cells
- **AND** a pointer sequence beginning on a menu row SHALL NOT select prompt or transcript text

#### Scenario: Render narrow or Unicode content
- **WHEN** the draft or menu contains wide or combining characters, or the terminal is narrow
- **THEN** wrapping, clipping, selection, and cursor geometry SHALL remain cell-correct within the available width
- **AND** menu height changes alone SHALL NOT move the prompt

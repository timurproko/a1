## ADDED Requirements

### Requirement: Prompt line navigation and content-boundary navigation use distinct shortcuts
In bare A1's ordinary prompt context, unmodified `Home` and `End` SHALL move the cursor to the start and end of the current logical prompt line respectively, without navigating the transcript or changing its follow state. A soft-wrapped line SHALL retain the editor's logical-line boundary behavior. `Ctrl+Home` SHALL navigate the content area to its beginning, and `Ctrl+End` SHALL navigate to the complete current tail and restore end following. Content navigation SHALL preserve the prompt text and cursor and SHALL NOT insert terminal key sequences into the prompt, even when the content fits or the requested boundary is already visible.

These bindings SHALL respect existing selector, dialog, overlay, and replacement-input ownership. Other keyboard shortcuts and the pinned `a1 pi` comparison profile SHALL retain their existing behavior. Supported terminal encodings for each of these keys SHALL produce the same ownership and action, without treating additional modifiers as an unmodified or Ctrl-only key. Bare A1's active shortcut help SHALL describe Home/End as prompt line navigation and Ctrl+Home/Ctrl+End as content-boundary navigation rather than advertising the previous ownership.

#### Scenario: Navigate a single-line prompt
- **WHEN** the ordinary prompt contains text and the reader presses `Home` or `End`
- **THEN** the cursor SHALL move to the beginning or end of that prompt line respectively
- **AND** the draft text, transcript position, and follow state SHALL remain unchanged

#### Scenario: Navigate a multiline or soft-wrapped prompt
- **WHEN** the cursor is on a logical line within a multiline or soft-wrapped prompt and the reader presses `Home` or `End`
- **THEN** the cursor SHALL move to the beginning or end of that logical line respectively rather than to a different logical line or content boundary
- **AND** the transcript SHALL NOT navigate in response to that key

#### Scenario: Jump to the content beginning
- **WHEN** the ordinary prompt owns input, content overflows, and the reader presses `Ctrl+Home`
- **THEN** the content area SHALL show its document beginning and detach from end following
- **AND** subsequent appended output SHALL preserve that position while it remains valid
- **AND** the prompt text and cursor SHALL remain unchanged

#### Scenario: Jump to the complete current tail
- **WHEN** the ordinary prompt owns input, the viewport is detached, and the reader presses `Ctrl+End`
- **THEN** the content area SHALL move to its complete current tail, including any live working status, and resume following new output
- **AND** the jump-to-bottom control SHALL disappear
- **AND** the prompt text and cursor SHALL remain unchanged

#### Scenario: Navigate at a boundary or with fitting content
- **WHEN** the reader presses `Ctrl+Home` or `Ctrl+End` with empty or fitting content, or repeatedly requests an already reached boundary
- **THEN** the content area SHALL remain at a valid clamped position without wrapping
- **AND** `Ctrl+End` SHALL leave end following enabled
- **AND** neither key SHALL fall through to prompt cursor movement or text insertion

#### Scenario: A different input surface owns the keys
- **WHEN** a selector, dialog, overlay, or replacement input owns `Home`, `End`, `Ctrl+Home`, or `Ctrl+End`
- **THEN** that surface SHALL retain the event according to its existing behavior
- **AND** the viewport SHALL NOT steal the event to navigate its content

#### Scenario: Decode equivalent terminal reports
- **WHEN** a supported terminal delivers a legacy or extended encoding of one of the four shortcuts
- **THEN** the action and input owner SHALL match the shortcut's declared behavior
- **AND** additional Shift or Alt modifiers SHALL NOT accidentally trigger these four bindings

#### Scenario: Read shortcut help
- **WHEN** the reader opens bare A1's shortcut help
- **THEN** it SHALL identify `Home` and `End` as prompt line start/end and `Ctrl+Home` and `Ctrl+End` as content beginning/end
- **AND** it SHALL NOT describe Ctrl+Home/Ctrl+End as prompt line navigation or Home/End as content navigation

#### Scenario: Keep comparison behavior isolated
- **WHEN** the reader launches `a1 pi`
- **THEN** the comparison profile's existing keybindings and shortcut help SHALL remain unchanged
- **AND** no A1 jump-to-bottom block SHALL be added

## MODIFIED Requirements

### Requirement: A detached viewport exposes a scroll-to-bottom control
When overflowing transcript content is detached from its end, the viewport SHALL draw one scroll-to-bottom control floating over the final visible transcript row. The control SHALL NOT consume a row or move transcript text outside the viewport. It SHALL have normal and pointed-at presentation states, SHALL activate only from its own hit region, and SHALL disappear as soon as end following resumes or content ceases to overflow.

The control SHALL display `Jump to bottom (Ctrl+End) ↓` when there are no newly counted messages, `1 new message (Ctrl+End) ↓` for one, and `N new messages (Ctrl+End) ↓` for multiple, with `N` replaced by the existing message count. The trailing arrow SHALL be the text glyph `↓` (U+2193), separated from the shortcut hint by one space. Existing surrounding padding, block styling, placement, message-count semantics, and click behavior SHALL remain unchanged. The complete visible label, including the arrow, SHALL belong to the same hover and click target. When a counted label does not fit, the existing generic-label fallback SHALL use the new shortcut hint and arrow; if that complete padded generic label also does not fit, the control SHALL remain omitted without leaving an invisible hit region or overflowing the terminal.

The visible control SHALL use its pointed-at presentation exactly when the latest known terminal pointer position is inside its current hit region. The first frame that reveals the control or changes its hit region SHALL reflect that position without requiring a new mouse-motion report. Coordinate-bearing mouse reports delivered to viewport pointer handling, including wheel, press, release, and motion reports, SHALL update the known pointer position without changing existing event ownership or activation rules. Hiding the control SHALL NOT discard that position; the existing pointer-state reset and session teardown lifecycle SHALL clear it. With no known pointer position, the control SHALL use its normal presentation.

#### Scenario: Detach from overflowing content
- **WHEN** the transcript overflows and the reader scrolls away from its end
- **THEN** one scroll-to-bottom control SHALL appear at the bottom of the transcript viewport when its complete label fits

#### Scenario: Activate the control
- **WHEN** the pointer activates the scroll-to-bottom control
- **THEN** the viewport SHALL move to the end and resume following
- **AND** the control SHALL disappear

#### Scenario: Point outside the control
- **WHEN** a pointer press lands on transcript content outside the control's hit region
- **THEN** the control SHALL NOT activate
- **AND** ordinary transcript pointer handling SHALL remain available

#### Scenario: Content fits
- **WHEN** all transcript content fits above the dock
- **THEN** no scroll-to-bottom control SHALL be drawn

#### Scenario: Reveal beneath a stationary cursor
- **WHEN** the reader scrolls to the end so the control disappears and then scrolls away without moving the cursor from a position inside the control's reappearing hit region
- **THEN** the first frame showing the control SHALL use its pointed-at presentation
- **AND** repeated hide-and-reveal cycles SHALL behave identically without an intervening mouse-motion report

#### Scenario: Wheel coordinates establish the cursor position
- **WHEN** no mouse-motion report has established a position and a wheel report detaches the viewport with coordinates inside the newly visible control
- **THEN** that first visible frame SHALL use its pointed-at presentation
- **AND** the wheel report SHALL only scroll rather than activate the control

#### Scenario: Update position while the control is hidden
- **WHEN** the control is hidden, a coordinate-bearing mouse report updates the cursor to a position outside its next hit region, and scrolling or keyboard navigation subsequently reveals it
- **THEN** the control SHALL use its normal presentation rather than retaining an earlier hover state

#### Scenario: Reveal through keyboard navigation
- **WHEN** keyboard navigation reveals the control and the latest known cursor position lies inside its current hit region
- **THEN** the first visible frame SHALL use its pointed-at presentation without an additional mouse report

#### Scenario: Recompute hover when the hit region changes
- **WHEN** terminal size, dock allocation, or the new-message label changes the visible control's hit region without mouse movement
- **THEN** the same frame SHALL use pointed-at presentation if the latest known cursor position is inside the new region and normal presentation otherwise
- **AND** a stale hit region SHALL NOT determine hover or subsequent activation

#### Scenario: No known cursor position after reset
- **WHEN** the viewport has received no pointer position or its pointer state has been reset and the control is shown before another coordinate-bearing mouse report
- **THEN** the control SHALL use its normal presentation
- **AND** pointer coordinates from a previous session SHALL NOT restore hover

#### Scenario: Render the generic and counted labels
- **WHEN** the detached control is rendered with zero, one, or multiple newly counted messages and the applicable label fits
- **THEN** its text SHALL be `Jump to bottom (Ctrl+End) ↓`, `1 new message (Ctrl+End) ↓`, or `N new messages (Ctrl+End) ↓` respectively
- **AND** both normal and pointed-at states SHALL retain the same shortcut hint and trailing arrow

#### Scenario: Hover and click the arrow
- **WHEN** the pointer is over the trailing `↓` of the visible control
- **THEN** the block SHALL use its pointed-at presentation
- **AND** clicking the arrow SHALL activate the same jump-to-bottom action as clicking the label text

#### Scenario: Fit a narrow terminal
- **WHEN** the full counted label exceeds the available width
- **THEN** the control SHALL use `Jump to bottom (Ctrl+End) ↓` if its complete padded label fits
- **AND** otherwise neither the control nor its hit region SHALL be present
- **AND** no label or arrow SHALL wrap, exceed terminal width, or reserve an extra row

### Requirement: Working status is a transient scrollable tail
Bare A1 SHALL place its live working-status surface, including status-owned blank spacing and retry, compaction, or extension working replacements, after the current transcript content inside the scrollable viewport. It SHALL have this ownership whether content fits or overflows. It SHALL NOT be pinned, duplicated in the dock, converted into persisted conversation content, counted as a completed assistant message, or treated as a submitted prompt. Only viewport-visible status rows SHALL be painted; scrolling away SHALL NOT terminate the underlying work or stop its lifecycle updates.

The tail SHALL contribute to scroll extent, scrollbar geometry, and end-following navigation while present. While detached, new transcript output and status animation or replacement SHALL preserve the current transcript position unless the new extent requires clamping to a valid scroll position. Removing the tail SHALL remove its status-owned spacing and leave no stale copy. Idle informational and failure messages SHALL retain their existing placement; only live working-state presentation SHALL move to this tail. The pinned `a1 pi` route SHALL retain its existing presentation and behavior.

#### Scenario: Scroll the active indicator out of view
- **WHEN** a long transcript is following its tail with `Working...` visible and the reader scrolls toward older content
- **THEN** the indicator SHALL move with the scrollable content and disappear once its rows leave the viewport
- **AND** no pinned copy or reserved dock space for the working status SHALL remain
- **AND** the editor and footer SHALL stay pinned

#### Scenario: Return to active work
- **WHEN** the reader scrolls to the end, presses `Ctrl+End` in the ordinary prompt context, or activates jump-to-bottom while work remains active
- **THEN** the viewport SHALL follow the complete current tail, including the working status
- **AND** the status SHALL be visible to the extent allowed by the viewport height
- **AND** the jump-to-bottom control SHALL disappear as following resumes

#### Scenario: Cross the fit boundary
- **WHEN** growing or shrinking transcript content causes the transcript plus working-status tail to cross the fit/overflow boundary
- **THEN** the status SHALL remain in the scrollable tail without moving between dock and transcript regions
- **AND** every frame SHALL paint exactly the visible portion of that one status surface, without a duplicate or a dropped visible status
- **AND** the editor/footer position SHALL NOT change solely because of that boundary crossing

#### Scenario: Update status while detached
- **WHEN** working animation ticks, the status is replaced by retry, compaction, or extension working content, or the status changes height while the reader is detached
- **THEN** the reader's transcript position SHALL remain unchanged whenever it is still a valid scroll position
- **AND** the newest status SHALL appear at the tail if the reader returns while it remains active
- **AND** an off-screen status update SHALL NOT paint a pinned indicator over the visible transcript or dock

#### Scenario: Finish work while detached
- **WHEN** the lifecycle removes the working status while the reader is away from the tail
- **THEN** the status and its owned spacing SHALL disappear from scroll extent without leaving historical or pinned remnants
- **AND** the viewport SHALL preserve the current transcript position when valid, otherwise clamp to the new end and resume following there
- **AND** returning to the end SHALL NOT resurrect the finished indicator

#### Scenario: Copy near the live tail
- **WHEN** a transcript selection is extended into or across visible working-status rows and copied
- **THEN** copied content SHALL include only selected transcript content, excluding the status text, spinner, and status-owned blank spacing
- **AND** no transcript highlight SHALL be applied to the status rows

#### Scenario: Keep queue and editor behavior independent
- **WHEN** pending input, widgets, a replacement input, or a footer update is present while the working status scrolls out of view
- **THEN** those dock surfaces SHALL retain their established lifecycle, focus, and input handling
- **AND** queued input SHALL remain docked rather than following the working status into the scrollable tail

#### Scenario: Reset or replace the session
- **WHEN** a session is reset, replaced, or disposed while a working-status tail is visible or off-screen
- **THEN** no status rows, status-owned scroll extent, pointer suppression, or stale status painting from that session SHALL survive into the next session

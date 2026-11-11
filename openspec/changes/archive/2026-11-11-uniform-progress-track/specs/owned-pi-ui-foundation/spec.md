## MODIFIED Requirements

### Requirement: The session command opens a reference screen in bare A1
Bare A1 SHALL declare `/session` as an A1-owned replacement for the pinned in-feed session-information document. The owned route host SHALL claim the route ahead of the pinned workflow table, obtain a fresh structured session-information snapshot for each invocation, and open Session Info in the Agent input dock using the established in-place Models and Skills presentation, not full screen or as a floating overlay. Invoking the command SHALL append no document, status, checkmark, error, or placeholder row to the feed.

The screen SHALL use `Session Info` as its accent title. It SHALL present the optional session Name followed by Folder, File, and ID as identity rows before the grouped report when a session path includes a folder. Folder SHALL retain the complete source directory and its trailing path separator; File SHALL contain only the complete basename. A basename without a folder SHALL need no Folder row, and an in-memory session SHALL retain `File: In-memory` without a Folder row. All report key/value rows SHALL share a left-aligned value column at feasible widths, including identity and grouped values. Cached and Uncached labels SHALL use the same left label edge as Input, Output, and Total; cost-breakdown nesting and semantic roles SHALL remain intact. Alignment SHALL use the labels actually present and SHALL reduce optional padding on narrow frames before wrapping content. Folder and File values SHALL begin on their labelled rows at the aligned column when space permits. Values that do not fit SHALL continue completely on subsequent rows without truncation; only a frame too narrow to leave any value column after a label MAY begin its value on the following row. `Messages`, `Tokens`, `Cache Warming`, and, when its existing condition is met, `Cost` SHALL be structured sections using the same shared bold yellow Markdown-heading role, one-cell left inset, content adjacency, inter-section spacing, and active-section pinning as the `Navigation` section of Keyboard Shortcuts and owned Settings. Apart from the declared Folder/File split and cache-label alignment, the report SHALL preserve the existing labels, values, calculations, conditional details, indentation, semantic label/value styles, complete value content across aligned wrapping, and group order.

The session screen SHALL retain the shared reference screen's keyboard, wheel, scrollbar rail, close, interrupt, resize, and viewport-restoration behavior within its input-dock rectangle. At usable heights, one blank visual row SHALL separate the content viewport from the scroll/close hints even while content overflows or is scrolled to the end. The transcript and ordinary session footer SHALL remain visible, and transcript pointer interaction outside the dialog SHALL remain available. Closing SHALL restore ordinary prompt input and focus without losing retained draft content or attachments. The `a1 pi` comparison profile SHALL keep the pinned `/session` workflow and chronological in-feed presentation and SHALL open no A1-owned session reference screen.

#### Scenario: Invoke the session command in bare A1
- **WHEN** the user submits `/session` in bare A1
- **THEN** the `Session Info` reference screen SHALL open in the input dock with a fresh snapshot, the editor SHALL be cleared, and the feed SHALL gain no rows
- **AND** closing the screen SHALL restore the prior session viewport without leaving a status or placeholder

#### Scenario: Render the session hierarchy
- **WHEN** the session report contains identity, message, token, cache-warming, and cost information
- **THEN** Name when present, Folder when present, File, and ID SHALL appear before the first section
- **AND** `Messages`, `Tokens`, `Cache Warming`, and `Cost` SHALL use the same shared section-header presentation as Keyboard Shortcuts' `Navigation` heading
- **AND** all existing report values, details, cost-breakdown indentation, order, and conditional rows SHALL remain complete

#### Scenario: Render a long session file path
- **WHEN** a session path contains a folder and a filename that fits the available value width
- **THEN** Folder SHALL show the directory with its original trailing separator and File SHALL show the intact basename on one labelled row
- **AND** a long folder SHALL wrap completely before the File row without splitting the filename across the folder's continuation rows

#### Scenario: Align report values
- **WHEN** Session Info presents identity, message, token, cache-warming, or cost label/value rows at a feasible width
- **THEN** the values SHALL begin in the same left-aligned column without right-aligning numeric values
- **AND** Cached and Uncached labels SHALL start at the same left label edge as Input, Output, and Total
- **AND** semantic styles, calculations, optional details, cost-breakdown indentation, and complete values SHALL remain intact
- **AND** constrained widths SHALL reduce optional alignment padding and wrap rather than truncate source content

#### Scenario: Omit conditional session information
- **WHEN** the session has no name and its existing cost and cache-waste condition does not require a Cost group
- **THEN** the Name row and Cost section SHALL be absent without blank placeholder content
- **AND** Folder when present, File, ID, Messages, Tokens, and Cache Warming SHALL retain their established values and order

#### Scenario: Reopen after session activity
- **WHEN** message, token, cost, or cache-warming state changes after the session screen was closed and the user invokes `/session` again
- **THEN** the reopened screen SHALL show a newly obtained snapshot rather than cached values from the earlier opening

#### Scenario: Scroll and close the session screen
- **WHEN** the session report overflows the available input-dock rectangle
- **THEN** keyboard, wheel, rail hover, thumb drag, and track paging SHALL scroll it with active section pinning
- **AND** a blank row SHALL remain between the content viewport and shortcut hints at usable heights
- **AND** Escape and the interrupt chord SHALL retain the shared reference-screen close and exit behavior without activating transcript controls through the dialog

#### Scenario: Invoke the session command in the comparison profile
- **WHEN** the user submits `/session` in `a1 pi`
- **THEN** the pinned workflow SHALL append the complete pinned session-information component at its chronological feed position
- **AND** no A1-owned reference screen SHALL open

#### Scenario: Keep conversation context visible
- **WHEN** Session Info is open in bare A1
- **THEN** its frame SHALL replace only the Agent input surface, with no full-screen takeover, floating panel, or dimmed backdrop
- **AND** the transcript and session footer SHALL remain visible with ordinary transcript scrolling, selection, and copying outside the dialog

#### Scenario: Resize and restore the input dock
- **WHEN** the terminal is compact or resizes while Session Info is open
- **THEN** the dialog SHALL stay bounded by the available input-dock dimensions with usable scrolling and close guidance
- **AND** closing SHALL restore ordinary prompt input and focus without losing any retained draft content or attachments

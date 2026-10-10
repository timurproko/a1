## MODIFIED Requirements

### Requirement: The session command opens a reference screen in bare A1
Bare A1 SHALL declare `/session` as an A1-owned replacement for the pinned in-feed session-information document. The owned route host SHALL claim the route ahead of the pinned workflow table, obtain a fresh structured session-information snapshot for each invocation, and open the shared reference screen full screen over the session. Invoking the command SHALL append no document, status, checkmark, error, or placeholder row to the feed.

The screen SHALL use `Session Info` as its accent title. It SHALL present the optional session Name followed by File and ID as identity rows before the grouped report. When the session file value fits on its identity row, it SHALL begin immediately after `File:`. When the complete value does not fit, it SHALL use the remaining visible columns after `File:` before continuing the complete, untruncated value on subsequent rows; only a frame too narrow to leave any value column after the label MAY begin the value on the following row. `Messages`, `Tokens`, `Cache Warming`, and, when its existing condition is met, `Cost` SHALL be structured sections using the same shared bold yellow Markdown-heading role, one-cell left inset, content adjacency, inter-section spacing, and active-section pinning as the `Navigation` section of Keyboard Shortcuts and owned Settings. The report SHALL preserve the existing labels, values, calculations, conditional details, indentation, semantic label/value styles, wrapping outside this declared File-row refinement, and group order.

The session screen SHALL retain the shared reference screen's keyboard, wheel, scrollbar rail, close, interrupt, resize, and viewport-restoration behavior. The `a1 pi` comparison profile SHALL keep the pinned `/session` workflow and chronological in-feed presentation and SHALL open no A1-owned session reference screen.

#### Scenario: Invoke the session command in bare A1
- **WHEN** the user submits `/session` in bare A1
- **THEN** the `Session Info` reference screen SHALL open with a fresh snapshot, the editor SHALL be cleared, and the feed SHALL gain no rows
- **AND** closing the screen SHALL restore the prior session viewport without leaving a status or placeholder

#### Scenario: Render the session hierarchy
- **WHEN** the session report contains identity, message, token, cache-warming, and cost information
- **THEN** Name when present, File, and ID SHALL appear before the first section
- **AND** `Messages`, `Tokens`, `Cache Warming`, and `Cost` SHALL use the same shared section-header presentation as Keyboard Shortcuts' `Navigation` heading
- **AND** all existing report values, details, indentation, order, and conditional rows SHALL remain complete

#### Scenario: Render a long session file path
- **WHEN** the session file value is longer than the visible space remaining after `File:`
- **THEN** the value SHALL begin directly after `File:` and fill that row's remaining visible columns
- **AND** the rest of the complete value SHALL continue on following rows before the ID row without truncation or an intervening blank row

#### Scenario: Omit conditional session information
- **WHEN** the session has no name and its existing cost and cache-waste condition does not require a Cost group
- **THEN** the Name row and Cost section SHALL be absent without blank placeholder content
- **AND** File, ID, Messages, Tokens, and Cache Warming SHALL retain their established values and order

#### Scenario: Reopen after session activity
- **WHEN** message, token, cost, or cache-warming state changes after the session screen was closed and the user invokes `/session` again
- **THEN** the reopened screen SHALL show a newly obtained snapshot rather than cached values from the earlier opening

#### Scenario: Scroll and close the session screen
- **WHEN** the session report overflows the available rectangle
- **THEN** keyboard, wheel, rail hover, thumb drag, and track paging SHALL scroll it with active section pinning
- **AND** Escape and the interrupt chord SHALL retain the shared reference-screen close and exit behavior without activating transcript controls through the screen

#### Scenario: Invoke the session command in the comparison profile
- **WHEN** the user submits `/session` in `a1 pi`
- **THEN** the pinned workflow SHALL append the complete pinned session-information component at its chronological feed position
- **AND** no A1-owned reference screen SHALL open

## ADDED Requirements

### Requirement: Bare-A1 Resume Session follows the standard dialog hierarchy

The bare-A1 Resume Session selector SHALL use the shared compact modal hierarchy of title, filter/status row, search and results, bottom shortcut footer, and bottom rule. Its title SHALL be the standalone accent-bold text `Resume Session` and SHALL NOT repeat the active scope as `(Current Folder)` or `(All)`.

The row immediately below the title SHALL begin with `Filter: current | all`, followed by `Name: all` or `Name: named` and `Sort: threaded`, `Sort: recent`, or `Sort: fuzzy`. Labels, separators, and inactive scope values SHALL use the established inactive status styling; the active scope and current name and sort values SHALL use the accent role. Values SHALL use the specified lower-case display text. The row SHALL remain stable during asynchronous scope loading and SHALL NOT append `loading` or loader work-unit counts to either scope value.

When all-session discovery supplies partial results, the result list SHALL update incrementally. Whenever the existing paging indicator is applicable, its `(selection/total)` total SHALL count the currently discovered sessions that match the active query and name filter, and SHALL grow as further matching sessions arrive. It SHALL NOT label that count as loading or substitute loader work-unit progress for the visible matching-result total.

Every selected session result SHALL use one continuous full-width selection background, regardless of the title or path length. When cwd or explicit path metadata is visible, every rendered row SHALL reserve a shared path column followed by separately aligned message-count and age columns. Session titles SHALL truncate before the path column with visible separation, and paths that exceed their bounded column SHALL truncate within that column rather than displacing the title, count, or age columns.

The selector's search-syntax and action shortcut hints SHALL appear below the session results, aligned to the same shared content inset as the title and status row. In the ordinary state the bottom rule SHALL immediately follow the final hint row. Delete confirmation, transient mutation status, and load errors SHALL use this bottom feedback area rather than replacing or joining the title/status rows. Existing search, scope switching, sorting, name filtering, path display, rename, deletion, selection, loading, cancellation, and result-list behavior SHALL remain available.

#### Scenario: Open Resume Session
- **WHEN** the user opens the bare-A1 Resume Session selector
- **THEN** the accent-bold title SHALL read `Resume Session` without a scope suffix
- **AND** the next row SHALL show `Filter: current | all`, the current lower-case `Name:` value, and the current lower-case `Sort:` value
- **AND** the active scope and current name and sort values SHALL use the accent role

#### Scenario: Switch the session scope
- **WHEN** the user switches between current-folder and all-session scope
- **THEN** the title SHALL remain `Resume Session`
- **AND** the accent role SHALL move to the active `current` or `all` filter value
- **AND** the filter row SHALL NOT gain a `loading` phrase or loader work-unit count

#### Scenario: Grow the all-session result count during discovery
- **WHEN** all-session discovery delivers successive batches of matching sessions
- **THEN** the visible result list SHALL update with each batch
- **AND** the existing paging indicator's total SHALL grow to the current matching-session count when paging applies
- **AND** the paging indicator SHALL remain plain `(selection/total)` text without a loading label

#### Scenario: Align session result metadata
- **WHEN** visible results contain different title and path lengths
- **THEN** every visible path SHALL begin in the shared path column
- **AND** message counts and ages SHALL remain aligned in their own trailing columns
- **AND** long titles SHALL truncate before the path column with visible separation
- **AND** long paths SHALL truncate within the path column

#### Scenario: Highlight a complete session result row
- **WHEN** a session result is selected
- **THEN** one continuous selection background SHALL cover the complete available row width
- **AND** moving selection between rows with different title or path lengths SHALL NOT change the highlight width

#### Scenario: Change session name and sort filters
- **WHEN** the user changes the named-session filter or sort mode
- **THEN** the `Name:` and `Sort:` values on the row below the title SHALL update using lower-case display text
- **AND** the updated current values SHALL use the accent role

#### Scenario: Read Resume Session shortcuts
- **WHEN** the ordinary Resume Session selector is visible
- **THEN** its search-syntax and action shortcut rows SHALL appear below the session results
- **AND** the title, filter/status row, and shortcut rows SHALL share the standard modal content inset
- **AND** the frame's bottom rule SHALL immediately follow the final shortcut row

#### Scenario: Confirm session deletion
- **WHEN** the user starts deletion of a selected session
- **THEN** the bottom feedback area SHALL replace ordinary shortcut hints with delete confirm/cancel guidance
- **AND** the title and filter/status rows SHALL remain in their standard positions

#### Scenario: Report session-selector status
- **WHEN** session loading fails or a session mutation reports transient success or failure
- **THEN** the message SHALL appear in the bottom feedback area
- **AND** it SHALL NOT be appended to or replace the stable title and filter/status row

#### Scenario: Use existing session operations
- **WHEN** the user searches, changes scope, sorts, filters by name, toggles paths, renames, deletes, selects, or cancels
- **THEN** the operation SHALL retain its existing behavior while the standard modal hierarchy remains in place

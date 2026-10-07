## MODIFIED Requirements

### Requirement: Bare-A1 Resume Session follows the standard dialog hierarchy

The bare-A1 Resume Session selector SHALL use the shared compact modal hierarchy of top rule, title, filter/status row, search and results, bottom shortcut footer, and bottom rule. Its full-width top and bottom rules SHALL use the same standard dialog border role as Session Tree and Models rather than the title accent role, including while rename mode is active. Its title SHALL be the standalone accent-bold text `Resume Session` and SHALL NOT repeat the active scope as `(Current Folder)` or `(All)`.

The row immediately below the title SHALL begin with `Filter: current | all`, followed by `Name: all` or `Name: named` and `Sort: threaded`, `Sort: recent`, or `Sort: fuzzy`. Labels, separators, and inactive scope values SHALL use the established inactive status styling; the active scope and current name and sort values SHALL use the accent role. Values SHALL use the specified lower-case display text. The row SHALL remain stable during asynchronous scope loading and SHALL NOT append `loading` or loader work-unit counts to either scope value.

When all-session discovery supplies partial results, the result list SHALL update incrementally. Whenever the existing paging indicator is applicable, its `(selection/total)` total SHALL count the currently discovered sessions that match the active query and name filter, and SHALL grow as further matching sessions arrive. It SHALL NOT label that count as loading or substitute loader work-unit progress for the visible matching-result total.

Every selected ordinary session result SHALL use the Session Tree's accent `→` arrow, success-green primary title without selected-title bolding, muted path/count/age metadata, and blue `selectedBg` selection background. A selected delete-confirmation result SHALL retain its error-colored primary title. The background SHALL form one continuous full-width selection, regardless of the title or path length. When cwd or explicit path metadata is visible, every rendered row SHALL reserve a shared path column followed by separately aligned message-count and age columns. Session titles SHALL truncate before the path column with visible separation, and paths that exceed their bounded column SHALL truncate within that column rather than displacing the title, count, or age columns.

The selector's search-syntax and action shortcut hints SHALL appear below the session results, aligned to the same shared content inset as the title and status row. Every ordinary or state-specific footer SHALL end with the canonical `Esc close` entry, preserving it completely by clipping preceding guidance first when width is constrained. In the ordinary state the bottom rule SHALL immediately follow the final hint row. Delete confirmation, transient mutation status, and load errors SHALL use this bottom feedback area rather than replacing or joining the title/status rows. Existing search, scope switching, sorting, name filtering, path display, rename, deletion, selection, loading, cancellation, and result-list behavior SHALL remain available.

#### Scenario: Open Resume Session
- **WHEN** the user opens the bare-A1 Resume Session selector
- **THEN** the accent-bold title SHALL read `Resume Session` without a scope suffix
- **AND** the next row SHALL show `Filter: current | all`, the current lower-case `Name:` value, and the current lower-case `Sort:` value
- **AND** the active scope and current name and sort values SHALL use the accent role

#### Scenario: Render standard dialog rules
- **WHEN** Resume Session or its rename mode is visible
- **THEN** the full-width top and bottom rules SHALL use the standard dialog border role used by Session Tree and Models
- **AND** the rules SHALL remain visually distinct from the accent title

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
- **WHEN** an ordinary session result is selected
- **THEN** it SHALL begin with the accent `→` arrow used by Session Tree
- **AND** its primary title SHALL use the same success-green role as a checkmark without selected-title bolding while path, count, and age remain muted
- **AND** the blue `selectedBg` selection background SHALL cover the complete available row width
- **AND** moving selection between rows with different title or path lengths SHALL NOT change the highlight width

#### Scenario: Change session name and sort filters
- **WHEN** the user changes the named-session filter or sort mode
- **THEN** the `Name:` and `Sort:` values on the row below the title SHALL update using lower-case display text
- **AND** the updated current values SHALL use the accent role

#### Scenario: Read Resume Session shortcuts
- **WHEN** the ordinary Resume Session selector is visible
- **THEN** its search-syntax and action shortcut rows SHALL appear below the session results
- **AND** the title, filter/status row, and shortcut rows SHALL share the standard modal content inset
- **AND** the final shortcut row SHALL end with `Esc close`
- **AND** the frame's bottom rule SHALL immediately follow the final shortcut row

#### Scenario: Confirm session deletion
- **WHEN** the user starts deletion of a selected session
- **THEN** the selected title SHALL use the error role on the blue full-width selection surface
- **AND** the bottom feedback area SHALL replace ordinary shortcut hints with delete-confirm guidance followed by `Esc close`
- **AND** it SHALL NOT expose a cancel action or implicit Ctrl+C alias
- **AND** the title and filter/status rows SHALL remain in their standard positions

#### Scenario: Report session-selector status
- **WHEN** session loading fails or a session mutation reports transient success or failure
- **THEN** the message SHALL appear in the bottom feedback area before the final `Esc close` entry
- **AND** it SHALL NOT be appended to or replace the stable title and filter/status row

#### Scenario: Use existing session operations
- **WHEN** the user searches, changes scope, sorts, filters by name, toggles paths, renames, deletes, selects, or cancels
- **THEN** the operation SHALL retain its existing behavior while the standard modal hierarchy remains in place

### Requirement: Bare-A1 Session Tree follows the standard dialog presentation

The bare-A1 Session Tree SHALL use the same compact framed hierarchy as the Models dialog. Exactly one empty visual row SHALL separate preceding transcript or status content from the tree's top rule. The top rule SHALL be followed immediately by an accent-bold `Session Tree` title, and the frame SHALL contain no separator rule between search and results.

The title SHALL be followed immediately by a Models-style `Filter: all | no tools | user | labeled` row using accent for the active mode and muted styling for inactive modes. The product `all` mode SHALL use the concise former-standard view: it SHALL show resolved entry labels while hiding raw label-change, context-edit, custom bookkeeping, session-info, usage, model-change, and thinking-level-change entries. An unset, upstream `default`, or upstream `all` initial setting SHALL open with product `all` active, while an explicitly configured `no tools`, `user`, or `labeled` mode SHALL remain active. `Tab` SHALL cycle the four product filters forward and replace `Ctrl+O` as the displayed/default cycle shortcut; the footer SHALL show `Tab filter` instead of the individual filter bindings. Hidden bookkeeping entries SHALL NOT contribute to the visible result counter.

The search control SHALL use the ordinary dialog input presentation, including its prompt icon and text-colored query, and SHALL NOT render a `Type to search:` label. Its cursor SHALL remain after the final typed character unless the user explicitly moves it. Existing tree search matching, the semantics of each filter mode, folding, navigation, copy, label, label-time, and horizontal clipping SHALL remain available. A row clipped at either horizontal edge SHALL show the single-character ellipsis `…` at that edge. On a selected row, every visible clipped fragment and ellipsis SHALL remain inside the selection highlight. A right-clipped bracketed tool row SHALL end with `…]` so its closing delimiter remains visible. `PageUp` and `PageDown` SHALL move by one visible page, `Home` and `End` SHALL select the first and last visible entries, and unmodified `Left` SHALL collapse the nearest expanded branch containing the cursor, even when a descendant is selected, and `Right` SHALL expand that branch after the collapsed view selects its branch root.

The selected tree entry SHALL use the ordinary menu arrow `→` in accent foreground and the blue `selectedBg` selection background, without whole-row bold treatment. Selection SHALL preserve the same semantic foreground and text-style roles rendered for that entry while unselected: entry labels and timestamps SHALL remain accent, `user:` SHALL remain green, `assistant:` SHALL remain yellow, system entries SHALL remain muted `session`, and tool, bash, error, description, dim, and italic content SHALL retain their existing roles. Tree entries SHALL NOT render active-path bullets. When label-time display is enabled, its timestamp SHALL be enclosed in square brackets. The result counter SHALL append plain `label time` status text without brackets or a leading plus sign. An empty search result SHALL show `No entries found` without a `(0/0)` counter.

The tree's semantic shortcut hints SHALL appear after the result area at the bottom of the frame, use the shared key/action styling, and have no trailing blank row before the bottom rule. Their order SHALL follow the Models dialog: `type to search`, vertical navigation, `Tab filter`, extended page/first-last/branch navigation, then copy and label actions. The footer SHALL omit an `Enter select` hint.

While editing an entry label, the frame title SHALL become accent-bold `Label`, followed immediately by a muted `Empty to remove` subheader. The standard single-line input SHALL follow after one blank row. The tree search control, results, filter/navigation shortcuts, and `Session Tree` title SHALL be hidden. Only the shared save/cancel shortcut footer SHALL remain, immediately followed by the bottom rule.

#### Scenario: Open the Session Tree below existing content
- **WHEN** the user opens `/tree` after transcript or status content is visible
- **THEN** exactly one empty visual row SHALL separate that content from the tree's top rule
- **AND** the accent-bold title SHALL immediately follow the top rule
- **AND** no internal rule SHALL separate the search control from the tree results

#### Scenario: Open and cycle the tree filter
- **WHEN** the Session Tree opens without an explicitly configured non-default filter
- **THEN** the Models-style filter row SHALL show `all` as active
- **AND WHEN** the user presses `Tab`
- **THEN** the next filter SHALL become active
- **AND** the shortcut footer SHALL show `Tab filter` without `Ctrl+O` filter-cycle guidance

#### Scenario: Keep product all concise
- **WHEN** the Session Tree contains resolved entry labels and raw bookkeeping entries
- **THEN** product `all` SHALL show each resolved label on its target entry
- **AND** raw label-change, context-edit, custom bookkeeping, session-info, usage, model-change, and thinking-level-change entries SHALL NOT render
- **AND** the filter row SHALL NOT offer a separate `standard` mode or raw-bookkeeping `all` mode
- **AND** the visible result counter SHALL exclude hidden bookkeeping entries

#### Scenario: Navigate and fold the tree with standard keys
- **WHEN** the user presses `PageUp`, `PageDown`, `Home`, or `End`
- **THEN** `PageUp` and `PageDown` SHALL move selection and the visible result window by one page, while `Home` and `End` SHALL select the first or last visible entry respectively
- **AND WHEN** any entry within an expanded branch is selected and the user presses `Left`
- **THEN** the nearest containing branch SHALL collapse and selection SHALL resolve to its visible branch root
- **AND WHEN** the user then presses `Right`
- **THEN** that branch SHALL expand without moving selection to another branch

#### Scenario: Clip a long tree row
- **WHEN** a tree item extends beyond the left or right edge
- **THEN** each clipped edge SHALL show the single-character ellipsis `…`
- **AND** a selected clipped row SHALL keep its complete visible fragment, including ellipses, selected
- **AND** a right-clipped bracketed tool row SHALL end in `…]`

#### Scenario: Search the tree
- **WHEN** the Session Tree is open and the user types a search query
- **THEN** the search row SHALL show the ordinary input prompt icon and text-colored query without `Type to search:`
- **AND** the cursor SHALL appear after the final typed character unless the user moved it
- **AND** the tree SHALL retain its existing search and filter behavior

#### Scenario: Highlight an entry
- **WHEN** a tree entry is selected
- **THEN** the row SHALL begin with the ordinary menu arrow `→` in accent foreground
- **AND** every primary and descriptive fragment SHALL retain that entry's existing semantic foreground and text-style role
- **AND** the selected span SHALL use the blue `selectedBg` background
- **AND** no active-path bullet or whole-row bold treatment SHALL be applied

#### Scenario: Distinguish message roles and entry labels
- **WHEN** labeled user, assistant, and system entries are visible in selected or unselected state
- **THEN** the entry label SHALL use the theme accent color
- **AND** any enabled label timestamp SHALL use the same accent color and square-bracket form
- **AND** the result counter SHALL show plain `label time` rather than `[+label time]`
- **AND** `user:` SHALL be green and `assistant:` SHALL be yellow
- **AND** the system entry SHALL read `session`

#### Scenario: Read tree shortcut hints
- **WHEN** the ordinary Session Tree is visible
- **THEN** its footer SHALL begin with typing guidance, vertical navigation, and `Tab filter` in that order
- **AND** it SHALL omit an `Enter select` hint
- **AND** page, first/last, branch, copy, and label guidance SHALL follow

#### Scenario: Edit an entry label
- **WHEN** the user opens label editing for a tree entry
- **THEN** the frame SHALL show the accent-bold title `Label` and muted subheader `Empty to remove`
- **AND** one standard single-line input SHALL be visible without the tree search or results
- **AND** only save and cancel shortcut hints SHALL be visible immediately above the bottom rule

#### Scenario: Search with no matches
- **WHEN** the current query matches no tree entries
- **THEN** the result area SHALL show `No entries found`
- **AND** it SHALL NOT show `(0/0)`

#### Scenario: Render tree shortcuts
- **WHEN** the Session Tree renders navigation and action hints
- **THEN** those hints SHALL use the shared shortcut-row key/action styles below the result area
- **AND** the next rendered row SHALL be the frame's bottom rule

### Requirement: Setting-controlled owned surfaces preserve pinned Pi visual semantics
For the same terminal dimensions, theme, capabilities, semantic content, setting values, and lifecycle state, every visible surface controlled by a Pi setting SHALL match pinned Pi's terminal-cell presentation. Parity SHALL include visible text and punctuation, semantic foreground and background styling, bold/dim/italic/underline roles, borders, padding, blank rows, row order, wrapping, truncation, alignment, editor and footer geometry, cursor placement, and terminal-control ordering. Declared product identity, A1-only setting content, hidden bare-A1 entries, the owned settings interaction contract including its distinct floating scalar menus, profile/session values, dynamic usage data, absolute link targets, and nondeterministic render timing MAY differ; no other visual difference is implicit.

#### Scenario: Render a setting-controlled frame
- **WHEN** bare A1 and pinned Pi receive equivalent content and lifecycle events with the same visible setting value and terminal dimensions
- **THEN** their normalized terminal cells, semantic ANSI roles, geometry, and control ordering SHALL match except for declared substitutions

#### Scenario: Render the owned settings surface
- **WHEN** A1 presents its A1 and Agent settings sections
- **THEN** rows, values, selected state, numeric controls, menus, dialogs, notices, padding, wrapping, clipping, and narrow-terminal behavior SHALL retain the reviewed shared-component semantics
- **AND** selected settings SHALL use an accent arrow, normal-`text` label, semantic value foreground, and item-bounded blue `selectedBg` surface
- **AND** selected-entry descriptions SHALL remain model metadata without rendering description rows
- **AND** search SHALL remain closed until `/` is invoked, then render through the shared ruled line-input composition with its search placeholder
- **AND** ordinary printable input outside an open search SHALL not become a query
- **AND** the standing status bar SHALL derive its visible guidance from the active settings shortcut declarations
- **AND** settings-list wheel movement SHALL use the current effective `scrollbarSpeed` through the shared scrollbar distance policy, including a pending live selection, without an independent row-count literal
- **AND** a scalar menu SHALL retain shared `ValueMenu` geometry and input behavior while rendering unselected choices on A1's dark floating-panel background, the active choice on blue `selectedBg` with normal text, and `✓` beside the effective value independently of the active choice
- **AND** A1-specific grouping, hidden entries, and this owned settings interaction SHALL remain declared product differences

#### Scenario: Present project trust before loading project resources
- **WHEN** an undecided interactive launch requires a trust decision
- **THEN** the bounded preflight SHALL present a pinned-style startup selector with equivalent focus, accept, reject, cancel, clear, and terminal-restoration behavior
- **AND** no project-derived presentation or executable resource SHALL load before the decision

#### Scenario: Compare automated visual evidence
- **WHEN** automated parity evidence is evaluated
- **THEN** it SHALL compare independent pinned and A1 producers without stripping semantic SGR styling or replacing geometry with text-only snapshots

#### Scenario: Claim final visual acceptance
- **WHEN** deterministic parity checks pass
- **THEN** user-controlled physical-terminal comparison SHALL still verify the claimed terminal's rasterized result, selection, resize, cursor, restoration, and supported image behavior

## ADDED Requirements

### Requirement: Standard bare-A1 lists share one selection palette

The bare-A1 Models, Skills, Thinking Level, Resume Session, Session Tree, Settings, and editor autocomplete menus SHALL preserve their existing cursor and meaningful semantic foreground roles when selected. Every covered surface SHALL use the blue `selectedBg` selection background. Models, Skills, Thinking Level, Settings, and autocomplete SHALL retain their ordinary menu arrow `→` in accent foreground, a primary label in normal `text`, and muted descriptive text. Resume Session SHALL use an accent arrow, success-green selected title, and muted metadata, while Session Tree SHALL retain each entry's item-specific foreground and text-style roles. Selection SHALL NOT introduce bold styling. On item-bounded surfaces, the selected background SHALL cover only the rendered item span from its arrow through its final visible content cell, SHALL NOT fill otherwise unused cells after the item, and SHALL remain clipped within the available width without causing wrapping. Resume Session SHALL retain its established full-row selection geometry.

The selected-item treatment SHALL preserve domain-specific semantic markers and content. Models SHALL retain its scoped/unscoped marker, provider badge, and active-model checkmark. Skills SHALL retain its `skill:<name>` label and separately presented selected description. Thinking Level SHALL retain aligned level, current, default, and reasoning-description columns. Settings SHALL retain aligned labels and values, steppers, structured-value rows, floating choices, scrolling, search, and pointer affordances. Autocomplete SHALL retain aligned command descriptions and completion behavior. Session Tree SHALL retain its hierarchy, semantic entry roles, horizontal viewport, and clipped-edge markers. Resume Session SHALL retain its specialized arrow, metadata, and full-row geometry.

Unselected rows, search and filter behavior, list ordering, counters, descriptions, navigation, selection actions, default and scope persistence, cancellation, and dialog lifecycle SHALL remain unchanged. The explicit `a1 pi` comparison profile SHALL retain pinned Pi presentation.

#### Scenario: Highlight a model

- **WHEN** a model row is selected in the Models dialog
- **THEN** its arrow SHALL use accent foreground and its model identifier SHALL use normal `text` on `selectedBg`
- **AND** its provider badge SHALL remain muted and its scope and active-state markers SHALL retain their semantic roles
- **AND** the background SHALL end with the row's final marker or provider content without changing the row order or model action

#### Scenario: Highlight a skill

- **WHEN** a skill row is selected in the Skills dialog
- **THEN** its arrow SHALL use accent foreground and its `skill:<name>` label SHALL use normal `text` on `selectedBg`
- **AND** the background SHALL end with the final character of the `skill:<name>` label
- **AND** the selected skill description SHALL remain separately muted below the list

#### Scenario: Highlight a thinking level

- **WHEN** a thinking-level row is selected
- **THEN** its arrow SHALL use accent foreground and its level SHALL use normal `text` on `selectedBg`
- **AND** its reasoning description SHALL remain muted while current and default markers retain their semantic roles
- **AND** the aligned columns, selected value, and Enter and Space actions SHALL remain unchanged

#### Scenario: Highlight a Resume Session entry

- **WHEN** a Resume Session entry is selected
- **THEN** its accent cursor and muted metadata SHALL remain unchanged while its full row uses blue `selectedBg`
- **AND** its primary title SHALL use the same success-green role as a checkmark without becoming bold
- **AND** search, scope, sort, rename, delete, navigation, and selection behavior SHALL remain unchanged

#### Scenario: Highlight a Session Tree entry

- **WHEN** a Session Tree entry is selected
- **THEN** its existing `→` SHALL remain accent-colored and every entry fragment SHALL keep the same semantic foreground and text-style role it has while unselected on `selectedBg`
- **AND** the background SHALL cover every visible selected fragment and clipped-edge ellipsis without changing tree hierarchy or viewport behavior

#### Scenario: Highlight a setting

- **WHEN** a row is selected in the bare-A1 Settings screen, a structured-value panel, or a floating choice menu
- **THEN** its existing arrow or marker SHALL remain accent-colored, its primary label SHALL use normal `text`, and its value SHALL retain its normal semantic foreground on `selectedBg`
- **AND** the background SHALL end with the final visible value or control cell without filling unused screen width
- **AND** navigation, search, scrolling, pointer actions, and value persistence SHALL remain unchanged

#### Scenario: Highlight a slash command

- **WHEN** a command is selected in the bare-A1 `/` menu
- **THEN** its existing `→` SHALL remain accent-colored, its command label SHALL use normal `text`, and its description SHALL remain muted on `selectedBg`
- **AND** the background SHALL end with the final visible command or description character
- **AND** navigation and completion behavior SHALL remain unchanged

#### Scenario: Render a selected row at narrow width

- **WHEN** any covered item-bounded list renders its selected row with less width than the complete content requires
- **THEN** the row SHALL remain single-line and ANSI-aware clipped within the available content width
- **AND** every visible item cell SHALL retain the selection background
- **AND** cells after the visible item SHALL remain outside the selection background
- **AND** no rendered row SHALL exceed the frame width

#### Scenario: Render an unselected row

- **WHEN** a covered row is not selected
- **THEN** it SHALL retain its existing semantic foreground roles without the selected background or whole-row bold styling

#### Scenario: Use the pinned comparison profile

- **WHEN** the user runs the explicit `a1 pi` comparison profile
- **THEN** pinned Pi selector presentation SHALL remain unchanged by the bare-A1 selected-row treatment

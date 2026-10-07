## MODIFIED Requirements

### Requirement: Bare-A1 Resume Session follows the standard dialog hierarchy

The bare-A1 Resume Session selector SHALL use the shared compact modal hierarchy of top rule, title, filter/status row, search and results, bottom shortcut footer, and bottom rule. The owned selector SHALL NOT add a component-level blank row before its top rule, so a retained prompt-adjacent command notice has exactly one empty visual row before the dialog while it is open, matching the spacing after the default editor is restored. Its full-width top and bottom rules SHALL use the same standard dialog border role as Session Tree and Models rather than the title accent role, including while rename mode is active. Its title SHALL be the standalone accent-bold text `Resume Session` and SHALL NOT repeat the active scope as `(Current Folder)` or `(All)`.

The row immediately below the title SHALL begin with `Filter: current | all`, followed by `Name: all` or `Name: named` and `Sort: threaded`, `Sort: recent`, or `Sort: fuzzy`. Labels, separators, and inactive scope values SHALL use the established inactive status styling; the active scope and current name and sort values SHALL use the accent role. Values SHALL use the specified lower-case display text. The row SHALL remain stable during asynchronous scope loading and SHALL NOT append `loading` or loader work-unit counts to either scope value.

When all-session discovery supplies partial results, the result list SHALL update incrementally. Whenever the existing paging indicator is applicable, its `(selection/total)` total SHALL count the currently discovered sessions that match the active query and name filter, and SHALL grow as further matching sessions arrive. It SHALL NOT label that count as loading or substitute loader work-unit progress for the visible matching-result total.

Every selected ordinary session result SHALL use the Session Tree's accent `→` arrow and blue `selectedBg` selection background while retaining the same title and path/count/age foreground roles it has when unselected, without selected-title bolding. The currently active session title SHALL use the success-green role associated with an active checkmark independently of keyboard selection. A selected delete-confirmation result SHALL retain its error-colored primary title and metadata. The background SHALL form one continuous full-width selection, regardless of the title or path length. When cwd or explicit path metadata is visible, every rendered row SHALL reserve a shared path column followed by separately aligned message-count and age columns. Session titles SHALL truncate before the path column with visible separation, and paths that exceed their bounded column SHALL truncate within that column rather than displacing the title, count, or age columns.

While the ordinary search query is empty, its input SHALL show the exact presentation-only placeholder `re:<pattern> regex, "phrase" exact`. The comma after `regex` SHALL visibly separate the regular-expression form from the quoted exact-phrase form. Placeholder text after the caret SHALL use the established quiet search-suggestion treatment, while the active reversed caret cell SHALL retain the ordinary neutral-white input weight used by Settings search rather than inheriting the grey suggestion weight. The caret SHALL occupy the placeholder's first cell, and the placeholder SHALL NOT become part of the query. Entering a real query SHALL replace the placeholder while preserving existing fuzzy, regex, and exact-phrase matching behavior.

The ordinary shortcut footer SHALL appear below the session results as one semantic row aligned to the same shared content inset as the title and status row. Its entries SHALL be ordered as `Type search`, vertical navigation, `Enter select`, `Tab scope`, sort, named filtering, delete, path display with current state, optional rename, and `Esc close`. Keys and actions SHALL use the shared shortcut roles. The footer SHALL preserve the canonical `Esc close` entry completely by clipping preceding guidance first when width is constrained, and SHALL NOT wrap into a second ordinary hint row. The bottom rule SHALL immediately follow that row. Delete confirmation, transient mutation status, and load errors SHALL continue to use the bottom feedback area rather than replacing or joining the title/status rows. Existing search, scope switching, sorting, name filtering, path display, rename, deletion, selection, loading, cancellation, and result-list behavior SHALL remain available.

#### Scenario: Open Resume Session
- **WHEN** the user opens the bare-A1 Resume Session selector
- **THEN** the accent-bold title SHALL read `Resume Session` without a scope suffix
- **AND** the next row SHALL show `Filter: current | all`, the current lower-case `Name:` value, and the current lower-case `Sort:` value
- **AND** the active scope and current name and sort values SHALL use the accent role

#### Scenario: Preserve compact spacing after a resume notice
- **WHEN** the `Resumed session` command notice remains visible and the user opens Resume Session again
- **THEN** exactly one empty visual row SHALL separate the notice from the dialog's top rule
- **AND** closing the dialog SHALL restore the editor with the same one-empty-row notice-to-control spacing

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
- **AND** its primary title, path, count, and age SHALL retain the same semantic foreground roles they have while unselected without selected-title bolding
- **AND** the currently active session title SHALL remain success green whether or not that row is selected
- **AND** the blue `selectedBg` selection background SHALL cover the complete available row width
- **AND** moving selection between rows with different title or path lengths SHALL NOT change the highlight width

#### Scenario: Change session name and sort filters
- **WHEN** the user changes the named-session filter or sort mode
- **THEN** the `Name:` and `Sort:` values on the row below the title SHALL update using lower-case display text
- **AND** the updated current values SHALL use the accent role

#### Scenario: Read empty Resume Session search guidance
- **WHEN** the ordinary Resume Session search query is empty
- **THEN** its input SHALL show `re:<pattern> regex, "phrase" exact` with quiet suggestion styling after the caret
- **AND** the comma SHALL separate the regex and exact-phrase descriptions
- **AND** the placeholder SHALL remain presentation-only with the caret on its first cell
- **AND** that active reversed caret cell SHALL use ordinary neutral-white input weight rather than the grey suggestion weight

#### Scenario: Enter a Resume Session query
- **WHEN** the user types into the Resume Session search input
- **THEN** the real query SHALL replace the placeholder without inheriting its styling or content
- **AND** fuzzy, `re:` regex, and quoted exact-phrase matching SHALL retain their existing semantics

#### Scenario: Read Resume Session shortcuts
- **WHEN** the ordinary Resume Session selector is visible at a width that fits every shortcut
- **THEN** one footer row SHALL show `Type search`, vertical navigation, `Enter select`, `Tab scope`, sort, named filtering, delete, path state, optional rename, and `Esc close` in that order
- **AND** the title, filter/status row, search input, and shortcut row SHALL share the standard modal content inset
- **AND** the frame's bottom rule SHALL immediately follow the single shortcut row

#### Scenario: Constrain Resume Session shortcuts
- **WHEN** the ordinary Resume Session shortcut row does not fit the available width
- **THEN** it SHALL remain one row and preserve the complete `Esc close` suffix
- **AND** preceding entries SHALL be clipped before the close suffix rather than wrapping to another row

#### Scenario: Confirm session deletion
- **WHEN** the user starts deletion of a selected session
- **THEN** the selected title and metadata SHALL use the error role on the blue full-width selection surface
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

### Requirement: Standard bare-A1 lists share one selection palette

The bare-A1 Models, Skills, Thinking Level, Resume Session, Session Tree, Settings, and editor autocomplete menus SHALL preserve their existing cursor and meaningful semantic foreground roles when selected. Every covered surface SHALL use the blue `selectedBg` selection background. Models, Skills, Thinking Level, Settings, and autocomplete SHALL retain their ordinary menu arrow `→` in accent foreground, a primary label in normal `text`, and muted descriptive text. Resume Session SHALL use an accent arrow, preserve each title and metadata foreground role under keyboard selection, and render only its currently active session title in success green, while Session Tree SHALL retain each entry's item-specific foreground and text-style roles. Selection SHALL NOT introduce bold styling. On item-bounded surfaces, the selected background SHALL cover only the rendered item span from its arrow through its final visible content cell, SHALL NOT fill otherwise unused cells after the item, and SHALL remain clipped within the available width without causing wrapping. Resume Session SHALL retain its established full-row selection geometry.

The selected-item treatment SHALL preserve domain-specific semantic markers and content. Models SHALL retain its scoped/unscoped marker, provider badge, and active-model checkmark. Skills SHALL retain its `skill:<name>` label and separately presented selected description. Thinking Level SHALL retain aligned level, current, default, and reasoning-description columns. Settings SHALL retain aligned labels and values, steppers, structured-value rows, floating choices, scrolling, search, and pointer affordances. Autocomplete SHALL retain aligned command descriptions and completion behavior. Session Tree SHALL retain its hierarchy, semantic entry roles, horizontal viewport, and clipped-edge markers. Resume Session SHALL retain its specialized arrow, metadata, active-session identity, and full-row geometry.

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
- **THEN** its accent cursor SHALL appear while its title and metadata retain the same semantic foreground roles they have while unselected on the full-row blue `selectedBg`
- **AND** the currently active session title SHALL use the same success-green role as a checkmark independently of keyboard selection and without becoming bold
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

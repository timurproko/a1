## MODIFIED Requirements

### Requirement: Bare-A1 Session Tree follows the standard dialog presentation

The bare-A1 Session Tree SHALL use the same compact framed hierarchy as the Models dialog. Exactly one empty visual row SHALL separate preceding transcript or status content from the tree's top rule. The top rule SHALL be followed immediately by an accent-bold `Session Tree` title, and the frame SHALL contain no separator rule between search and results.

The title SHALL be followed immediately by a Models-style `Filter: all | no tools | user | labeled` row using accent for the active mode and muted styling for inactive modes. The product `all` mode SHALL use the concise former-standard view: it SHALL show resolved entry labels while hiding raw label-change, context-edit, custom bookkeeping, session-info, usage, model-change, and thinking-level-change entries. An unset, upstream `default`, or upstream `all` initial setting SHALL open with product `all` active, while an explicitly configured `no tools`, `user`, or `labeled` mode SHALL remain active. `Tab` SHALL cycle the four product filters forward and replace `Ctrl+O` as the displayed/default cycle shortcut; the footer SHALL show `Tab filter` instead of the individual filter bindings. Hidden bookkeeping entries SHALL NOT contribute to the visible result counter.

The search control SHALL use the ordinary dialog input presentation, including its prompt icon and text-colored query, and SHALL NOT render a `Type to search:` label. Its cursor SHALL remain after the final typed character unless the user explicitly moves it. Existing tree search matching, the semantics of each filter mode, folding, navigation, copy, label, label-time, and horizontal clipping SHALL remain available. A row clipped at either horizontal edge SHALL show the single-character ellipsis `…` at that edge. On a selected row, every visible clipped fragment and ellipsis SHALL remain inside the selection highlight. A right-clipped bracketed tool row SHALL end with `…]` so its closing delimiter remains visible. `PageUp` and `PageDown` SHALL move by one visible page, and `Home` and `End` SHALL select the first and last visible entries. The persisted top-level session/system root SHALL remain permanently expanded and SHALL NOT be a Left/Right fold target. Unmodified `Left` SHALL collapse the nearest expanded eligible non-root branch containing the cursor, even when a descendant is selected; if no such branch exists, it SHALL leave the tree and selection unchanged. `Right` SHALL expand an eligible branch after the collapsed view selects its branch root and SHALL leave the session root unchanged. Root eligibility SHALL follow persisted ancestry rather than visible ancestry, so filtering out the system row SHALL NOT by itself disable folding for an otherwise eligible non-root branch.

The selected tree entry SHALL use the ordinary menu arrow `→` with the subtle purple accent-tinted selection background. Its primary entry label SHALL be highlighted while message content serving as its description SHALL remain muted, without whole-row bold treatment. Tree entries SHALL NOT render active-path bullets. Entry labels SHALL use the theme accent color. When label-time display is enabled, its timestamp SHALL be enclosed in square brackets and use the same accent color as the label. The result counter SHALL append plain `label time` status text without brackets or a leading plus sign. Unselected `user:` labels SHALL be green, unselected `assistant:` labels SHALL be yellow, and system entries SHALL render as muted `session`. An empty search result SHALL show `No entries found` without a `(0/0)` counter.

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
- **AND WHEN** any entry within an eligible expanded non-root branch is selected and the user presses `Left`
- **THEN** the nearest eligible non-root branch SHALL collapse and selection SHALL resolve to its visible branch root
- **AND WHEN** the user then presses `Right`
- **THEN** that branch SHALL expand without moving selection to another branch

#### Scenario: Keep the session root expanded from the root
- **WHEN** the top-level `session` entry is selected and the user presses `Left` or `Right`
- **THEN** the root SHALL remain expanded
- **AND** the visible rows and selection SHALL remain unchanged

#### Scenario: Do not fall through to the session root
- **WHEN** a descendant is selected and the top-level session root is the only containing entry that would otherwise qualify for folding
- **AND** the user presses `Left`
- **THEN** the Session Tree SHALL remain expanded instead of collapsing to the single `session` row
- **AND** selection SHALL remain on the selected descendant

#### Scenario: Preserve branch folding when filters hide the system row
- **WHEN** a filter hides the persisted session root and an eligible non-root branch appears at the visible root
- **THEN** that branch SHALL retain its existing collapse and expansion behavior
- **AND** visible-root placement alone SHALL NOT classify it as the persisted session root

#### Scenario: Clip a long tree row
- **WHEN** a tree item extends beyond the left or right edge
- **THEN** each clipped edge SHALL show the single-character ellipsis `…`
- **AND** a selected clipped row SHALL keep its complete visible fragment, including ellipses, selected
- **AND** a right-clipped bracketed tool row SHALL end with `…]`

#### Scenario: Search the tree
- **WHEN** the Session Tree is open and the user types a search query
- **THEN** the search row SHALL show the ordinary input prompt icon and text-colored query without `Type to search:`
- **AND** the cursor SHALL appear after the final typed character unless the user moved it
- **AND** the tree SHALL retain its existing search and filter behavior

#### Scenario: Highlight an entry
- **WHEN** a tree entry is selected
- **THEN** the row SHALL begin with the ordinary menu arrow `→`
- **AND** only its primary label SHALL receive selected emphasis while descriptive message text remains muted
- **AND** the selected span SHALL use the subtle purple accent-tinted background
- **AND** no active-path bullet or whole-row bold treatment SHALL be applied

#### Scenario: Distinguish message roles and entry labels
- **WHEN** labeled, unselected user, assistant, and system entries are visible
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

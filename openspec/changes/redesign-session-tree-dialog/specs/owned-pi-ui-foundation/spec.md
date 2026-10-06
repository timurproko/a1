## ADDED Requirements

### Requirement: Bare-A1 Session Tree follows the standard dialog presentation

The bare-A1 Session Tree SHALL use the same compact framed hierarchy as the Models dialog. Exactly one empty visual row SHALL separate preceding transcript or status content from the tree's top rule. The top rule SHALL be followed immediately by an accent-bold `Session Tree` title, and the frame SHALL contain no separator rule between search and results.

The title SHALL be followed immediately by a Models-style `Filter: all | standard | no tools | user | labeled` row using accent for the active mode and muted styling for inactive modes. An unset or `default` initial setting SHALL open with `all` active, while an explicitly configured non-default mode SHALL remain active. `Tab` SHALL cycle filters forward and replace `Ctrl+O` as the displayed/default cycle shortcut; the footer SHALL show `Tab filter` instead of the individual filter bindings. Model-change and thinking-level-change metadata entries SHALL remain hidden in every filter mode, including `all`, and SHALL NOT contribute to the visible result counter.

The search control SHALL use the ordinary dialog input presentation, including its prompt icon and text-colored query, and SHALL NOT render a `Type to search:` label. Its cursor SHALL remain after the final typed character unless the user explicitly moves it. Existing tree search matching, the semantics of each filter mode, folding, navigation, copy, label, label-time, and horizontal clipping SHALL remain available. `PageUp` and `PageDown` SHALL move by one visible page, `Home` and `End` SHALL select the first and last visible entries, and unmodified `Left` and `Right` SHALL collapse and expand the branch under the cursor when that action is available.

The selected tree entry SHALL use the ordinary menu arrow `→` with the subtle purple accent-tinted selection background. Its primary entry label SHALL be highlighted while message content serving as its description SHALL remain muted, without whole-row bold treatment. Tree entries SHALL NOT render active-path bullets. Entry labels SHALL use the theme accent color. Unselected `user:` labels SHALL be green, unselected `assistant:` labels SHALL be yellow, and system entries SHALL render as muted `system` without square brackets. An empty search result SHALL show `No entries found` without a `(0/0)` counter.

The tree's semantic shortcut hints SHALL appear after the result area at the bottom of the frame, use the shared key/action styling, and have no trailing blank row before the bottom rule.

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

#### Scenario: Exclude model and thinking metadata
- **WHEN** the Session Tree contains model-change or thinking-level-change entries
- **THEN** those entries SHALL NOT render in any filter mode, including `all`
- **AND** the visible result counter SHALL exclude them

#### Scenario: Navigate and fold the tree with standard keys
- **WHEN** the user presses `PageUp`, `PageDown`, `Home`, or `End`
- **THEN** selection SHALL move by one visible page, one visible page, to the first visible entry, or to the last visible entry respectively
- **AND WHEN** the selected entry is an expandable branch and the user presses `Left` or `Right`
- **THEN** that selected branch SHALL collapse or expand respectively without moving selection to another branch

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
- **AND** `user:` SHALL be green and `assistant:` SHALL be yellow
- **AND** the system entry SHALL read `system` without square brackets

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

### Requirement: Session-tree nested dialogs transition without exposing the prompt

When a non-current tree entry requires a branch-summary choice, bare A1 SHALL replace the Session Tree directly with the summary-choice dialog without rendering the ordinary prompt between them. Cancellation SHALL restore the tree with the selected entry retained. A skipped summary choice SHALL retain the existing direct navigation behavior.

The branch-summary choice SHALL retain its title, options, navigation, selection, and cancellation behavior. Its semantic shortcut footer SHALL use the shared dialog style at the bottom of the frame, and the frame's bottom rule SHALL immediately follow that footer without an empty row.

Custom summarization instructions SHALL use the ordinary single-line dialog input pattern instead of the multiline editor. The prompt SHALL have an accent-bold title, the standard input prompt and cursor behavior, and only the shared submit/cancel shortcut hints. The bottom rule SHALL immediately follow those hints without an empty row.

After successful tree navigation, bare A1 SHALL rebuild the visible transcript from the newly selected branch and restore the ordinary input surface for that point. When Pi returns editor text for a selected user-message point and the input has no non-whitespace draft, the input SHALL be populated with that text and its cursor SHALL be placed at the end; otherwise the existing editor draft SHALL remain intact. Model and thinking state SHALL reconcile to the selected branch.

#### Scenario: Open the branch-summary choice
- **WHEN** the user selects a non-current tree entry and summary prompting is enabled
- **THEN** the branch-summary choice SHALL replace the tree directly
- **AND** no intermediate frame SHALL expose or flash the ordinary prompt

#### Scenario: Cancel the branch-summary choice
- **WHEN** the user cancels the branch-summary choice
- **THEN** the Session Tree SHALL be restored with the chosen entry selected
- **AND** no intermediate frame SHALL expose or flash the ordinary prompt

#### Scenario: Complete tree navigation
- **WHEN** navigation to a selected tree entry completes
- **THEN** the content area SHALL show the selected branch transcript
- **AND** the ordinary editor SHALL be visible
- **AND** a selected user-message prompt returned by Pi SHALL populate an empty editor with its cursor at the end
- **AND** navigation without returned prompt text, or with an existing non-whitespace draft, SHALL preserve the existing draft

#### Scenario: Render branch-summary shortcuts
- **WHEN** the branch-summary choice is visible
- **THEN** its shortcut hints SHALL use the shared dialog key/action styling at the bottom of the frame
- **AND** its bottom rule SHALL immediately follow the hint row

#### Scenario: Enter custom summarization instructions
- **WHEN** the user selects `Summarize with custom prompt`
- **THEN** an accent-bold `Custom summarization instructions` title SHALL appear above a standard single-line input
- **AND** the shortcut footer SHALL contain submit and cancel actions without newline or external-editor actions
- **AND** the frame's bottom rule SHALL immediately follow the shortcut footer

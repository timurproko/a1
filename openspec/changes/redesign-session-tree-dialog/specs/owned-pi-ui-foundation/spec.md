## ADDED Requirements

### Requirement: Bare-A1 Session Tree follows the standard dialog presentation

The bare-A1 Session Tree SHALL use the same compact framed hierarchy as the Models dialog. Exactly one empty visual row SHALL separate preceding transcript or status content from the tree's top rule. The top rule SHALL be followed immediately by an accent-bold `Session Tree` title, and the frame SHALL contain no separator rule between search and results.

The search control SHALL use the ordinary dialog input presentation, including its prompt icon and text-colored query, and SHALL NOT render a `Type to search:` label. Its cursor SHALL remain after the final typed character unless the user explicitly moves it. Existing tree search matching, filter modes, folding, navigation, copy, label, label-time, horizontal clipping, and keybindings SHALL remain available.

The selected tree entry SHALL use the ordinary menu arrow `→` without a whole-row background or whole-row bold treatment. Its primary entry label SHALL be highlighted while message content serving as its description SHALL remain muted. Tree entries SHALL NOT render active-path bullets. Unselected `user:` labels SHALL be green, unselected `assistant:` labels SHALL be yellow, and system entries SHALL render as muted `system` without square brackets. An empty search result SHALL show `No entries found` without a `(0/0)` counter.

The tree's semantic shortcut hints SHALL appear after the result area at the bottom of the frame, use the shared key/action styling, and have no trailing blank row before the bottom rule.

#### Scenario: Open the Session Tree below existing content
- **WHEN** the user opens `/tree` after transcript or status content is visible
- **THEN** exactly one empty visual row SHALL separate that content from the tree's top rule
- **AND** the accent-bold title SHALL immediately follow the top rule
- **AND** no internal rule SHALL separate the search control from the tree results

#### Scenario: Search the tree
- **WHEN** the Session Tree is open and the user types a search query
- **THEN** the search row SHALL show the ordinary input prompt icon and text-colored query without `Type to search:`
- **AND** the cursor SHALL appear after the final typed character unless the user moved it
- **AND** the tree SHALL retain its existing search and filter behavior

#### Scenario: Highlight an entry
- **WHEN** a tree entry is selected
- **THEN** the row SHALL begin with the ordinary menu arrow `→`
- **AND** only its primary label SHALL receive selected emphasis while descriptive message text remains muted
- **AND** no active-path bullet, selected background, or whole-row bold treatment SHALL be applied

#### Scenario: Distinguish message roles
- **WHEN** unselected user, assistant, and system entries are visible
- **THEN** `user:` SHALL be green and `assistant:` SHALL be yellow
- **AND** the system entry SHALL read `system` without square brackets

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

#### Scenario: Open the branch-summary choice
- **WHEN** the user selects a non-current tree entry and summary prompting is enabled
- **THEN** the branch-summary choice SHALL replace the tree directly
- **AND** no intermediate frame SHALL expose or flash the ordinary prompt

#### Scenario: Cancel the branch-summary choice
- **WHEN** the user cancels the branch-summary choice
- **THEN** the Session Tree SHALL be restored with the chosen entry selected
- **AND** no intermediate frame SHALL expose or flash the ordinary prompt

#### Scenario: Render branch-summary shortcuts
- **WHEN** the branch-summary choice is visible
- **THEN** its shortcut hints SHALL use the shared dialog key/action styling at the bottom of the frame
- **AND** its bottom rule SHALL immediately follow the hint row

#### Scenario: Enter custom summarization instructions
- **WHEN** the user selects `Summarize with custom prompt`
- **THEN** an accent-bold `Custom summarization instructions` title SHALL appear above a standard single-line input
- **AND** the shortcut footer SHALL contain submit and cancel actions without newline or external-editor actions
- **AND** the frame's bottom rule SHALL immediately follow the shortcut footer

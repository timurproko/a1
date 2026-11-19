## MODIFIED Requirements

### Requirement: The Skills dialog browses, searches, and applies a skill
The Skills dialog SHALL be an A1-owned modal built on public component boundaries and presented as a regular selector dialog like the model selector: the same overlay placement, owned input coordination, pinned border, spacer, search-input, list, and footer composition, and the same keybinding-hint footer wording the pinned selectors use (`↑↓ navigate`, confirm `select`, cancel `cancel`). It SHALL preserve the existing modal contract for exposed transcript content. Its content SHALL be the accent bold title `Skills` above the search input, the matching skills as rows labeled with the bare `<name>` in discovery-sorted name order with the selected row prefixed `→ ` in the accent role, the selected skill's one-line whitespace-collapsed description in the muted role below the rows, and the pinned `(selected/total)` scroll counter only when rows exceed the visible window. The dialog rows SHALL NOT display the engine-facing `skill:` prefix. An empty filtered result SHALL render `No matching skills`; a session with no skills SHALL render `No skills yet`.

A row SHALL match a query when the query, ignoring case and an optional leading `skill:`, is a substring of the skill name or its description. Typing SHALL edit the query and reset the selection to the first row. Up and Down SHALL move the selection and wrap at either end. Enter SHALL apply the selected skill as the skills command defines, then close the dialog. Escape and the pinned cancel binding SHALL close the dialog and leave the editor text and history unchanged, exactly as cancelling the model selector does. The dialog SHALL open only from `/skills` with no arguments and SHALL never open with a seeded query. It SHALL NOT change the model, session, or settings. Expanded slash-command entries SHALL retain their `skill:<name>` labels, and the `/skills:` tunnel SHALL retain its `skills:<name>` labels.

#### Scenario: Browse skills
- **WHEN** the dialog opens with skills present
- **THEN** every skill SHALL be listed as `<name>` without a `skill:` prefix, with the first row selected and its description shown below the list
- **AND** the counter SHALL appear only when the rows overflow the visible window

#### Scenario: Search skills
- **WHEN** the user types `apply` in the dialog
- **THEN** only skills whose name or description contains `apply` SHALL remain, the first SHALL be selected, and its bare name and description SHALL be shown
- **AND** a query matching nothing SHALL render `No matching skills`

#### Scenario: Apply from the dialog
- **WHEN** the user presses Enter on a selected skill
- **THEN** the dialog SHALL close and `/skill:<name>` SHALL be submitted through the ordinary prompt path
- **AND** the search query SHALL NOT be appended as arguments

#### Scenario: Cancel the dialog
- **WHEN** the user presses Escape
- **THEN** the dialog SHALL close, nothing SHALL be submitted, and the editor SHALL keep its previous text

#### Scenario: Open with no skills
- **WHEN** `/skills` runs while no skill is discovered
- **THEN** the dialog SHALL render `No skills yet` and Enter SHALL do nothing

#### Scenario: Keep command-oriented skill labels outside the dialog
- **WHEN** skills are shown as expanded slash-command entries or through the `/skills:` tunnel
- **THEN** expanded entries SHALL remain labeled `skill:<name>` and tunnel entries SHALL remain labeled `skills:<name>`
- **AND** only the collapsed Skills dialog SHALL use bare names

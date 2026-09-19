## ADDED Requirements

### Requirement: Collapsed skills are reached through one skills command
Bare A1 SHALL declare the collapsed skill presentation as a replacement for the pinned per-skill command listing, governed by the A1 setting `skillsPresentation`. While the value is `collapse` and the engine registers skills as commands, the top-level slash-command menu SHALL omit every `skill:<name>` entry and SHALL offer one `skills` command described `Browse, search, and apply a skill`, matched by the same prefix rules as every other command, whose argument completions are the skill names. Invoking `/skills` with no arguments SHALL open the Skills dialog. Invoking `/skills <name> [args]`, where `<name>` matches a discovered skill with or without a `skill:` prefix, SHALL apply that skill with the remaining text as arguments without opening the dialog. Invoking `/skills <name>` with a name that matches no skill SHALL report `Unknown skill: <name>` as a command outcome, as other commands report an unknown argument, and SHALL NOT open the dialog. Argument completion after `/skills ` SHALL list the skill names matching the typed prefix and SHALL show no menu when none matches, exactly as other commands' argument completion does.

Applying a skill SHALL submit `/skill:<name>` plus any arguments through the ordinary prompt path, so the engine performs its pinned skill expansion, queue behavior, transcript rendering, and history recording. A1 SHALL NOT rebuild the skill block itself. A typed `/skill:<name>` SHALL still reach the engine while collapsed; only its menu entry is withheld.

While the value is `expand`, or the engine does not register skills as commands, no `skills` command SHALL exist: `expand` SHALL present the pinned per-skill entries unchanged, and a disabled engine registration SHALL present no skill commands at all. Changing either setting SHALL refresh the menu in the running shell without `/reload` or restart. The `a1 pi` comparison profile and untouched pinned Pi SHALL retain their pinned command catalog. A1 SHALL NOT mutate installed Pi packages, their exported constructors, or their prototypes to implement the replacement.

#### Scenario: Open the menu while collapsed
- **WHEN** skills are discovered, the engine registers skill commands, `skillsPresentation` is `collapse`, and the user types `/`
- **THEN** the menu SHALL list `skills` with its description and no `skill:<name>` entry
- **AND** typing `/sk` SHALL narrow the menu to `skills` under the ordinary prefix rules

#### Scenario: Open the menu while expanded
- **WHEN** `skillsPresentation` is `expand` and the user types `/`
- **THEN** the menu SHALL list every `skill:<name>` entry exactly as pinned Pi does and SHALL NOT list `skills`

#### Scenario: Apply a named skill directly
- **WHEN** the user submits `/skills code-review fix the tests` or `/skills skill:code-review fix the tests` while collapsed
- **THEN** `/skill:code-review fix the tests` SHALL be submitted through the ordinary prompt path without opening the dialog
- **AND** the engine SHALL expand it exactly as a typed `/skill:code-review fix the tests`

#### Scenario: Name an unknown skill
- **WHEN** the user submits `/skills review` while collapsed and no skill is named `review`
- **THEN** A1 SHALL report `Unknown skill: review` as a command outcome and SHALL NOT open the dialog or submit a prompt

#### Scenario: Complete a skill name argument
- **WHEN** the user types `/skills fr` while collapsed
- **THEN** the argument menu SHALL list the skill names starting with `fr`
- **AND** typing `/skills zz` with no such skill SHALL show no menu

#### Scenario: Switch the setting live
- **WHEN** the user changes `Skills` between `collapse` and `expand` during a session
- **THEN** the next opened menu SHALL reflect the new presentation without `/reload`

#### Scenario: Engine registration is disabled
- **WHEN** the engine's skill-command registration is disabled while `skillsPresentation` is `collapse`
- **THEN** the menu SHALL list neither `skills` nor any `skill:<name>` entry

#### Scenario: Compare with pinned Pi
- **WHEN** equivalent input runs through `a1 pi` and untouched pinned Pi
- **THEN** their menus SHALL list the pinned per-skill entries and no `skills` command
- **AND** only bare A1's declared collapsed presentation SHALL be treated as an expected deviation

### Requirement: The Skills dialog browses, searches, and applies a skill
The Skills dialog SHALL be an A1-owned modal built on public component boundaries and presented as a regular selector dialog like the model selector: the same overlay placement, owned input coordination, pinned border, spacer, search-input, list, and footer composition, and the same keybinding-hint footer wording the pinned selectors use (`↑↓ navigate`, confirm `select`, cancel `cancel`). It SHALL preserve the existing modal contract for exposed transcript content. Its content SHALL be the accent bold title `Skills` above the search input, the matching skills as rows labeled `skill:<name>` in discovery-sorted name order with the selected row prefixed `→ ` in the accent role, the selected skill's one-line whitespace-collapsed description in the muted role below the rows, and the pinned `(selected/total)` scroll counter only when rows exceed the visible window. An empty filtered result SHALL render `No matching skills`; a session with no skills SHALL render `No skills yet`.

A row SHALL match a query when the query, ignoring case and an optional leading `skill:`, is a substring of the skill name or its description. Typing SHALL edit the query and reset the selection to the first row. Up and Down SHALL move the selection and wrap at either end. Enter SHALL apply the selected skill as the skills command defines, then close the dialog. Escape and the pinned cancel binding SHALL close the dialog and leave the editor text and history unchanged, exactly as cancelling the model selector does. The dialog SHALL open only from `/skills` with no arguments and SHALL never open with a seeded query. It SHALL NOT change the model, session, or settings.

#### Scenario: Browse skills
- **WHEN** the dialog opens with skills present
- **THEN** every skill SHALL be listed as `skill:<name>` with the first row selected and its description shown below the list
- **AND** the counter SHALL appear only when the rows overflow the visible window

#### Scenario: Search skills
- **WHEN** the user types `apply` in the dialog
- **THEN** only skills whose name or description contains `apply` SHALL remain, the first SHALL be selected, and its description SHALL be shown
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

### Requirement: The skills tunnel completes skills inside the command menu
While `skillsPresentation` is `collapse` and the engine registers skill commands, bare A1's default editor SHALL provide a `skills` command tunnel. When single-line editor content before the cursor is exactly `/skills:` followed by zero or more non-whitespace characters, the menu SHALL list every skill whose name or description contains the query, ignoring case and an optional leading `skill:` or `skills:`, as rows labeled `skills:<name>` with the skill's one-line description; the selected row SHALL keep its description in the muted role. When no skill matches, no menu SHALL be shown. Applying a tunnel row SHALL replace the search with `/skills:<name> ` and place the cursor after the space, as pinned slash-command application does.

When the command menu is open on a sole top-level slash search whose selected row is `skills` and the user types `:`, the editor SHALL replace the search with `/skills:`, push an undo snapshot, and reopen the menu with the tunnel rows. Every other `:` keystroke SHALL be inserted as ordinary text. A submitted `/skills:<name>` optionally followed by whitespace and further text SHALL be rewritten to `/skill:<name>` followed by the same text before it reaches the engine, and prompt history SHALL record the typed `/skills:` form. Existing extension autocomplete wrappers registered through the provider seam SHALL continue to compose over the tunnel-aware provider. While `expand` is active, in the `a1 pi` comparison profile, and in untouched pinned Pi, `/skills:` SHALL remain ordinary text with no tunnel behavior.

#### Scenario: List skills through the tunnel
- **WHEN** the user types `/skills:` while collapsed
- **THEN** the menu SHALL list every skill as `skills:<name>` with its description and the first row selected
- **AND** typing `/skills:fra` SHALL narrow the rows to skills whose name or description contains `fra`

#### Scenario: Complete the selected command with a colon
- **WHEN** the user types `/sk` so `skills` is the selected row and then types `:`
- **THEN** the editor text SHALL become `/skills:` with the cursor at its end and the tunnel rows open
- **AND** undo SHALL restore `/sk`

#### Scenario: Apply a tunnel row
- **WHEN** the user accepts the `skills:framer` row
- **THEN** the editor SHALL contain `/skills:framer ` with the cursor after the space

#### Scenario: Submit a tunneled skill
- **WHEN** the user submits `/skills:framer redesign the hero`
- **THEN** `/skill:framer redesign the hero` SHALL reach the engine through the ordinary prompt path
- **AND** history recall SHALL restore `/skills:framer redesign the hero`

#### Scenario: Type a colon elsewhere
- **WHEN** the user types `:` with no menu open, with a non-`skills` row selected, or after other text on the line
- **THEN** the colon SHALL be inserted as ordinary text

#### Scenario: Tunnel outside collapse
- **WHEN** `/skills:` is typed while `expand` is active or through the `a1 pi` comparison profile
- **THEN** no tunnel rows SHALL appear and the text SHALL be treated as pinned Pi treats it

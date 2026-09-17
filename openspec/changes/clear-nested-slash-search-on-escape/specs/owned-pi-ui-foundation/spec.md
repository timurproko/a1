## MODIFIED Requirements

### Requirement: Escape clears a sole slash-command search in bare A1
Bare A1 SHALL declare Escape on a sole top-level slash-command search as an input exception to pinned autocomplete cancellation. A sole top-level slash-command search is single-line default-editor content consisting of `/` followed by zero or more non-whitespace characters, including further `/` characters, with the cursor at its end and the slash-command menu open. When Escape is pressed in that state, the default editor SHALL close the menu and clear the prompt so the editor returns to its empty state, and SHALL NOT invoke the shell interrupt handler. The cleared text SHALL remain reachable through the editor's existing undo. Every other Escape path SHALL retain its existing contract: an open argument, path/resource, or extension-provider menu, a command search containing whitespace, multi-line content, and a cursor away from the end of the search SHALL only close the menu, and an editor without an open menu SHALL continue to route Escape to the shell interrupt handler. The `a1 pi` comparison profile and untouched pinned Pi SHALL retain pinned close-only cancellation.

#### Scenario: Escape a bare slash
- **WHEN** the user types `/` in bare A1 so the slash-command menu opens and then presses Escape
- **THEN** the menu SHALL close and the prompt SHALL be empty
- **AND** the shell interrupt handler SHALL NOT run

#### Scenario: Escape a partial command name
- **WHEN** the user types `/mod` or `/skill:r` in bare A1 with the menu open and the cursor at the end and then presses Escape
- **THEN** the menu SHALL close and the prompt SHALL be empty

#### Scenario: Escape a search with further slashes
- **WHEN** the user types `////` or `/sk/rev` in bare A1 so the slash-command menu opens with the cursor at the end and then presses Escape
- **THEN** the menu SHALL close and the prompt SHALL be empty
- **AND** the shell interrupt handler SHALL NOT run

#### Scenario: Escape any other menu
- **WHEN** the user presses Escape with an open argument, path/resource, or extension-provider menu, or with a command search that already contains whitespace
- **THEN** the menu SHALL close and the editor text SHALL remain unchanged

#### Scenario: Compare with the pinned editor
- **WHEN** the same `/mod` input and Escape run through the `a1 pi` comparison profile
- **THEN** the menu SHALL close and `/mod` SHALL remain in the editor exactly as in pinned Pi

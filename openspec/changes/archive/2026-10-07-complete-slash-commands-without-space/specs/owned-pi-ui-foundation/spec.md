## ADDED Requirements

### Requirement: Bare-A1 slash-command completion remains delimiter-ready

When the bare-A1 default editor applies a selected top-level slash-command row, it SHALL replace the search with `/<name>` and place the cursor immediately after the command name without inserting trailing whitespace. Tab SHALL leave that completed command in the editor for further input while continuously keeping autocomplete visible without a transient closed frame, then refresh it for the completed prefix so only the exact matching command row remains visible and selected, including before an immediately typed `:` or a user-entered space for arguments. Enter SHALL continue through the existing command-submission path after applying the row. This exception SHALL apply only to top-level slash-command application in bare A1; command-argument, path/resource, attachment, and other non-command completions SHALL retain their existing spacing and cursor behavior. The `a1 pi` comparison profile and untouched pinned Pi SHALL retain the pinned trailing-space completion behavior.

#### Scenario: Complete a command with Tab

- **WHEN** the user selects the `settings` row from bare-A1 top-level slash-command autocomplete and presses Tab
- **THEN** the editor SHALL contain exactly `/settings` with the cursor immediately after `settings`
- **AND** autocomplete SHALL keep the current rows visible during the refresh and then show only the selected `settings` row and its description without submitting the command

#### Scenario: Continue into a command tunnel

- **WHEN** the user Tab-completes the selected `skills` row and immediately types `:`
- **THEN** the editor SHALL contain `/skills:` with the cursor at its end
- **AND** the existing skills-tunnel suggestions SHALL open without requiring deletion of whitespace

#### Scenario: Continue into command arguments

- **WHEN** the user Tab-completes an argument-bearing command and then types one space
- **THEN** the editor SHALL contain one command separator after `/<name>`
- **AND** its existing argument-completion behavior SHALL remain available

#### Scenario: Submit a selected command with Enter

- **WHEN** the user selects a top-level slash-command row in bare A1 and presses Enter
- **THEN** the existing command route SHALL receive `/<name>` without an added trailing space

#### Scenario: Preserve non-command and comparison completion

- **WHEN** the user applies an argument, path/resource, attachment, or other non-command completion, or applies a top-level command through `a1 pi`
- **THEN** its existing completion text, spacing, cursor placement, and outcome SHALL remain unchanged

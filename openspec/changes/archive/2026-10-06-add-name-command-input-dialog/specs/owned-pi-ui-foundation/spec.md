## ADDED Requirements

### Requirement: Bare-A1 session naming supports direct and prompted entry

Bare A1 SHALL accept `/name <name>` as an immediate session-name update. When the user invokes `/name` without an argument, bare A1 SHALL present a compact single-line input instead of appending the usage warning or only reporting the current name. The input SHALL use the accent title `Session Name`, the standard focused text-entry row, and the shared Enter-submit and Escape-cancel shortcut hints.

Submitting a non-empty value SHALL apply it through the same session-name workflow as the direct command and SHALL report the resulting normalized name. Cancelling, or submitting only whitespace, SHALL restore the ordinary prompt without changing the session name or appending a warning, error, or completion message. The explicit `a1 pi` comparison profile SHALL retain its pinned argument-free `/name` behavior.

#### Scenario: Name a session directly
- **WHEN** the user invokes `/name Project Alpha` in bare A1
- **THEN** the session name SHALL be updated immediately through the existing naming workflow
- **AND** no name-input dialog SHALL open

#### Scenario: Open the name input
- **WHEN** the user invokes `/name` without an argument in bare A1
- **THEN** a compact input titled `Session Name` SHALL replace the ordinary prompt
- **AND** it SHALL show the shared Enter-submit and Escape-cancel shortcut hints
- **AND** no usage warning or current-name-only result SHALL be appended

#### Scenario: Submit a prompted name
- **WHEN** the user enters a non-empty name and presses Enter
- **THEN** the input SHALL close and the session SHALL use that name
- **AND** the ordinary normalized-name result SHALL be reported

#### Scenario: Cancel prompted naming
- **WHEN** the user presses Escape or submits only whitespace in the name input
- **THEN** the input SHALL close and restore the ordinary prompt
- **AND** the existing session name SHALL remain unchanged
- **AND** no command-result message SHALL be appended

#### Scenario: Use the comparison profile
- **WHEN** the user invokes argument-free `/name` in the explicit `a1 pi` comparison profile
- **THEN** the pinned comparison workflow SHALL remain unchanged

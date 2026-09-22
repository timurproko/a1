## ADDED Requirements

### Requirement: Bare A1 keeps model and thinking commands adjacent
Bare A1 SHALL present `thinking` immediately after its unified `models` command in the advertised workflow catalog and slash-command autocomplete. All other owned built-in commands SHALL retain their relative order. The pinned `a1 pi` comparison profile SHALL retain its upstream command order unchanged.

#### Scenario: Open bare A1 slash-command autocomplete
- **WHEN** bare A1 presents its built-in slash-command catalog
- **THEN** its first four commands SHALL be `settings`, `models`, `thinking`, and `tree` in that order
- **AND** its advertised workflow catalog SHALL use the same order

#### Scenario: Open comparison slash-command autocomplete
- **WHEN** the `a1 pi` comparison profile presents its built-in slash-command catalog
- **THEN** `model`, `tree`, `thinking`, and `scoped-models` SHALL remain in pinned upstream order

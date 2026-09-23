## ADDED Requirements

### Requirement: Bare-A1 thinking and provider-login command rows use concise descriptions
Bare A1 SHALL present the built-in `thinking` command with the description `Set thinking level` and the built-in `login` command with the description `Configure provider authentication` in top-level slash-command autocomplete. Neither row SHALL prepend an angle-bracket argument hint or the argument-hint separator to that description. This presentation change SHALL NOT remove thinking-level or provider argument completion, change either command's execution, alter command ordering or selected-row styling, or remove argument hints from unrelated commands and resources. The `a1 pi` comparison profile SHALL retain its pinned argument-hint presentation.

#### Scenario: Browse the two commands in bare A1
- **WHEN** bare A1 presents top-level slash-command autocomplete containing `thinking` and `login`
- **THEN** the `thinking` row description SHALL be exactly `Set thinking level`
- **AND** the `login` row description SHALL be exactly `Configure provider authentication`
- **AND** neither row SHALL contain `<level>`, `<provider>`, or the argument-hint separator

#### Scenario: Complete thinking and provider arguments
- **WHEN** the user requests argument completion after `/thinking ` or `/login ` in bare A1
- **THEN** the established thinking-level or provider choices SHALL remain available
- **AND** applying a choice SHALL retain the established command workflow

#### Scenario: Keep other hint presentation unchanged
- **WHEN** bare A1 presents another command or resource that declares an argument hint
- **THEN** that hint SHALL retain its existing visible presentation

#### Scenario: Compare with pinned Pi
- **WHEN** the `a1 pi` comparison profile presents the `thinking` and `login` command rows
- **THEN** `thinking` SHALL retain its pinned `<level>` argument hint
- **AND** `login` SHALL retain its pinned `<provider>` argument hint

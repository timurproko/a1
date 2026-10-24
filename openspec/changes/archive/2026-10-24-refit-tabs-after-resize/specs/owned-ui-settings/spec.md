## ADDED Requirements

### Requirement: Settings empty results use concise application copy

The owned Settings screen SHALL present its centered no-result state with the existing `👀` mark directly above the exact punctuation-free message `No settings found`, with the two-row group positioned one row lower than the original empty state.

#### Scenario: Search has no matching settings

- **WHEN** the active Settings search matches no entries
- **THEN** the centered empty state SHALL show `👀` on the row directly above `No settings found`
- **AND** the message row SHALL remain at its lowered position
- **AND** the message SHALL NOT end with a period

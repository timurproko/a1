## ADDED Requirements

### Requirement: Settings empty results use concise application copy

The owned Settings screen SHALL present its centered no-result state with the existing `👀` mark above the exact punctuation-free message `No settings found`.

#### Scenario: Search has no matching settings

- **WHEN** the active Settings search matches no entries
- **THEN** the centered empty state SHALL show `👀` above `No settings found`
- **AND** the message SHALL NOT end with a period

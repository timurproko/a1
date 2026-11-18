## MODIFIED Requirements

### Requirement: Development work is isolated and integrated once

Implementation SHALL use an owned isolated checkout while primary stays on develop. Planning and GitHub administration SHALL support explicit identity without a checkout. Branch/history/change/PR identity SHALL survive machines. Planning SHALL not need a separate merge. Local removal and remote cleanup retain separate authority; merge SHALL not force local deletion.

#### Scenario: Work begins
- **WHEN** implementation starts
- **THEN** an isolated checkout SHALL be created or attached without changing primary
- **AND** remote planning SHALL not require one

#### Scenario: Approved implementation has ready scope
- **WHEN** the user requests implementation and its planning artifacts are ready
- **THEN** the agent SHALL use those artifacts as context and begin implementation without proposing, revising, or separately merging them

#### Scenario: Work is integrated
- **WHEN** a protected authorized PR integrates
- **THEN** delivery SHALL be reported independently of optional local cleanup
- **AND** valuable files/unpublished work SHALL remain protected

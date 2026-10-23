# owned-ui-settings Delta

## ADDED Requirements

### Requirement: Tabs settings expose startup
During resident launches, the owned Settings screen SHALL expose `Startup` in the Tabs section after `Tab bar position`, with exactly `empty` and `agent` choices, in that order, and `empty` as the default. The setting SHALL use A1-owned profile-local persistence and SHALL apply at the next bare `a1` launch that finds no Agent tab: `empty` opens the landing and `agent` starts one Agent in the launch cwd. Direct `a1 solo` and `a1 pi` SHALL continue to omit the Tabs section.

#### Scenario: Inspect the startup choice
- **WHEN** the resident Settings utility presents the Tabs section
- **THEN** it SHALL include `Startup` offering `empty` and `agent`

#### Scenario: Resolve the default startup
- **WHEN** the active profile stores no startup choice
- **THEN** the setting SHALL resolve to `empty` and bare `a1` with no Agent SHALL open the landing

#### Scenario: Start with an Agent
- **WHEN** the user sets `Startup` to `agent` and later runs bare `a1` with no Agent tab
- **THEN** one Agent SHALL start in the launch cwd and be viewed

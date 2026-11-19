## ADDED Requirements

### Requirement: Self-update progress uses compact shared geometry
When A1 renders interactive self-update progress, the visible bar segment before the percentage SHALL occupy exactly 38 terminal cells. Fresh installation SHALL use the same bar width, glyphs, percentage suffix, and proportional fill geometry. The shorter geometry SHALL NOT change progress calculation, milestone movement, color roles, or terminal cleanup.

#### Scenario: A partial update is displayed
- **WHEN** A1 renders a two-digit percentage during self-update
- **THEN** the completed and remaining bar segments together SHALL occupy exactly 38 terminal cells
- **AND** one space and the numeric percentage SHALL follow the bar

#### Scenario: Progress reaches either boundary
- **WHEN** self-update renders zero or complete progress
- **THEN** the bar SHALL remain exactly 38 terminal cells wide
- **AND** its completed segment SHALL represent the bounded percentage across that width

#### Scenario: Installation presentations are compared
- **WHEN** equivalent progress is rendered by self-update and fresh installation
- **THEN** both visible bar segments SHALL use the same 38-cell geometry

## ADDED Requirements

### Requirement: Publication status uses aligned labels and dot-only color

Development publication progress SHALL print its version and run identifier in one publication header, followed by an indented full-log link and append-only job transitions without repeating the publication prefix. Each changed job SHALL occupy its own line with a single-column dot and a fixed-width status field so job names start at the same visible column. Status labels and job names SHALL retain the terminal's default text color. Only the dot MAY be colored: yellow for running, green for passed, red for failed, and gray for skipped. Color-disabled or nonterminal output SHALL remain readable without color escape sequences. The presentation SHALL preserve state-change deduplication, meaningful skipped-state reporting, diagnostics, and all publication gates without animation or rewriting prior lines.

#### Scenario: Several platform jobs change state
- **WHEN** multiple platform jobs change state in one status snapshot
- **THEN** each changed job SHALL appear on its own aligned line with the appropriate dot and label
- **AND** no job SHALL be hidden behind a grouped more-count

#### Scenario: Progress is shown in a color-capable terminal
- **WHEN** the terminal supports color and the user has not disabled it
- **THEN** only the small dot SHALL receive status color and foreground color SHALL be restored before status text
- **AND** the publication header SHALL not repeat on each progress line

#### Scenario: Output is redirected or color-disabled
- **WHEN** output is nonterminal, the terminal is dumb, or NO_COLOR disables color
- **THEN** status words, dots, alignment, and full-log access SHALL remain without color control sequences

#### Scenario: npm staging is skipped after validation failure
- **WHEN** npm staging is skipped because validation failed
- **THEN** the progress SHALL report skipped npm staging with aligned neutral text and a gray dot when color is enabled
- **AND** inactive-mode optional skips SHALL remain suppressed unless their job previously started

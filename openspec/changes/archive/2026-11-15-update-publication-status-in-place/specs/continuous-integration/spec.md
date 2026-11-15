## MODIFIED Requirements

### Requirement: Publication status uses aligned labels and dot-only color

Development publication progress SHALL print its version and run identifier in one publication header followed by an unindented full-log link, without repeating the publication prefix on job rows. In capable interactive terminals, each displayed job SHALL retain one visible row whose dot and fixed-width status field update in place as its state changes. Job names SHALL start at the same visible column. Status labels and job names SHALL retain the terminal's default text color. Only the dot MAY be colored: yellow for running, green for passed, red for failed, and gray for skipped. Color opt-outs SHALL disable dot color independently of interactive row updates. Nonterminal output and dumb terminals SHALL use readable append-only state transitions without terminal control sequences. The presentation SHALL preserve state-change deduplication, meaningful skipped-state reporting, diagnostics, and all publication gates without continuous animation. Cursor updates SHALL remain confined to the progress region, accommodate terminal dimensions safely, and leave subsequent success or failure output beneath it.

#### Scenario: A running job passes in an interactive terminal
- **WHEN** a displayed running job completes successfully
- **THEN** its existing row SHALL change from Running to Passed and its yellow dot SHALL become green when color is enabled
- **AND** no stale Running row or second visible row for that job SHALL remain

#### Scenario: Several platform jobs change state
- **WHEN** multiple platform jobs change state in one status snapshot
- **THEN** each displayed job SHALL retain its own aligned row with the latest dot and label
- **AND** no job SHALL be hidden behind a grouped more-count

#### Scenario: Progress is shown in a color-capable terminal
- **WHEN** the terminal supports color and the user has not disabled it
- **THEN** only the small dot SHALL receive status color and foreground color SHALL be restored before status text
- **AND** the publication header SHALL not repeat on each progress line

#### Scenario: Interactive color is disabled
- **WHEN** NO_COLOR or FORCE_COLOR=0 disables color in an otherwise capable interactive terminal
- **THEN** existing job rows SHALL still update in place with neutral dots and labels
- **AND** no color control sequences SHALL be emitted

#### Scenario: Output is redirected or color-disabled
- **WHEN** output is nonterminal, the terminal is dumb, or NO_COLOR disables color
- **THEN** status words, dots, alignment, and full-log access SHALL remain without color control sequences
- **AND** nonterminal output and dumb terminals SHALL use append-only transitions without cursor control sequences

#### Scenario: npm staging is skipped after validation failure
- **WHEN** npm staging is skipped because validation failed
- **THEN** the progress SHALL report skipped npm staging with aligned neutral text and a gray dot when color is enabled
- **AND** inactive-mode optional skips SHALL remain suppressed unless their job previously started

#### Scenario: Terminal geometry changes or observation ends
- **WHEN** the terminal becomes narrow, resizes, or publication observation finishes or stops
- **THEN** progress updates SHALL NOT overwrite the publication header or unrelated output
- **AND** subsequent diagnostics or completion text SHALL start beneath the progress rows

## ADDED Requirements

### Requirement: Constrained A1 session footer reserves identity and truncates dimly
When the bare-A1 footer must truncate path/branch or usage text, every inserted truncation marker SHALL be exactly one terminal-column `…` in the semantic dim foreground of the neighboring text, never a bright three-cell `...`. The path row SHALL retain its existing complete linked `#<number>` badge whenever the terminal can contain that badge; prefix truncation and smaller-width fallback SHALL NOT leak the hyperlink or foreground into another cell or row. On the usage row, the full model name SHALL take precedence over lower-priority usage and optional provider or thinking-level details whenever its complete name fits the terminal. Lower-priority usage SHALL truncate with the dim one-cell marker before model text is clipped. A thinking-level suffix SHALL keep its level color when it fits without clipping the model; the row SHALL remain width-bounded and ANSI-safe when even the model cannot fit. Untruncated rows and the Pi comparison profile SHALL retain their existing presentation.

#### Scenario: Truncate the A1 path beside a pull request
- **WHEN** a narrow A1 footer must shorten its repository path and branch to fit the linked `#827` badge
- **THEN** the path prefix SHALL end with a single dim `…` and the complete `#827` SHALL retain its hyperlink
- **AND** no bright three-cell `...` SHALL appear as a truncation marker

#### Scenario: Preserve the model before usage
- **WHEN** a narrow A1 footer can fit the complete current model name but cannot fit both that name and the complete usage row
- **THEN** it SHALL show the full model name and truncate the lower-priority usage with a dim one-cell `…`
- **AND** any thinking-level or provider detail that cannot fit SHALL be omitted without clipping the model name

#### Scenario: Keep styled right-hand details when space remains
- **WHEN** a model and thinking-level suffix both fit after usage truncation
- **THEN** the complete model name SHALL remain dim and the complete level SHALL keep its existing level foreground
- **AND** the marker and level style SHALL NOT leak into adjacent text or another row

#### Scenario: A footer narrower than the model
- **WHEN** the terminal cannot fit even the model's complete name
- **THEN** the footer SHALL truncate safely within the available display width without leaking foreground or hyperlinks

#### Scenario: Comparison and wide footer remain unchanged
- **WHEN** the A1 footer fits without truncation or the Pi comparison profile renders its footer
- **THEN** the existing text, width policy, and semantic coloring SHALL remain unchanged

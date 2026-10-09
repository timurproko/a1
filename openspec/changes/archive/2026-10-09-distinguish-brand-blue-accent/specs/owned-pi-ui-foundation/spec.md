## ADDED Requirements

### Requirement: The named blue accent carries A1's brand identity

The explicit `blue` palette entry SHALL anchor its primary hue to A1's royal-blue brand color `#2638d2` while adapting saturation and lightness for readable dark and light terminal appearances. Its rendered primary SHALL remain perceptually distinct from the explicit `cyan` entry, and every derived semantic-family role SHALL continue to come from the shared palette-independent accent transform rather than blue-specific role literals.

#### Scenario: Compare blue and cyan in either appearance
- **WHEN** bare A1 resolves the `blue` and `cyan` primaries for dark or light appearance
- **THEN** blue SHALL retain the royal-blue hue identity of A1's brand while cyan retains its blue-green identity
- **AND** their circular OKHSL hue separation SHALL be large enough to read as different palette choices rather than neighboring shades

#### Scenario: Project the brand-blue family
- **WHEN** the reader selects `blue`
- **THEN** the primary accent SHALL use the contrast-adapted A1 brand-blue hue
- **AND** border, secondary heading/filter, selected-row, user-message, and optional accent-canvas tones SHALL derive from that primary through the same transform used by every named or future custom accent
- **AND** no other named primary, unrelated semantic role, or comparison-profile color SHALL change

#### Scenario: Approximate blue on a limited-color terminal
- **WHEN** the terminal supports 256 colors rather than truecolor
- **THEN** the selected blue SHALL use the nearest supported palette color through the existing color-mode boundary
- **AND** its emitted primary accent SHALL remain distinct from the emitted cyan primary

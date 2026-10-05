## MODIFIED Requirements

### Requirement: Section separators and commands match their intended presentation

The README SHALL place the same compact ASCII `* * *` separator between each adjacent pair of primary task sections instead of section-specific illustrations. The three asterisks and their single-space gaps SHALL form one centered, evenly spaced typographic run at every README placement. The separator SHALL use the animated waves footer's light and dark artwork colors and lighter monospace font weight, SHALL animate the three asterisks independently in the existing smooth sequence when motion is allowed, and SHALL show the complete static ornament when reduced motion is requested. Command examples SHALL use plain-text rendering so syntax highlighting does not assign semantic colors to ordinary command words. Changing presentation SHALL NOT change copyable command bytes.

#### Scenario: Separator renders under user preferences

- **WHEN** the README is viewed in light mode, dark mode, or with reduced motion enabled
- **THEN** every primary section boundary SHALL show one centered, evenly spaced `* * *` run in the corresponding animated or static presentation
- **AND** the separator SHALL use the waves footer's lighter monospace weight while the animated waves footer remains unchanged

#### Scenario: Separator animation remains smooth

- **WHEN** motion is allowed and a separator completes an animation cycle
- **THEN** its three asterisks SHALL retain the established sequential twinkle cadence and opacity range
- **AND** grouping the ornament as one text run SHALL NOT move the glyphs or alter their spacing during animation

#### Scenario: Reader copies a command

- **WHEN** GitHub renders and the reader copies any command example
- **THEN** its command text SHALL remain unchanged and SHALL not use shell-keyword syntax coloring

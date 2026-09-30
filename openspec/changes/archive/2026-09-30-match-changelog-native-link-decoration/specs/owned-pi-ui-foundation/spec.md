## ADDED Requirements

### Requirement: Bare-A1 changelog reference links use terminal-native decoration

Bare A1 SHALL present hyperlinks in both the complete `/changelog` history and startup release-note reference documents with the same terminal-native decoration policy as agent-content links. Changelog links SHALL preserve their visible labels, foregrounds, exact OSC 8 targets, wrapping, scrolling, and activation behavior while omitting renderer-owned solid underline controls, allowing the terminal to provide its native idle decoration and solid hover decoration. This policy SHALL NOT alter hotkeys or other reference documents, the `a1 pi` comparison profile, untouched Pi, or installed Pi packages.

#### Scenario: Present a changelog link at rest and on hover
- **WHEN** a bare-A1 changelog or startup release-note reference screen contains a hyperlink
- **THEN** its visible label, foreground, and exact target SHALL match the rendered release note without an explicit solid underline at rest
- **AND** the terminal SHALL remain able to apply its native idle decoration and solid hover decoration to only that link

#### Scenario: Keep unrelated reference and comparison presentation unchanged
- **WHEN** bare A1 renders a hotkeys reference document or `a1 pi` renders its pinned in-feed changelog
- **THEN** the bare-A1 changelog hyperlink policy SHALL NOT alter that presentation

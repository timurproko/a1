## ADDED Requirements

### Requirement: Modal shortcut rows distinguish keys from actions without separator glyphs

The component layer SHALL provide one semantic presentation for modal shortcut hints. Each hint entry SHALL render its shortcut label in the declared quiet key role and its action name in a distinct declared text role. Adjacent entries SHALL be separated by whitespace only, with exactly two display cells between entries and no middle dot, bullet, or other separator glyph. The presentation SHALL retain entry boundaries while measuring, truncating, or wrapping so ANSI styling is not counted as visible width and no style sequence is split.

Punctuation that belongs to an action name or ordinary explanatory prose SHALL remain content and SHALL NOT be treated as an entry separator.

#### Scenario: Render multiple modal shortcuts
- **WHEN** a modal renders `↑↓ navigate`, `enter select`, and `escape cancel`
- **THEN** each shortcut label SHALL use the quiet key role and each action name SHALL use the distinct action-text role
- **AND** adjacent entries SHALL have exactly two spaces between them with no separator glyph

#### Scenario: Render at a narrow width
- **WHEN** a modal shortcut row does not fit its available width
- **THEN** the owning surface SHALL retain its declared clipping or wrapping behavior
- **AND** visible-width measurement SHALL preserve complete style sequences and the semantic key/action color boundary

#### Scenario: Include punctuation in an action name
- **WHEN** an action description contains punctuation as part of its wording
- **THEN** that punctuation SHALL remain visible
- **AND** it SHALL NOT create or be interpreted as a separator between hint entries

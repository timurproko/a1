## MODIFIED Requirements

### Requirement: Dialog shortcut rows distinguish keys from actions without separator glyphs

The component layer SHALL provide one semantic presentation reused by modal and full-screen dialog shortcut hints across presentation boundaries. Each hint entry SHALL render its shortcut label in the declared quiet key role using display capitalization (`Enter`, `Esc`, `Ctrl+S`) and its lowercase action name in a distinct declared text role. Adjacent entries SHALL be separated by whitespace only, with exactly two display cells between entries and no middle dot, bullet, or other separator glyph. The presentation SHALL retain entry boundaries while measuring, truncating, or wrapping so ANSI styling is not counted as visible width and no style sequence is split.

The semantic presentation SHALL NOT impose a content-row indent. An owning dialog SHALL place the shortcut row so its first visible cell uses the same display column as that dialog's heading or title, applying any established heading inset exactly once. List markers, form fields, editors, descriptions, and other content MAY retain a different inset. Punctuation that belongs to an action name or ordinary explanatory prose SHALL remain content and SHALL NOT be treated as an entry separator.

#### Scenario: Render multiple modal shortcuts
- **WHEN** a modal renders `↑↓ navigate`, `Enter select`, and `Escape cancel`
- **THEN** each shortcut label SHALL use the quiet key role and each action name SHALL use the distinct action-text role
- **AND** adjacent entries SHALL have exactly two spaces between them with no separator glyph

#### Scenario: Align a dialog shortcut row
- **WHEN** a dialog heading and its shortcut row are rendered with content rows that use a separate marker or field inset
- **THEN** the first visible shortcut cell SHALL begin in the same display column as the first visible heading cell
- **AND** the content-row inset SHALL remain independent of the shortcut-row placement

#### Scenario: Retain an established heading inset
- **WHEN** a dialog intentionally places its heading one or more cells inside its frame
- **THEN** its shortcut row SHALL use that same inset exactly once rather than moving to absolute column zero or adding a content indent

#### Scenario: Render at a narrow width
- **WHEN** a modal shortcut row does not fit its available width
- **THEN** the owning surface SHALL retain its declared clipping or wrapping behavior
- **AND** visible-width measurement SHALL preserve complete style sequences and the semantic key/action color boundary

#### Scenario: Include punctuation in an action name
- **WHEN** an action description contains punctuation as part of its wording
- **THEN** that punctuation SHALL remain visible
- **AND** it SHALL NOT create or be interpreted as a separator between hint entries

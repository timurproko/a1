## ADDED Requirements

### Requirement: Assistant block copy excludes known rendering prefixes

Bare A1 frame-selection copy SHALL exclude assistant-renderer-owned left padding and blockquote border prefixes when trustworthy presentation provenance identifies those cells. This SHALL be an exception to literal internal-whitespace preservation for presentation-only prefixes, not permission to trim each selected row or heuristically dedent source content. Copy extraction SHALL retain source indentation, literal border characters, internal blank lines, visible row boundaries, and selected graphemes. Automatic selection copy and explicit frame copy SHALL use the same corrected extraction. Ordinary pasted text, editor-owned copy/cut, unknown custom-rendered content without provenance, and the independent comparison profile SHALL retain their existing behavior.

#### Scenario: Copy a multiline assistant quote

- **WHEN** a reader selects assistant quote content spanning several rendered rows
- **THEN** clipboard text SHALL contain the selected quote content without renderer-owned quote borders or left padding
- **AND** continuation rows SHALL NOT acquire an offset from presentation whitespace omitted from the first row

#### Scenario: Preserve genuine indentation and literal borders

- **WHEN** selected assistant content includes source-indented code, nested indentation, internal blank lines, or literal border characters
- **THEN** extraction SHALL remove only presentation-owned prefixes
- **AND** genuine content indentation, blank lines, and literal border characters SHALL remain unchanged

#### Scenario: Preserve partial selection coordinates

- **WHEN** a forward or reverse selection starts or ends inside a rendered assistant row containing a presentation prefix
- **THEN** extraction SHALL clip the selected source content using the original display-column coordinates
- **AND** exclude presentation-owned cells without shifting, duplicating, or dropping selected graphemes

#### Scenario: Keep rendering provenance current

- **WHEN** scrolling, resizing, streaming, or output-padding changes alter selected assistant rows
- **THEN** extraction SHALL use provenance belonging to those current rendered rows
- **AND** SHALL NOT strip source text based on stale prefix boundaries

#### Scenario: Do not normalize unrelated pasted indentation

- **WHEN** clipboard text is supplied externally or copied from an editor-owned draft
- **THEN** the copy-prefix repair SHALL NOT dedent or trim its individual lines

## ADDED Requirements

### Requirement: Visual selection is independent from transcript ownership

Bare A1 SHALL distinguish a surface's semantic ownership from whether its currently visible text participates in complete-frame selection. Terms in this capability that classify pending steering, working status, alignment rows, dock notices, widgets, input rows, autocomplete chrome, or footer rows as non-persistent, non-transcript, outside the selectable document, or excluded from transcript copy SHALL continue to govern transcript history, scrolling, prompt navigation, persistence, model context, and semantic response-copy operations. They SHALL NOT prevent the visible cells of those surfaces from participating in the complete-frame visual selection defined by `session-frame-selection`.

An ordinary frame-selection drag SHALL be allowed to cross between the transcript viewport and dock without moving, persisting, or reclassifying either surface. Explicit controls, modals, overlays, and replacement surfaces SHALL retain their declared gesture ownership, and `a1 pi` SHALL remain unchanged.

#### Scenario: Select non-transcript text without persisting it
- **WHEN** a complete-frame selection includes pending steering, working status, a dock notice, prompt text, or footer/status content
- **THEN** those visible glyphs SHALL be eligible for frame-selection painting and visual copy
- **AND** they SHALL remain excluded from transcript history, prompt navigation, persisted conversation content, and model context according to their existing ownership

#### Scenario: Cross the viewport and dock boundary
- **WHEN** one frame-selection drag crosses from semantic transcript rows into pinned dock rows or in the reverse direction
- **THEN** selection SHALL remain continuous across the boundary
- **AND** transcript scrolling and dock pinning SHALL retain their existing allocation and order

#### Scenario: Preserve semantic response copying
- **WHEN** a response-only or command-driven copy route requests semantic agent content rather than a visible frame range
- **THEN** the existing transcript chrome exclusions SHALL remain in force
- **AND** complete-frame selectability SHALL NOT add transient or dock text to that semantic payload

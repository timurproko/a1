## MODIFIED Requirements

### Requirement: Visual selection is independent from transcript ownership

Bare A1 SHALL distinguish a surface's semantic ownership from whether its currently visible text participates in complete-frame selection. Terms in this capability that classify pending steering, working status, alignment rows, dock notices, widgets, input rows, autocomplete chrome, or footer rows as non-persistent, non-transcript, outside the selectable document, or excluded from transcript copy SHALL continue to govern transcript history, scrolling, prompt navigation, persistence, model context, and semantic response-copy operations. They SHALL NOT prevent the visible cells of those surfaces from participating in the complete-frame visual selection defined by `session-frame-selection` when pointer motion explicitly includes them.

A selection whose semantic endpoints both remain transcript-document anchors SHALL be visually and textually clipped to the current transcript viewport rectangle. Edge-held scrolling or another viewport-position change SHALL NOT project an off-screen document endpoint into pinned dock rows merely because its unbounded screen-relative line number overlaps their frame-row indices. The transcript edge SHALL represent that off-screen continuation until the source endpoint returns to view or pointer motion explicitly enters another surface.

An ordinary frame-selection drag SHALL be allowed to cross between the transcript viewport and dock without moving, persisting, or reclassifying either surface. Pointer motion that explicitly enters a visible dock row SHALL establish the dock endpoint needed for a continuous complete-frame range; transcript scrolling alone SHALL NOT manufacture that endpoint. Explicit controls, modals, overlays, and replacement surfaces SHALL retain their declared gesture ownership, and `a1 pi` SHALL remain unchanged.

#### Scenario: Keep upward scrolling selection in content
- **WHEN** a selection with both endpoints in transcript content is expanded upward by edge-held auto-scroll until its lower source endpoint is below the visible transcript rectangle
- **THEN** selection paint and visible-frame copy SHALL remain bounded to transcript rows
- **AND** the editor, widgets, notices, footer, and their padding SHALL retain their ordinary presentation
- **AND** the off-screen document endpoint SHALL NOT be reclassified as a dock endpoint

#### Scenario: Keep downward scrolling selection in content
- **WHEN** a selection with both endpoints in transcript content is expanded downward by edge-held auto-scroll until its upper source endpoint is above the visible transcript rectangle
- **THEN** selection paint and visible-frame copy SHALL remain bounded to transcript rows
- **AND** pinned rows above or below the transcript SHALL NOT gain selection solely from the viewport-position change
- **AND** equivalent forward and reverse drags SHALL retain the same region boundary

#### Scenario: Select non-transcript text without persisting it
- **WHEN** explicit pointer motion makes a complete-frame selection include pending steering, working status, a dock notice, prompt text, or footer/status content
- **THEN** those visible glyphs SHALL be eligible for frame-selection painting and visual copy
- **AND** they SHALL remain excluded from transcript history, prompt navigation, persisted conversation content, and model context according to their existing ownership

#### Scenario: Cross the viewport and dock boundary
- **WHEN** one frame-selection drag explicitly crosses from semantic transcript rows into pinned dock rows or in the reverse direction
- **THEN** selection SHALL remain continuous across the boundary
- **AND** subsequent transcript scrolling SHALL preserve the distinct document and dock endpoint ownership rather than deriving ownership from overlapping row numbers
- **AND** transcript scrolling and dock pinning SHALL retain their existing allocation and order

#### Scenario: Preserve semantic response copying
- **WHEN** a response-only or command-driven copy route requests semantic agent content rather than a visible frame range
- **THEN** the existing transcript chrome exclusions SHALL remain in force
- **AND** complete-frame selectability SHALL NOT add transient or dock text to that semantic payload

#### Scenario: Recompose after dock geometry changes
- **WHEN** dock rows are added, removed, or reflowed while a document-only selection has an off-screen endpoint
- **THEN** the selection SHALL remain clipped to the recomputed transcript rectangle in the same frame
- **AND** no stale selection background SHALL remain on a former or current dock cell

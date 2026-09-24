## MODIFIED Requirements

### Requirement: Visual selection is independent from transcript ownership

Bare A1 SHALL distinguish a surface's semantic ownership from whether its currently visible text participates in frame selection. Terms in this capability that classify pending steering, working status, alignment rows, dock notices, widgets, input rows, autocomplete chrome, or footer rows as non-persistent, non-transcript, outside the selectable document, or excluded from transcript copy SHALL continue to govern transcript history, scrolling, prompt navigation, persistence, model context, and semantic response-copy operations.

A selection whose fixed gesture anchor begins on transcript content SHALL remain visually and textually clipped to the current transcript viewport rectangle for the complete gesture. Edge-held scrolling, another viewport-position change, or pointer motion into pinned rows SHALL NOT expand that content-originated selection into the editor, widgets, notices, footer, or their padding. The corresponding transcript edge SHALL represent continuation beyond the rectangle until the moving endpoint returns to transcript content or the gesture ends.

A selection that originates in the dock SHALL retain its existing dock/editor interaction. Explicit controls, modals, overlays, and replacement surfaces SHALL retain their declared gesture ownership, and `a1 pi` SHALL remain unchanged.

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

#### Scenario: Keep a direct downward drag inside content
- **WHEN** a frame-selection gesture starts on transcript content and its pointer moves into a visible editor, widget, notice, or footer row
- **THEN** selection paint and visible-frame copy SHALL stop at the transcript rectangle's bottom edge
- **AND** pinned rows and their full-width padding SHALL retain their ordinary presentation
- **AND** reaching the document scroll limit SHALL NOT relax the boundary

#### Scenario: Select non-transcript text without persisting it
- **WHEN** a selection gesture begins on a visible dock or editor row
- **THEN** those visible glyphs SHALL remain eligible for frame-selection painting and visual copy
- **AND** they SHALL remain excluded from transcript history, prompt navigation, persisted conversation content, and model context according to their existing ownership

#### Scenario: Cross the viewport and dock boundary
- **WHEN** a dock-originated frame-selection drag crosses into semantic transcript rows
- **THEN** selection SHALL retain its existing continuous complete-frame behavior
- **AND** transcript-origin clipping SHALL NOT reclassify the gesture as content-originated
- **AND** transcript scrolling and dock pinning SHALL retain their existing allocation and order

#### Scenario: Preserve semantic response copying
- **WHEN** a response-only or command-driven copy route requests semantic agent content rather than a visible frame range
- **THEN** the existing transcript chrome exclusions SHALL remain in force
- **AND** complete-frame selectability SHALL NOT add transient or dock text to that semantic payload

#### Scenario: Recompose after dock geometry changes
- **WHEN** dock rows are added, removed, or reflowed while a transcript-originated selection is active
- **THEN** the selection SHALL remain clipped to the recomputed transcript rectangle in the same frame
- **AND** no stale selection background SHALL remain on a former or current dock cell

## ADDED Requirements

### Requirement: Bare A1 has one fullscreen selection owner

Bare A1 SHALL prevent the enclosing Pi fullscreen renderer from creating, extending, retaining, or painting its reverse-video fallback text selection while the custom session frame is active. A1-owned pre-input surfaces SHALL receive pointer reports according to their established routing order, after which every otherwise unclaimed fullscreen mouse report SHALL be consumed before Pi fallback handling. Keyboard and paste bytes that share an input boundary with mouse reports SHALL remain intact, and bracketed-paste payloads SHALL remain opaque even when their text resembles a mouse report.

Bare A1 SHALL exclusively own terminal mouse-report enablement and restoration for this surface. Its dark-blue complete-frame selection, controls, overlays, replacement surfaces, right-click paste, wheel navigation, and keyboard shortcuts SHALL retain their established behavior. This exclusivity SHALL NOT change pinned Pi fullscreen selection in `a1 pi` or terminal-owned regular-mode selection.

#### Scenario: Residual report cannot create fallback selection
- **WHEN** a mouse press, motion, release, wheel, or modified mouse report is not claimed by an A1-owned custom-viewport surface
- **THEN** the report SHALL be consumed before Pi's fullscreen fallback selection handler
- **AND** no reverse-video selection SHALL be created, extended, retained, or painted

#### Scenario: Scroll after modified-key input
- **WHEN** the reader uses a Shift-modified arrow shortcut or another keyboard navigation action and then scrolls or updates the bare-A1 transcript
- **THEN** no viewport-anchored reverse-video selection SHALL remain above the moving content
- **AND** any visible selection SHALL be A1's current dark-blue complete-frame selection

#### Scenario: Preserve mixed keyboard and paste input
- **WHEN** keyboard bytes or a bracketed-paste payload are delivered adjacent to residual mouse reports
- **THEN** only the residual mouse reports SHALL be removed
- **AND** keyboard bytes and the complete opaque paste payload SHALL reach their established focused input route unchanged

#### Scenario: Preserve owned pointer surfaces
- **WHEN** frame selection, an explicit control, an overlay, a selector, a replacement surface, wheel navigation, or right-click paste claims a pointer interaction
- **THEN** that owner SHALL receive and complete the interaction through its established behavior
- **AND** suppressing Pi fallback selection SHALL NOT duplicate, reorder, or discard the claimed interaction

#### Scenario: Preserve comparison and regular modes
- **WHEN** the reader uses `a1 pi` in fullscreen mode or a Pi-backed route in regular mode
- **THEN** pinned Pi or the physical terminal SHALL retain its existing selection ownership respectively
- **AND** the bare-A1 residual-report suppression SHALL NOT be applied

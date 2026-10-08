## MODIFIED Requirements

### Requirement: Gesture ownership preserves interactive surfaces

Pointer routing SHALL choose one owner for the complete press/motion/release sequence. A primary drag over ordinary exposed base-frame content SHALL belong to frame selection. A sequence beginning on an explicit viewport control or inside a modal, selector, dialog, overlay, or replacement surface SHALL retain that surface's existing ownership. A drag already owned by frame selection MAY cross controls, prompt rows, and dock rows without activating them.

For the ordinary editor, a primary press awaiting release or distinct movement SHALL NOT create or paint a provisional frame selection. A click without accepted drag movement SHALL retain caret/focus behavior, and prompt double-click or triple-click selection SHALL remain bounded to the editor's resulting semantic word or useful logical-line text without an intermediate highlight across unused row cells. Once distinct movement occurs, the sequence SHALL become frame selection from its original prompt anchor and MAY cross the prompt boundary. Right-click paste, wheel navigation, scrollbar drag, scroll-to-bottom activation, sticky-prompt activation, and link clicks SHALL retain their existing gestures and side effects.

The live progress-spinner row SHALL be ordinary exposed base-frame content for primary drag ownership. Its status component and hit region SHALL leave primary-button press, drag or motion, and release events unhandled and SHALL NOT request pointer capture or focus. Frame selection SHALL therefore be able to begin on the spinner row or cross it in either direction as one uninterrupted gesture. Spinner animation and status replacement SHALL remain presentation updates and SHALL NOT acquire, truncate, or clear an otherwise valid selection.

#### Scenario: Drag from the prompt into the footer
- **WHEN** a primary sequence begins on ordinary prompt text and distinct motion continues into footer/status rows
- **THEN** the gesture SHALL become one frame selection
- **AND** it SHALL NOT edit, replace, submit, or move the prompt selection

#### Scenario: Click the prompt without dragging
- **WHEN** a primary press and release occurs on an ordinary prompt cell without distinct movement
- **THEN** the editor SHALL receive its existing click behavior
- **AND** no frame selection or clipboard submission SHALL occur

#### Scenario: Multi-click prompt text without a full-width flash
- **WHEN** the reader double-clicks or triple-clicks nonempty ordinary prompt text and a frame is presented between any press and release
- **THEN** every visible selection SHALL remain bounded to the editor's selected word or useful logical-line text
- **AND** no intermediate frame SHALL highlight unused cells through the remainder of the prompt row

#### Scenario: Begin selection on the progress spinner
- **WHEN** a primary drag begins on an ordinary cell of the live `Working…` progress-spinner row and moves into adjacent base-session content
- **THEN** frame selection SHALL own the complete sequence from its original spinner-row anchor
- **AND** the progress status SHALL NOT handle, capture, focus, truncate, or cancel that sequence

#### Scenario: Cross the progress spinner in either direction
- **WHEN** an active frame selection moves across the live progress-spinner row from above to below or from below to above
- **THEN** the selection SHALL continue as one range with the same endpoint semantics in both directions
- **AND** spinner animation or status repaint SHALL NOT interrupt or overwrite the selected range

#### Scenario: Cross an explicit control
- **WHEN** an active frame selection moves across a scrollbar, sticky prompt, or jump-to-bottom control
- **THEN** the selection SHALL continue without activating that control
- **AND** the control's foreground presentation SHALL remain above selection paint where applicable

#### Scenario: Begin on an explicit control
- **WHEN** a fresh primary sequence begins inside an explicit control's current hit region
- **THEN** that control SHALL retain the whole gesture according to its existing behavior
- **AND** no frame selection SHALL begin from the same press

#### Scenario: Interact with a modal surface
- **WHEN** a fresh pointer sequence begins inside a visible modal, selector, dialog, overlay, or replacement surface
- **THEN** that surface SHALL retain its existing pointer behavior and focus
- **AND** base-frame selection SHALL neither paint above it nor receive the same sequence

#### Scenario: Scroll with the wheel
- **WHEN** a wheel report is addressed to exposed transcript content, transient content, or a modal-owned region
- **THEN** the existing viewport or modal wheel behavior SHALL remain in force
- **AND** wheel input SHALL NOT create or extend frame selection

## ADDED Requirements

### Requirement: Resident tabs fit current controller geometry before presentation

Whenever an authoritative attach controller reports new terminal geometry, A1 SHALL route that geometry to the selected holder and SHALL pre-fit every resident holder that is globally hidden and unclaimed. A1 SHALL exclude any tab currently viewed or controlled by another client. Whenever an attach client requests a resident tab view, the request SHALL carry that client's current terminal geometry, and after granting controller authority A1 SHALL queue any target resize before enabling the target holder's fresh surface publication. This SHALL include switching to a tab that was hidden during an outer-terminal resize and attaching directly to an already-running tab. The selected child SHALL publish a complete surface for the current controller geometry without requiring another user input, model event, or terminal resize, and the outer UI SHALL NOT commit an intermediate old-geometry target surface. A read-only spectator SHALL NOT resize any shared child.

#### Scenario: Hidden tabs reflow during authoritative resize

- **WHEN** the outer terminal changes size while a client controls one resident tab
- **THEN** A1 SHALL resize that selected holder and every globally hidden, unclaimed holder to the controller's current columns and rows
- **AND** hidden holders SHALL reflow without enabling full-surface publication to the outer terminal

#### Scenario: Switch to a pre-fitted hidden tab

- **WHEN** the user switches to a resident tab that was hidden during the latest authoritative outer resize
- **THEN** the newly selected holder SHALL already use the current controller columns and rows
- **AND** its first fresh replacement surface SHALL be fitted to those dimensions without a visible old-size target frame or another resize event

#### Scenario: Activation repairs a missed background resize

- **WHEN** a requested resident holder started after the last background resize or otherwise retained different dimensions
- **THEN** the view request SHALL carry the current controller geometry
- **AND** A1 SHALL queue that resize before enabling the target's fresh surface subscription

#### Scenario: Reattach at a different size

- **WHEN** an attach client opens an already-running resident tab from a terminal whose current dimensions differ from the tab's retained geometry
- **THEN** activation SHALL resize that holder to the attaching controller's current geometry before a fresh replacement surface commits

#### Scenario: Differently sized spectator and active tabs remain isolated

- **WHEN** another client views or controls a tab using different terminal dimensions, or a read-only client switches views
- **THEN** background fitting SHALL leave the other client's viewed or controlled tab unchanged
- **AND** the spectator SHALL fit the controller-sized presentation without resizing any shared child

### Requirement: Active outer resize uses a stable dimension curtain

While an attach client's outer terminal emits a burst of resize events, A1 SHALL replace the complete tab strip, active child surface, overlays, and cursor with a host-owned curtain showing `Resize <columns> × <rows>` centered for the latest terminal dimensions. A1 SHALL continue routing geometry and accepting fresh holder state behind the curtain but SHALL NOT present intermediate active-TUI frames. After resize events remain quiet for the bounded settle interval and the viewed holder has published current-geometry state, A1 SHALL restore the complete UI in one synchronized full repaint. If current holder state does not arrive within the bounded recovery interval, A1 SHALL restore the newest retained complete presentation rather than leave the curtain indefinitely.

#### Scenario: Continuous window resize shows only current dimensions

- **WHEN** the user drags the outer terminal boundary and multiple resize events arrive
- **THEN** every visible intermediate frame SHALL contain only the centered resize curtain for the latest columns and rows
- **AND** no tab strip, child content, overlay, or child cursor SHALL be visible behind it

#### Scenario: Resize completion restores one current frame

- **WHEN** resize events stop and the active holder publishes a surface for the final geometry
- **THEN** A1 SHALL remove the curtain after the settle interval
- **AND** SHALL restore the complete strip and child UI in one synchronized full repaint without exposing intermediate reflow

#### Scenario: Resize publication stalls

- **WHEN** resize events stop but the active holder does not publish current-geometry state within the bounded recovery interval
- **THEN** A1 SHALL remove the curtain and force a complete repaint from the newest retained presentation
- **AND** SHALL NOT leave the terminal permanently on the resize status

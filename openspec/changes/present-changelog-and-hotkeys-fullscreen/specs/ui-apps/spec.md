## ADDED Requirements

### Requirement: A reference screen presents a read-only document full screen
A1 SHALL provide one reusable A1-owned reference screen app that presents a titled, read-only document. Its frame SHALL be one border-coloured rule across the width, the visible document rows led by a bold accent title row that scrolls with the document, a second rule, and one bottom status line rendered from the screen's declared shortcuts, showing the interrupt notice while the interrupt chord is armed exactly as the settings screen does. The document rows SHALL be supplied by a provider for a content width; the screen SHALL call the provider again only when the content width changes and SHALL truncate a row wider than the content width ANSI-aware rather than wrap it. While the provider has no document yet, the screen SHALL show a loading notice and SHALL render again when the document becomes available.

The screen SHALL draw the shared scrollbar rail beside the document, honoring the `scrollbarAppearance`, `scrollbarStyle`, and `scrollbarSpeed` settings with the same geometry, presentation, hover, drag, and linger behavior as the settings screen; a hidden appearance SHALL give the rail columns back to the document. `↑` and `↓` SHALL scroll one row, `PageUp` and `PageDown` one body height, `Home` and `End` to the first and last row, the wheel by the configured wheel distance, a thumb drag SHALL follow the pointer, and a track press SHALL page toward the pointer. Scrolling SHALL clamp to the document extent. `Esc` SHALL close the screen through the host. The screen SHALL NOT consume the interrupt byte, so the host's interrupt policy applies.

#### Scenario: Open a document that fits
- **WHEN** a reference screen opens with a document shorter than its body
- **THEN** the top rule, the title, every document row, blank padding, the bottom rule, and the hint line SHALL be shown, no scroll input SHALL move the document, and the rail SHALL follow the configured appearance for content that fits

#### Scenario: Scroll a long document
- **WHEN** a document is longer than the body and the reader presses `↓`, `PageDown`, `End`, `Home`, or scrolls the wheel
- **THEN** the visible rows SHALL move by one row, one body height, to the end, to the start, and by the configured wheel distance respectively, clamped to the document extent
- **AND** the rail thumb SHALL reflect the new position and light while hovered, dragged, or within the linger window after a scroll

#### Scenario: Drag the thumb or press the track
- **WHEN** the reader presses the rail thumb and moves the pointer, or presses the track above or below the thumb
- **THEN** the document SHALL scroll to the position the thumb row maps to, or page toward the pressed row, using the shared scrollbar mapping

#### Scenario: Resize while open
- **WHEN** the terminal width or height changes while a reference screen is presented
- **THEN** the provider SHALL be asked for rows at the new content width only when that width changed, the scroll position SHALL be clamped to the new extent, and the frame SHALL fill the new rectangle exactly

#### Scenario: Close the screen
- **WHEN** the reader presses `Esc`, or presses the interrupt chord twice within its window on a host that closes on interrupt
- **THEN** the screen SHALL close through the host, and the surface that opened it SHALL be restored exactly as after closing the settings screen

## MODIFIED Requirements

### Requirement: The application owner defines its route surface seam
The UI application owner SHALL define the vendor-neutral contract by which a host claims an application route, opens its surface, forwards keyboard and pointer input, receives render requests, and observes close or product-exit requests. Opening a route MAY carry an optional neutral route input holding a caller-supplied document; a route that does not use the input SHALL behave exactly as when none is supplied. A vendor integration MAY adapt that contract to its overlay/runtime API but SHALL NOT redefine the application route lifecycle as a vendor-owned contract.

#### Scenario: Open an app from a vendor-backed shell
- **WHEN** a declared application route is invoked through a vendor-backed shell
- **THEN** the shell SHALL receive a neutral application route surface
- **AND** the application registry and composition SHALL not import a vendor-owned route contract

#### Scenario: Open a route with a supplied document
- **WHEN** a shell opens a claimed route with a route input carrying a document
- **THEN** a route that presents documents SHALL present the supplied document instead of loading its own
- **AND** a route that does not use route input SHALL open exactly as it does without one

#### Scenario: Preserve an existing integration import
- **WHEN** an existing consumer imports the route types from the Pi integration public entry during migration
- **THEN** that entry MAY re-export the neutral types without owning a second declaration

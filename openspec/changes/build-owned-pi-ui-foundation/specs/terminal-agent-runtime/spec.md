## MODIFIED Requirements

### Requirement: Transparent sessions advertise their limitations
A transparent session SHALL advertise no AddOne-authoritative resident surface, internal pane, virtual scrollback, replayable display stream, or visual reconnection. AddOne SHALL NOT claim those capabilities from a shadow parser or lifecycle metadata. Transparent direct attachment SHALL remain independent from both the AddOne-owned Pi UI and the terminal-host proof paths, and SHALL NOT be used to manufacture UI customization by interception.

#### Scenario: Foreground owner disconnects
- **WHEN** the foreground owner disappears from a non-detachable transparent session
- **THEN** AddOne SHALL apply bounded declared cleanup and report the result rather than reconstruct terminal continuity

#### Scenario: Internal arbitrary-CLI tabs are requested
- **WHEN** a feature needs inactive resident terminal surfaces, switching, clipping, overlays, or reconnection
- **THEN** a separate composed-terminal capability SHALL be planned and certified instead of intercepting transparent mode

#### Scenario: Owned UI is requested
- **WHEN** the user selects the AddOne-owned Pi UI development mode
- **THEN** AddOne SHALL enter the owned fullscreen UI path rather than routing the stock Pi process through transparent attachment and mutating its terminal surface

#### Scenario: Transparent fallback is selected
- **WHEN** an explicit launch mode or recovery policy selects transparent direct attachment
- **THEN** the child and physical terminal SHALL retain native rendering and input authority without initializing the owned UI, terminal-host proof, parser, renderer, topology, or input router

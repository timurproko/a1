## MODIFIED Requirements

### Requirement: Transparent sessions advertise their limitations
A transparent session SHALL advertise no AddOne-authoritative resident surface, internal pane, virtual scrollback, replayable display stream, or visual reconnection. AddOne SHALL NOT claim those capabilities from a shadow parser or lifecycle metadata. Transparent direct attachment SHALL remain an explicit single-foreground fallback and comparison baseline and SHALL NOT be routed through the composed-terminal implementation.

#### Scenario: Foreground owner disconnects
- **WHEN** the foreground owner disappears from a non-detachable transparent session
- **THEN** AddOne SHALL apply bounded declared cleanup and report the result rather than reconstruct terminal continuity

#### Scenario: Internal arbitrary-CLI tabs are requested
- **WHEN** a feature needs inactive resident terminal surfaces, switching, clipping, overlays, or reconnection
- **THEN** AddOne SHALL use the separately declared composed-terminal capability and SHALL NOT add interception to transparent mode

#### Scenario: Transparent fallback is selected
- **WHEN** an explicit launch mode or recovery policy selects transparent direct attachment
- **THEN** the child and physical terminal SHALL retain native rendering and input authority without traversing or initializing the composed native host, pseudoterminal, parser, model, renderer, topology, or input router

#### Scenario: Composed host is unavailable or fails
- **WHEN** the composed native host is unsupported, fails its proof gate, or exits abnormally
- **THEN** transparent direct attachment SHALL remain independently launchable without loading or recovering through composed infrastructure

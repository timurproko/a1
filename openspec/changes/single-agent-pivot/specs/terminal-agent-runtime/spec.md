## ADDED Requirements

### Requirement: Transparent launch tracks lifecycle but no terminal bytes
A transparent launch owner SHALL track only validated launch intent, the directly attached child's process identity, stop intent, and lifecycle outcome. Ordinary terminal bytes and reconstructed display state SHALL NOT pass through A1, and no background coordinator SHALL be required to run the child.

#### Scenario: Handoff completes
- **WHEN** a transparent child starts successfully
- **THEN** its launch owner SHALL record the child's process identity and wait for its exit without ordinary terminal reads, writes, parsing, relaying, or render timers

#### Scenario: Another transparent session is active
- **WHEN** a transparent child starts while other transparent sessions are active in other terminals
- **THEN** A1 SHALL run the new child independently without reassigning or terminating another session

#### Scenario: Update installs a newer release
- **WHEN** an update installs a newer release while transparent sessions are active
- **THEN** A1 SHALL leave those sessions running on their release without introducing terminal emulation or a cleanup path that ends them

## MODIFIED Requirements

### Requirement: Transparent sessions advertise their limitations
A transparent session SHALL advertise no A1-authoritative retained surface, internal pane, virtual scrollback, replayable display stream, or visual reconnection. A1 SHALL NOT claim those capabilities from a shadow parser or lifecycle metadata. Transparent direct attachment SHALL remain independent from the A1-owned Pi UI and SHALL NOT be used to manufacture UI customization by interception.

#### Scenario: Foreground owner disconnects
- **WHEN** the foreground owner disappears from a non-detachable transparent session
- **THEN** A1 SHALL apply bounded declared cleanup and report the result rather than reconstruct terminal continuity

#### Scenario: Internal arbitrary-CLI tabs are requested
- **WHEN** a feature needs inactive retained terminal surfaces, switching, clipping, overlays, or reconnection
- **THEN** a separate composed-terminal capability SHALL be planned and certified instead of intercepting transparent mode

#### Scenario: Owned UI is requested
- **WHEN** the user selects the A1-owned Pi UI development mode
- **THEN** A1 SHALL enter the owned fullscreen UI path rather than routing the stock Pi process through transparent attachment and mutating its terminal surface

#### Scenario: Transparent fallback is selected
- **WHEN** an explicit launch mode or recovery policy selects transparent direct attachment
- **THEN** the child and physical terminal SHALL retain native rendering and input authority without initializing the owned UI, parser, renderer, topology, or input router

## REMOVED Requirements

### Requirement: Transparent instance registration carries lifecycle but no terminal bytes
**Reason**: Restated under a new name without its resident-tab, supervisor, launch-guardian, containment, native-host, or timestamp scenarios, which no longer describe the single-agent product.

**Migration**: See the ADDED requirement "Transparent launch tracks lifecycle but no terminal bytes".

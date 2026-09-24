## MODIFIED Requirements

### Requirement: Interactive launch forms share one non-detachable instance boundary
The immutable interactive launcher SHALL establish the same non-detachable launch-instance ownership boundary before selecting bare `a1` or prerelease `a1 pi`. Both forms SHALL retain the shared owned rendering and input pipeline inside that boundary. The lifecycle layer SHALL own process containment and cleanup without reading terminal input, parsing output, reconstructing display state, or selecting a second rendering path. When resident agents are enabled, bare `a1`'s launch instance SHALL own its foreground UI client and every process that client creates, while tabbed agents SHALL belong to the explicit resident agent host capability rather than to the launch instance.

#### Scenario: Launch owned A1
- **WHEN** the shell selects bare `a1`
- **THEN** the owned product UI and every process it creates SHALL belong to that command's launch instance

#### Scenario: Launch owned A1 with resident agents
- **WHEN** the shell selects bare `a1` while resident agents are enabled
- **THEN** the foreground UI client SHALL belong to that command's launch instance
- **AND** the resident host and agent workers SHALL be started only through the explicit resident capability and SHALL NOT be members of the launch instance

#### Scenario: Launch the Pi comparison
- **WHEN** the shell selects prerelease `a1 pi`
- **THEN** the owned comparison UI and every process it creates SHALL belong to that command's launch instance without changing the shared rendering pipeline

#### Scenario: Another instance is active
- **WHEN** the shell launches while one or more interactive instances already exist
- **THEN** it SHALL create another independent instance rather than acquiring a product-wide foreground slot

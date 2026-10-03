## MODIFIED Requirements

### Requirement: Interactive launch forms use the owned Pi UI pipeline
Bare `a1` SHALL launch the A1-owned product surface directly. Explicit prerelease `a1 pi` SHALL use the same owned rendering and input pipeline with A1-specific surfaces withheld and Pi's ordinary user profile selected. Profile selection SHALL NOT introduce transparent child attachment, a PTY, a terminal parser, a byte relay, or a second rendering path. The redundant `a1 ui` route SHALL NOT be exposed. On Windows x64 only, when the opt-in `tabs.resident` setting is enabled, bare `a1` SHALL instead run the native terminal-host attach client over resident tabs, each of which SHALL run the same owned product UI in its own holder-owned pseudoterminal; pseudoterminals, terminal models, and composition SHALL exist only inside the resident terminal-host capability, and `a1 pi` SHALL remain unchanged. This change SHALL leave `tabs.resident` disabled by default and SHALL leave unsupported platforms on the direct owned path.

#### Scenario: Launch bare A1
- **WHEN** the user runs `a1`
- **THEN** A1 SHALL start the owned product UI without requiring a profile argument

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare A1 after a previous owned foreground session exited
- **THEN** with resident tabs disabled A1 SHALL start a fresh owned session without replaying the prior retained terminal surface
- **AND** with resident tabs enabled A1 SHALL reattach to the running tabs and present their current retained surfaces

#### Scenario: Launch bare A1 with resident tabs
- **WHEN** the user runs `a1` on Windows x64 with resident tabs explicitly enabled
- **THEN** every tab SHALL run the owned product UI, and Node SHALL NOT read, relay, or render tab terminal bytes

#### Scenario: Resident tabs are not enabled
- **WHEN** the setting remains at its default or the platform is unsupported
- **THEN** bare A1 SHALL use the direct single-agent owned path and SHALL NOT start the resident host

#### Scenario: Launch the Pi comparison
- **WHEN** the user runs prerelease `a1 pi`
- **THEN** A1 SHALL use the shared owned pipeline with product surfaces withheld and Pi's ordinary profile selected

#### Scenario: Request the removed development alias
- **WHEN** the user runs `a1 ui`
- **THEN** A1 SHALL reject the unsupported profile and SHALL NOT silently select another runtime

### Requirement: Interactive launch forms share one non-detachable instance boundary
The immutable interactive launcher SHALL establish the same non-detachable launch-instance ownership boundary before selecting bare `a1` or prerelease `a1 pi`. Both forms SHALL retain the shared owned rendering and input pipeline inside that boundary. The lifecycle layer SHALL own process containment and cleanup without reading terminal input, parsing output, reconstructing display state, or selecting a second rendering path. When resident tabs are enabled, bare `a1`'s launch instance SHALL own its attach client and every process that client creates without explicit resident breakaway, while the resident server, session holders, and tab processes SHALL belong to the explicit resident terminal-host capability.

#### Scenario: Launch owned A1
- **WHEN** the shell selects bare `a1`
- **THEN** the owned product UI and every process it creates SHALL belong to that command's launch instance

#### Scenario: Launch owned A1 with resident tabs
- **WHEN** the shell selects bare `a1` while resident tabs are enabled
- **THEN** the attach client SHALL belong to that command's launch instance
- **AND** the resident server, holders, and tab processes SHALL be started only through the explicit resident capability and SHALL NOT be members of the launch instance

#### Scenario: Launch the Pi comparison
- **WHEN** the shell selects prerelease `a1 pi`
- **THEN** the owned comparison UI and every process it creates SHALL belong to that command's launch instance without changing the shared rendering pipeline

#### Scenario: Another instance is active
- **WHEN** the shell launches while one or more interactive instances already exist
- **THEN** it SHALL create another independent instance rather than acquiring a product-wide foreground slot

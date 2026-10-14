## MODIFIED Requirements

### Requirement: Interactive launch forms use the owned Pi UI pipeline
Bare `a1` SHALL launch the A1-owned product surface through resident tabs on supported platforms (Windows x64, Linux x64, macOS arm64). Argument-free `a1 solo` SHALL launch the same owned product surface directly as one agent, without a tab strip, Tabs settings section, or resident-host initialization. Explicit prerelease `a1 pi` SHALL use the same owned rendering and input pipeline with A1-specific surfaces withheld and Pi's ordinary user profile selected. Profile selection SHALL NOT introduce transparent child attachment, a PTY, a terminal parser, a byte relay, or a second rendering path. The redundant `a1 ui` route SHALL NOT be exposed. Each resident tab SHALL run the same owned product UI in its own holder-owned pseudoterminal; pseudoterminals, terminal models, and composition SHALL exist only inside the resident terminal-host capability. Direct solo and Pi-comparison runtimes SHALL share only the canonical session-writer admission guard with resident runtimes; this guard SHALL NOT initialize a terminal host. An unsupported platform or resident-host startup failure SHALL leave bare `a1` on the direct owned path.

#### Scenario: Launch bare A1
- **WHEN** the user runs `a1`
- **THEN** A1 SHALL start the owned product UI without requiring a profile argument

#### Scenario: Launch after a prior exit
- **WHEN** the user runs bare A1 after a previous resident foreground client exited
- **THEN** A1 SHALL reattach to the running tabs and present their current retained surfaces

#### Scenario: Launch bare A1 with resident tabs
- **WHEN** the user runs `a1` on a supported platform
- **THEN** every tab SHALL run the owned product UI, and Node SHALL NOT read, relay, or render tab terminal bytes

#### Scenario: Launch solo A1
- **WHEN** the user runs argument-free `a1 solo`
- **THEN** A1 SHALL start a fresh direct single-agent owned UI without a tab strip or Tabs settings section and SHALL NOT start the resident host

#### Scenario: Reject solo arguments
- **WHEN** the user supplies an argument after `a1 solo`
- **THEN** A1 SHALL reject the command without starting an interactive runtime

#### Scenario: Resident tabs are unsupported
- **WHEN** the platform is unsupported or the resident host cannot start safely
- **THEN** bare A1 SHALL use the direct single-agent owned path and SHALL NOT leave an unverified resident host running

#### Scenario: Resident tabs are not enabled
- **WHEN** the user runs `a1 solo` or bare A1 uses unsupported-platform fallback
- **THEN** A1 SHALL use the direct single-agent owned path and SHALL NOT start the resident host

#### Scenario: Launch the Pi comparison
- **WHEN** the user runs prerelease `a1 pi`
- **THEN** A1 SHALL use the shared owned pipeline with product surfaces withheld and Pi's ordinary profile selected

#### Scenario: Request the removed development alias
- **WHEN** the user runs `a1 ui`
- **THEN** A1 SHALL reject the unsupported profile and SHALL NOT silently select another runtime

### Requirement: Interactive launch forms share one non-detachable instance boundary
The immutable interactive launcher SHALL establish the same non-detachable launch-instance ownership boundary before selecting bare `a1`, `a1 solo`, or prerelease `a1 pi`. All forms SHALL retain the shared owned rendering and input pipeline inside that boundary. The lifecycle layer SHALL own process containment and cleanup without reading terminal input, parsing output, reconstructing display state, or selecting a second rendering path. Bare `a1`'s launch instance SHALL own its attach client and every ordinary descendant that client creates, without enabling job-wide breakaway, while the resident server, session holders, and tab processes SHALL belong to the explicit resident terminal-host capability.

#### Scenario: Launch owned A1 directly
- **WHEN** the shell selects `a1 solo` or bare `a1` must use unsupported-platform fallback
- **THEN** the owned product UI and every process it creates SHALL belong to that command's launch instance

#### Scenario: Launch owned A1
- **WHEN** the shell selects `a1 solo` or bare `a1` uses unsupported-platform fallback
- **THEN** the owned product UI and every process it creates SHALL belong to that command's launch instance

#### Scenario: Launch owned A1 with resident tabs
- **WHEN** the shell selects bare `a1` on a supported platform
- **THEN** the attach client SHALL belong to that command's launch instance
- **AND** the resident server, holders, and tab processes SHALL be started only through the explicit resident capability and SHALL NOT be members of the launch instance

#### Scenario: Launch the Pi comparison
- **WHEN** the shell selects prerelease `a1 pi`
- **THEN** the owned comparison UI and every process it creates SHALL belong to that command's launch instance without changing the shared rendering pipeline

#### Scenario: Another instance is active
- **WHEN** the shell launches while one or more interactive instances already exist
- **THEN** it SHALL create another independent instance rather than acquiring a product-wide foreground slot

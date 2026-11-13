## ADDED Requirements

### Requirement: Pi-family identity preserves the A1 product
Normal A1 SHALL publish AI_AGENT=pi and PI_CODING_AGENT=true before extensions and child helpers need them without changing its product identity, settings, history or profile. An independent interactive process SHALL remove inherited Firstmate host PID/start claims and shell session metadata before extension loading. Same-process embedded sessions and ordinary child helpers SHALL retain the current host's claims. Firstmate's extension alone SHALL establish its native host ownership evidence.

#### Scenario: Launch from another Pi host
- **WHEN** a new A1 interactive process inherits another host's FM_PI_SESSION_PID and FM_PI_SESSION_START
- **THEN** those claims SHALL be absent until the new host's loaded Firstmate extension publishes its own identity
- **AND** current shell session metadata SHALL continue to be resolved by Pi at command execution time

### Requirement: Opt-in executable launches normal A1
A1 SHALL ship a separately named Pi-compatible entry and a real executable pi shim in an opt-in PATH directory. It SHALL use normal A1 profile/features and supported immutable-release/bootstrap/guardian launching, SHALL NOT globally register pi or overwrite another installation, and SHALL NOT route through comparison mode or an agent fallback.

#### Scenario: Dedicated Firstmate environment
- **WHEN** the documented opt-in directory precedes other Pi executables on the main and worker PATH
- **THEN** executable resolution SHALL select the packaged A1-compatible entry for both without changing global Pi resolution

### Requirement: Bounded invocation and discovery are truthful
The compatibility entry SHALL honor positional instructions and the literal boundary, model/provider/thinking, repeated explicit extensions, session selection/storage and tool exclusions. It SHALL preserve prompt bytes within the existing bounded payload and fail clearly for unsupported, missing or oversized input. It SHALL expose truthful help/version and real available-model listing without an interactive session or LLM request. Optional trust/display flags SHALL NOT be advertised without implementation. Extension flags SHALL require an actual loaded registration.

#### Scenario: Explicit worker invocation
- **WHEN** Firstmate supplies a complete positional instruction with model/provider/effort, extensions and excluded tools
- **THEN** normal A1 SHALL receive the complete instruction once after successful startup and honor each selection through the real packaged launch path
- **AND** invocation model/effort SHALL override resumed state without rewriting saved defaults

#### Scenario: Unsupported selected release
- **WHEN** the ultimately selected retained UI lacks authenticated support for compatibility options
- **THEN** launch SHALL fail before rendering rather than drop options, forward unknown arguments, or retry without instructions

### Requirement: Real extension lifecycle retains owned UI and task isolation
A1 SHALL preserve Firstmate's required public event bus, custom tools/renderers, status/widgets/notices and input delivery inside the owned UI. Startup context SHALL reach the model once. Agent start, turn end and logical settlement SHALL remain distinct. Queued follow-ups, steering and replacement SHALL retain their SDK meaning without duplicate supervision or lost pending notifications. Attached built-in tools SHALL use the task copy while independent helpers retain their intended operational cwd.

#### Scenario: Replace a supervised session
- **WHEN** a session is replaced or reloaded
- **THEN** the old extension runtime SHALL shut down and the replacement SHALL start exactly once using the correct profile/authentication source
- **AND** pending delivery SHALL not be mistaken for low-level run settlement

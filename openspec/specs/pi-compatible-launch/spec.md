# pi-compatible-launch Specification

## Purpose
TBD - created by archiving change firstmate-pi-compatibility. Update Purpose after archive.

## Requirements

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
The compatibility entry SHALL honor positional instructions and the literal boundary, model/provider/thinking, repeated explicit extensions, session selection/storage and tool exclusions. It SHALL preserve prompt bytes within the existing bounded payload and fail clearly for unsupported, missing or oversized input. It SHALL expose truthful help/version and real available-model listing without an interactive session or LLM request. Optional trust/display flags SHALL NOT be advertised without implementation. Extension flags SHALL require an actual loaded registration. While Firstmate's primary extension publishes live loaded markers from its factory, a catalog invocation carrying Firstmate operational home/root/state selectors or inherited native-host claims SHALL fail explicitly before loading any extension factory rather than risk replacing a live session marker.

#### Scenario: Explicit worker invocation
- **WHEN** Firstmate supplies a complete positional instruction with model/provider/effort, extensions and excluded tools
- **THEN** normal A1 SHALL receive the complete instruction once after successful startup and honor each selection through the real packaged launch path
- **AND** invocation model/effort SHALL override resumed state without rewriting saved defaults

#### Scenario: Firstmate-scoped catalog probe
- **WHEN** catalog discovery inherits Firstmate operational selectors or native-host claims while factory-time marker publication remains present
- **THEN** the compatibility entry SHALL refuse with focused lifecycle guidance before loading factories or touching live markers
- **AND** it SHALL NOT report a successful catalog response or silently substitute a different profile

#### Scenario: Unsupported selected release
- **WHEN** the ultimately selected retained UI lacks authenticated support for compatibility options
- **THEN** launch SHALL fail before rendering rather than drop options, forward unknown arguments, or retry without instructions

### Requirement: Real extension lifecycle retains owned UI and task isolation
A1 SHALL preserve Firstmate's required public event bus, custom tools/renderers, status/widgets/notices and input delivery inside the owned UI. Startup context SHALL reach the model once. Agent start, turn end and logical settlement SHALL remain distinct. Queued follow-ups, steering and replacement SHALL retain their SDK meaning without duplicate supervision or lost pending notifications. Attached built-in tools SHALL use the task copy while independent helpers retain their intended operational cwd. Asynchronous extension startup SHALL finish before an owned initial prompt or replacement callback is admitted. Reattaching the owned UI SHALL update its target without replaying session startup, and SDK reload SHALL retain its single startup event. Generation-scoped UI reset SHALL precede replacement startup widgets and notices.

#### Scenario: Initial prompt waits for startup
- **WHEN** a loaded extension's session startup is asynchronous and an initial literal prompt is supplied
- **THEN** A1 SHALL await startup and present its startup surfaces before submitting that prompt once
- **AND** extension-provided startup context SHALL reach the model through the real session hooks

#### Scenario: Replace a supervised session
- **WHEN** a session is replaced or reloaded
- **THEN** the old extension runtime SHALL shut down and the replacement SHALL start exactly once using the correct profile/authentication source
- **AND** pending delivery SHALL not be mistaken for low-level run settlement

### Requirement: Normal-product APIs do not depend on launch grammar

Ordinary normal-profile A1 and the packaged Pi-compatible normal-profile entry SHALL expose the same supported A1 runtime APIs and integration capabilities under equivalent settings and host context. The compatible entry SHALL NOT lose session color control, native terminal identity reporting, session/worktree context or other supported product APIs because it accepts Pi-compatible arguments. API clients SHALL use the existing public A1 control commands and response contracts for sessions started by either entry. This parity SHALL NOT require identical invocation grammars, new aliases, a companion or a second API implementation. The distinct comparison `a1 pi` profile and noninteractive commands SHALL retain their intentional exclusions and existing behavior.

#### Scenario: Address either normal-product session
- **WHEN** one supported session starts through ordinary A1 and another through the packaged compatible entry in equivalent supported contexts
- **THEN** public A1 API clients SHALL be able to address each session using the same supported selectors, commands, capability semantics, responses and errors
- **AND** each session SHALL retain its own runtime identity and existing profile, extension and worktree isolation

#### Scenario: Compatible startup loads asynchronous extensions
- **WHEN** a compatible invocation loads an asynchronous extension before its interactive session becomes usable
- **THEN** the session SHALL retain the normal product's API integration lifecycle and runtime identity
- **AND** terminal identity SHALL NOT be advertised as usable before its current color endpoint is ready

#### Scenario: Compatible parser receives ordinary command words as instructions
- **WHEN** an instruction in the compatible grammar contains words used by the ordinary A1 control CLI
- **THEN** compatible parsing SHALL preserve its existing literal instruction meaning rather than introduce a second API-command grammar
- **AND** external control through the public A1 command SHALL remain available for the resulting session

#### Scenario: Comparison and noninteractive commands remain distinct
- **WHEN** the user selects the actual comparison profile or runs help, version, catalog or another noninteractive command
- **THEN** compatible-launch API parity SHALL NOT enable a product endpoint or reporter that the selected operation does not support
- **AND** existing noninteractive side-effect restrictions SHALL remain in force

### Requirement: Default normal-product entries share delivered contracts without compatibility modes

Ordinary A1 and the optional pi naming entry SHALL use one public option normalizer and the same existing normal-product session/runtime/API lifecycle. Both SHALL accept the approved Pi-style positional instructions and boundary grammar while preserving their actual leading control namespaces and safe product uninstall distinction. Executable spelling SHALL not determine product capabilities or select a reduced feature set.

The versioned complete target SHALL remain tracked by contract ID, source, owner/test, implementation status and evidence scope. P1 shared CLI/session/model/trust work SHALL be labeled partial; later resources/maintenance, machine/programmatic/input transports and extension/UI conformance SHALL remain explicit pending deliveries, not permanent subset exclusions. Not-yet-delivered contracts SHALL fail usefully and SHALL not be accepted and ignored.

#### Scenario: Equivalent default entries
- **WHEN** equivalent delivered options and instructions enter either public name
- **THEN** the same normal A1 services, settings, APIs and applicable ownership guarantees SHALL apply

#### Scenario: Later transport is requested
- **WHEN** a documented transport or option belongs to a not-yet-integrated delivery
- **THEN** P1 SHALL fail with clear guidance rather than launch the wrong runtime or misrepresent parity

#### Scenario: Existing lifecycle is reused
- **WHEN** shared CLI/session work starts or replaces a normal-product runtime
- **THEN** #927's captured identity, readiness, reporting and disposal ownership SHALL remain authoritative without another endpoint or reporter

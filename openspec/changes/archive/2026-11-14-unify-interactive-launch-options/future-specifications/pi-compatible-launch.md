## MODIFIED Requirements

### Requirement: Bounded invocation and discovery are truthful

Normal A1 SHALL expose the complete documented public CLI, session, model, tool, resource, maintenance, extension, SDK and execution-transport contracts of the exact Pi version pinned by the implementation baseline, except specifically approved visible product/safety differences or identified external blockers. Compatibility SHALL be the default product interface, not a separately selected interactive subset. Public validation SHALL be shared by ordinary and pi-named entries, with small grammar adapters only for approved command/prompt collisions. Unsupported or malformed requests SHALL fail clearly rather than accept-and-ignore, lose options or select another runtime/account.

Invocation SHALL support ordered prompt, file/image and stdin inputs with the documented transport semantics and explicit ordinary A1 literal boundary. Metadata transport SHALL remain bounded and validated without imposing an undisclosed universal prompt/file/image size limit or truncation. Internal serialized runtime options SHALL NOT be public CLI syntax. Model/provider/effort, session storage/persistence, tool selection, resources, trust and display options SHALL have actual implemented effects and errors; recognizing a flag SHALL NOT be counted as compatibility evidence.

Help/version SHALL retain truthful A1 and exact embedded Pi identity without extension factories, session startup, interactive publication or model contact. Model discovery SHALL use the effective A1 profile and actual registered models without interactive startup or a model request. While Firstmate factories publish live loaded/host evidence before session lifecycle admission, Firstmate-scoped catalog discovery SHALL fail before factories; this SHALL remain a tracked external prerequisite, not a permanent exclusion or a successful compatibility claim.

#### Scenario: Explicit worker invocation

- **WHEN** a supported invocation supplies ordered instructions, model/provider/effort, resources and tool selection through either public entry
- **THEN** the normal A1 services SHALL receive each input once in the declared order and honor each selection through the actual packaged launch path
- **AND** invocation model/effort/credential overrides SHALL NOT rewrite defaults or borrow another profile

#### Scenario: Firstmate-scoped catalog probe

- **WHEN** catalog discovery carries Firstmate operational selectors or host claims while factory-time publication remains present
- **THEN** A1 SHALL refuse with focused lifecycle guidance before factories touch live evidence
- **AND** that refusal SHALL remain an explicit unresolved prerequisite in the compatibility inventory

#### Scenario: Unsupported selected release

- **WHEN** the ultimately selected retained runtime lacks authenticated support for a requested transport or payload
- **THEN** launch SHALL fail before executing the incompatible request rather than discard options, retry without inputs or run standalone Pi

#### Scenario: Safe public probes

- **WHEN** either entry receives supported standalone help or version
- **THEN** it SHALL return truthful factory-free metadata without interactive or model side effects
- **AND** any difference from upstream dynamic-help/version text SHALL remain visible in the approved differences inventory

### Requirement: Normal-product APIs do not depend on launch grammar

Ordinary normal-profile A1 and the pi-named entry SHALL expose the same applicable A1 product APIs and integration capabilities under equivalent settings, session storage, transport and real host context. This SHALL include sessions created through supported machine transports or the A1 programmatic facade where capability and ownership prerequisites exist. Executable spelling SHALL NOT disable product features. External API clients SHALL use the existing A1 command/response contracts; the compatible name SHALL NOT introduce another endpoint, registry or lifecycle implementation.

Runtime/session identity, writer ownership, task isolation, endpoint readiness, native reporting fences and disposal SHALL remain owned by the shared existing services. Terminal-only features SHALL require an actual supported terminal; durable-only features SHALL expose an approved explicit storage-capability limitation for genuine in-memory sessions rather than forge history. Comparison `a1 pi` remains distinct. Help/version/catalog and other operations that create no session SHALL retain their side-effect restrictions.

#### Scenario: Address either normal-product session

- **WHEN** equivalent sessions start through ordinary A1, the pi-named entry or an applicable machine/programmatic transport
- **THEN** existing API clients SHALL address them with the same supported selectors, capability meanings, responses and ownership checks
- **AND** each SHALL retain one captured runtime identity and its own profile/session/task isolation

#### Scenario: Compatible startup loads asynchronous extensions

- **WHEN** a session loads asynchronous extensions or replaces its active session
- **THEN** the shared product API lifecycle SHALL preserve startup ordering, current endpoint readiness and reporting ownership
- **AND** no usable identity SHALL be advertised before its actual endpoint/session is ready

#### Scenario: Compatible parser receives ordinary command words as instructions

- **WHEN** compatible instruction text contains ordinary A1-only command words or follows its explicit literal boundary
- **THEN** it SHALL retain instruction meaning rather than enter A1 control dispatch
- **AND** any newly reserved pinned Pi maintenance word SHALL follow only the explicitly approved leading-word migration, never mid-invocation guessing

#### Scenario: Comparison and noninteractive commands remain distinct

- **WHEN** the comparison profile or help, version, catalog or another operation without a session executes
- **THEN** no normal-product endpoint or terminal reporter SHALL be enabled merely to claim parity
- **AND** actual machine-transport sessions SHALL retain their applicable session capabilities under the shared lifecycle rather than inherit metadata-command exclusions

## ADDED Requirements

### Requirement: Execution transports share the normal-product session services

Interactive, print, structured JSON and RPC execution SHALL use the same applicable A1 launch/session/model/settings/tool/resource services through documented Pi public integration APIs or owned implementations. A1 SHALL NOT obtain compatibility by delegating to upstream CLI as a second agent, comparison profile, ambient executable, daemon or translation service. Interactive work SHALL retain A1's custom UI; machine protocols SHALL use their documented noninteractive streams and mode capabilities.

#### Scenario: One-shot text or JSON

- **WHEN** a user selects print or JSON execution, explicitly or through the documented redirected-stream rules
- **THEN** the shared runtime SHALL process file/image/stdin/prompt inputs and emit the pinned final-text or header/event JSONL contract with its respective exit semantics
- **AND** bootstrap, extensions, diagnostics and terminal cleanup SHALL NOT corrupt protocol stdout

#### Scenario: Bidirectional RPC

- **WHEN** a client starts RPC through either public entry
- **THEN** all documented requests, correlated responses, session events and extension UI records SHALL retain pinned framing, schemas, errors and asynchronous acceptance/settlement semantics
- **AND** cancellation, EOF, signals and extension shutdown SHALL dispose the shared owned runtime and release resources without a second writer or lifecycle

### Requirement: Shared services cover all documented session and resource contracts

A1 SHALL implement the pinned new/continue/resume/fork/custom-ID/name/persistence/storage, history/projection/export, model/provider/effort/authentication, tool loadout/exposure, resource/package/configuration, trust and environment contracts through their existing owners. Unavoidable differences SHALL be specifically approved and remain visible. Previously declining RPC, CLI tool controls, shell auth or remaining session options because A1 was interactive-only SHALL NOT exclude them from this target.

#### Scenario: Resource controls have real effects

- **WHEN** either entry selects documented tool/resource/builtin inclusion, exclusion, explicit paths, system prompts or discovery-disable controls
- **THEN** the effective session SHALL reflect the pinned precedence and registration behavior, including extension/MCP tools
- **AND** project trust, account/profile isolation and explicit-resource failure checks SHALL remain in force

#### Scenario: Ephemeral execution

- **WHEN** a user selects no-persistence execution
- **THEN** A1 SHALL use a real in-memory session without fabricated transcript files or resume hints
- **AND** applicable APIs SHALL use its real runtime/session identity while specifically approved durable-only limitations remain explicit

### Requirement: Extension and SDK conformance is independent of the selected entry

A1 SHALL preserve the documented extension lifecycle/events, tools/commands/messages, queueing and idle-trigger behavior, event bus, resource/provider registrations, UI contracts and programmatic session operations across applicable transports. A typed public A1 host/session facade SHALL reuse existing service and ownership implementations rather than require consumers to bypass A1 through raw upstream construction. Public vendor imports SHALL remain inside the established integration boundary.

#### Scenario: Idle extension delivery starts a turn

- **WHEN** a loaded extension invokes a public API that promises an idle turn, including sendMessage with triggerTurn or idle sendUserMessage
- **THEN** the appropriate turn SHALL start once without a user keypress
- **AND** nextTurn-only delivery SHALL NOT start a turn and queued steering SHALL NOT be reported as idle-wake proof

#### Scenario: UI follows actual transport capability

- **WHEN** an extension uses dialogs, components, renderers, editors, widgets, themes or keyboard/input APIs
- **THEN** A1 interactive execution SHALL provide the documented functional UI contracts through its owned renderer
- **AND** RPC/JSON/print SHALL provide exactly their documented dialog protocol or unavailable behavior rather than a reduced product edition selected by executable name

#### Scenario: Programmatic replacement and secondary sessions

- **WHEN** an A1 SDK host creates secondary sessions or replaces, reloads, imports, forks or disposes a session
- **THEN** model/settings/resource/session semantics and applicable A1 guarantees SHALL remain shared and independently scoped
- **AND** stale contexts, old subscriptions and cancelled replacements SHALL NOT act on the new session

### Requirement: Versioned compatibility claims require a complete evidence inventory

The tracked engineering inventory SHALL cover every documented public contract of the exact pinned target with source identity, syntax/schema/semantics/errors/effects, both entries' behavior, owner/test, status, implementation outcome, approved differences and evidence scope. Existing export/adoption baselines SHALL remain authoritative within their current owners, but a flag, method or historical disposition alone SHALL NOT count as behavioral proof. Any partial delivery, external prerequisite or approved difference SHALL remain explicit; none SHALL be hidden behind an interactive-subset exclusion.

#### Scenario: Packaged conformance

- **WHEN** compatibility is claimed for a candidate
- **THEN** actual packaged entries, supported development routing, authenticated selected-release transport and applicable SDK/machine-pipe fixtures SHALL establish observable behavior with isolated state and deterministic providers
- **AND** unexercised platforms or live consumers SHALL NOT be described as certified

#### Scenario: Dependency changes

- **WHEN** a later Pi upgrade changes documented public grammar, types, events, settings or behavior
- **THEN** the existing upgrade process SHALL re-inspect the affected inventory and require current version-specific evidence or explicit dispositions
- **AND** prior-version results SHALL NOT silently authorize a new compatibility claim

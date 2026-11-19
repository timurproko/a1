## MODIFIED Requirements

### Requirement: Launch profiles use separate user roots

The normal A1 product SHALL default to `<home>/.a1/agent`, including global `settings.json` with Pi-owned root settings and the A1-owned namespace. Ordinary and pi-named entries, interactive/machine transports and applicable programmatic sessions SHALL use the same default. An explicitly supplied supported public configuration-root override MAY select a different root as user-selected storage after validation; contradictory root overrides SHALL fail, and selection SHALL NOT copy or merge credentials/settings from another profile. The Pi comparison SHALL retain its separate ordinary Pi profile behavior and SHALL NOT consume the A1-owned section. Effective-home resolution SHALL remain independent of package/materialized-release paths and testable hermetically.

#### Scenario: Bare A1 resolves its profile

- **WHEN** normal A1 starts with effective home H and no explicit root override
- **THEN** the engine and A1 settings SHALL use H/.a1/agent/settings.json and read only their owned portions

#### Scenario: Pi comparison resolves its profile

- **WHEN** the actual comparison profile starts
- **THEN** its configuration-root handling SHALL preserve ordinary Pi settings without consuming A1 product settings

#### Scenario: Launch another installed version

- **WHEN** another A1 version launches under the same home and explicit root selection
- **THEN** it SHALL use the same selected normal-product settings root, not one under its package or materialized release

#### Scenario: Explicit root selection

- **WHEN** a supported public root override is supplied to either normal-product entry
- **THEN** the selected root SHALL apply consistently to applicable settings/auth/resources/session services
- **AND** no other profile SHALL be implicitly discovered, copied or used for credential fallback

### Requirement: Maintenance commands remain unambiguous

Ordinary A1 SHALL retain existing update, package, uninstall, worktree, session control, help/version and comparison namespace meanings. `a1 update` SHALL update A1, `a1 worktree list` SHALL remain a control operation, and `a1 session color` SHALL remain the public product API. Malformed controls SHALL never become model prompts. Pi-documented maintenance namespaces and aliases on the pi-named entry SHALL follow an explicitly approved routing migration; self-update SHALL target the verified A1 product updater rather than independently replace its embedded Pi. Bare pi-named uninstall without a source SHALL retain the pinned missing-source error rather than remove A1.

Ordinary A1 SHALL require `--` for literal prompt text, retaining one joined literal prompt with preserved token bytes/order and no post-boundary option, command or file expansion. Declared pre-boundary file/image operands MAY supply attachments without enabling implicit bare prompt fallback. The pi-named adapter SHALL retain the pinned positional-message/file grammar, including ordered messages and its documented boundary handling. Neither adapter SHALL resume control dispatch after entering execution-option parsing. Reserved words after the applicable boundary SHALL never execute maintenance.

One authoritative public implementation SHALL normalize all documented pinned launch/discovery/session/model/tool/resource/trust/display/transport flags and registered extension flags. Internal `--runtime-options` SHALL be rejected at public entries. Required-value, duplicate, unsupported-input and registration checks SHALL fail clearly and nonzero rather than accept-and-ignore. The ordinary unknown-word migration from quiet legacy no-op to focused failure SHALL not introduce implicit prompts or deletion. Comparison unsupported forms SHALL never fall through to normal-product execution.

Invocation color SHALL remain a singleton accepting exactly blue, green, orange, pink, purple, cyan or grey. Literal instructions SHALL reach the appropriate existing prompt path once in the declared order only after successful startup; interactive work waits for extension startup and first presentation. Inputs SHALL not be shell-evaluated or silently truncated. No arguments SHALL select the normal product and the appropriate documented transport for its streams.

#### Scenario: Query help

- **WHEN** a standalone supported help request is supplied
- **THEN** A1 SHALL print truthful core help and its command/boundary distinctions without factories, sessions, publication or model contact

#### Scenario: Query version

- **WHEN** a standalone supported version request is supplied
- **THEN** A1 SHALL report truthful A1 and embedded-engine identity without interactive startup or extension factories

#### Scenario: Manage packages

- **WHEN** a declared direct or compatibility package operation is supplied
- **THEN** its existing or approved extended package handler SHALL run rather than interactive prompting

#### Scenario: Launch form is given an argument

- **WHEN** ordinary execution-option parsing receives undeclared bare prompt words before the boundary
- **THEN** it SHALL fail with boundary guidance without selecting maintenance or submitting a prompt

#### Scenario: Unknown subcommand

- **WHEN** an unsupported bare A1 command word is supplied
- **THEN** it SHALL fail with focused guidance and no interactive, shell or maintenance operation

#### Scenario: Comparison launch is absent from a release

- **WHEN** bare a1 pi is unsupported by the build's comparison capability
- **THEN** it SHALL report unavailability rather than select normal-product execution

#### Scenario: Removed update command is provided

- **WHEN** an unsupported legacy update-colon word is supplied
- **THEN** A1 SHALL report unsupported syntax without executing update or model work

#### Scenario: Resume from either release channel

- **WHEN** either release channel receives a supported normal-product session request
- **THEN** the shared guarded session services SHALL honor it under the selected A1 profile

#### Scenario: Session arguments are supplied to the comparison

- **WHEN** session syntax is unsupported in the distinct comparison namespace
- **THEN** it SHALL not become a normal A1 session launch or instruction

#### Scenario: Launch with an invocation color

- **WHEN** a valid normal interactive invocation includes a session color with other supported options in any supported order
- **THEN** the shared owned runtime SHALL apply it without persistence or unknown Pi-option passthrough

#### Scenario: Reject malformed color before rendering

- **WHEN** normal startup receives a missing, invalid or duplicate invocation color
- **THEN** it SHALL fail nonzero before rendering or trust UI

#### Scenario: Preserve a color-looking literal prompt

- **WHEN** ordinary A1 receives a green color override followed by a literal boundary and color-looking prompt text
- **THEN** it SHALL use green and submit the post-boundary content once as literal input after successful startup and first presentation

#### Scenario: Boundary launch without override

- **WHEN** a normal interactive launch has literal prompt text and no color override
- **THEN** saved-Default initialization SHALL apply and prompt tokens SHALL not become overrides

#### Scenario: Leave unrelated commands alone

- **WHEN** a display or color flag is invalid for a control/comparison operation
- **THEN** it SHALL not activate a normal interactive runtime or change installer/update presentation

#### Scenario: Ordinary prompt contains a command word

- **WHEN** the user supplies a1 with a literal boundary followed by update
- **THEN** the instruction SHALL reach normal A1 once without an application update

#### Scenario: Pin-documented pi maintenance is distinguished from a prompt

- **WHEN** the pi-named entry receives a documented leading maintenance namespace under its approved migration
- **THEN** it SHALL use that maintenance handler, while the same word after the literal boundary SHALL remain an instruction
- **AND** update SHALL never independently replace embedded Pi or bypass A1 update authority

### Requirement: A1 exposes one single-agent launch and one prerelease comparison launch

The a1 binary SHALL remain the ordinary installed product command and SHALL provide the pinned public contracts by default without a compatibility switch. Normal interactive execution SHALL launch A1's owned single-agent surface; print/JSON/RPC SHALL use the appropriate shared noninteractive transports. A prerelease build SHALL retain a distinct a1 pi comparison entry; it SHALL NOT be repurposed as default compatibility. A1 MAY ship a real optional pi naming shim with its approved grammar adapter, but SHALL NOT globally replace another pi installation or expose removed agent/solo/ui/tabs modes.

#### Scenario: Launch normal A1

- **WHEN** the user runs bare A1 with terminal input and output
- **THEN** it SHALL launch the normal A1 owned UI with its full applicable product features

#### Scenario: Launch the Pi comparison

- **WHEN** a prerelease comparison is selected
- **THEN** its intentional profile/product-surface differences SHALL remain separate from default normal-product compatibility

#### Scenario: A removed launch word is given

- **WHEN** an unsupported removed launch word is supplied
- **THEN** it SHALL fail clearly without opening a profile or treating the typo as a model request

#### Scenario: Compatibility launch preserves the product

- **WHEN** an external program resolves the optional pi naming executable
- **THEN** it SHALL run the same normal A1 services and applicable product features, not a second runtime or reduced feature set

## ADDED Requirements

### Requirement: Appropriate execution transports survive authenticated launch boundaries

All supported production/development entries SHALL preserve declared transport, validated options, original cwd and prompt/file/image/stdin data through existing immutable-release/bootstrap/guardian/reselection contracts. Public syntax SHALL not bypass internal transport validation. Machine stdin/stdout SHALL retain protocol ownership before startup resources run, and incidental logs, progress, terminal escapes and resume hints SHALL not corrupt protocol stdout. Invocation credentials SHALL remain nonpersistent and absent from release certification, traces and diagnostics. Bounded metadata SHALL not cause silent input truncation or option loss.

#### Scenario: Machine execution through a selected release

- **WHEN** a supported print/JSON/RPC request traverses packaged bootstrap and guardian
- **THEN** the authenticated selected runtime SHALL receive the complete request with clean streams and original input semantics
- **AND** an incompatible selected runtime SHALL fail rather than downgrade transport or discard inputs

#### Scenario: Development execution

- **WHEN** the same supported request runs through supported development routing
- **THEN** it SHALL use the checkout's shared services with equivalent public behavior and isolated development state

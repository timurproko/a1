## ADDED Requirements

### Requirement: Interactive option normalization is shared across normal-product entries

Ordinary A1 and the dedicated Pi-compatible entry SHALL use one authoritative public interactive-options implementation for model/provider/thinking, repeated explicit extensions, tool exclusions, session selection/storage, invocation color and registered extension long options. Equivalent supported arguments SHALL yield equivalent normal A1 launch intents and runtime options, independent of executable spelling. Separate small grammar adapters SHALL retain ordinary A1 command routing and explicit prompt boundaries versus the compatible entry's existing positional-instruction grammar. Sharing SHALL NOT introduce a second runtime, compatibility service, reduced-feature profile or general command framework.

Shared parsing SHALL preserve singleton duplicate and missing-value checks, original-launch-cwd path resolution, bounded NUL-free prompt/runtime payloads, model/provider/effort validation, tool denylist behavior, session writer admission and explicit-extension failure handling. Engine-specific catalog/model policy and loaded extension registration SHALL remain authoritative in their existing owners. Ordinary standalone session storage SHALL be supported equivalently to compatible session storage. Public entries SHALL reject internal serialized runtime-option syntax; the bounded internal child transport SHALL remain distinct and supported.

#### Scenario: Equivalent interactive options

- **WHEN** ordinary A1 receives supported launch options followed by an explicit literal prompt boundary and the Pi-compatible entry receives equivalent options and instruction text
- **THEN** both SHALL construct equivalent normal-profile startup options and deliver the same instruction once through the existing owned runtime
- **AND** model/effort, repeatable extensions, tool exclusions, session storage/selection and invocation color SHALL NOT disappear in dispatch

#### Scenario: Extension flags require real registrations

- **WHEN** either entry receives an extension long flag
- **THEN** the flag SHALL be accepted only according to the loaded extension's existing registration contract
- **AND** unregistered flags or failed explicit extension imports SHALL fail clearly rather than silently omit the requested behavior

#### Scenario: Missing or duplicate launch options

- **WHEN** either entry receives a missing required option value, duplicate singleton, invalid bounded payload or unsupported short flag
- **THEN** it SHALL return a focused nonzero diagnostic rather than a successful no-op or a launch with discarded options

#### Scenario: Internal payload is not a public option

- **WHEN** either public entry receives `--runtime-options`, including after a valid public launch option
- **THEN** public parsing SHALL reject it rather than decode it or treat it as an extension flag
- **AND** existing internal intent/bootstrap/UI-child transport SHALL continue to consume validated structured options

#### Scenario: Original launch directory anchors explicit resources

- **WHEN** equivalent launches name relative extension paths or session storage and later attach a task copy
- **THEN** resource normalization SHALL retain the original launch-directory meaning
- **AND** existing attachment-aware built-in tool cwd and independent-helper semantics SHALL remain unchanged

#### Scenario: Shared options survive selected-release transport

- **WHEN** either entry launches through supported development routing or an authenticated supported immutable release
- **THEN** model/effort, explicit extensions, registered flags, exclusions, session options and prompt data SHALL reach the existing normal-product runtime unchanged within their validated contracts
- **AND** an ultimately selected release lacking authenticated payload support SHALL fail before interactive rendering rather than retry without options

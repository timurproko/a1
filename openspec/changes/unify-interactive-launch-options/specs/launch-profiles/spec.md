## MODIFIED Requirements

### Requirement: Maintenance commands remain unambiguous

`--help`, `-h`, `--version`, `-v`, `update`, and the declared operations under `a1 pi` SHALL retain their maintenance meanings and SHALL NOT be interpreted as profile names or forwarded into an interactive runtime. `a1 update --develop` MAY carry one numbered or full-version preview selector. A prerelease build SHALL expose bare `a1 pi` as its comparison launch; a release build SHALL treat that launch form as unsupported. Existing install/remove/uninstall/list, worktree and session control namespaces SHALL retain their handlers and semantics. Malformed control commands SHALL NOT become model instructions.

Normal A1 SHALL accept the shared supported interactive options: model/provider/thinking, repeated explicit extensions, tool exclusions, session selection/storage, invocation color and registered extension long flags. These options SHALL use the shared normal-product interactive implementation rather than Pi maintenance passthrough. `--session-dir` MAY select storage independently for a new session or accompany `--session <path|id>` in either order. Normal interactive launch SHALL accept at most one `--session-color <name>`, accepting exactly `blue`, `green`, `orange`, `pink`, `purple`, `cyan`, and `grey`. Missing values, duplicate singleton options, invalid values and unsupported launch flags SHALL fail with focused nonzero diagnostics. This addition SHALL NOT expose CLI picker/continue aliases, a `resume` subcommand, a `solo` word, or session/color arguments on the Pi comparison launch.

For a declared normal launch, the first `--` SHALL end option parsing and MAY carry literal prompt arguments with or without launch options. A1 SHALL retain post-boundary token text/order within the existing NUL-free 32768-byte single-space joining contract and pass nonempty prompt content once to the existing owned prompt path after successful session startup and first presentation. Literal content SHALL NOT be shell-evaluated, interpreted as control commands or used as arbitrary Pi argument passthrough. Grammar/session startup failure or trust exit SHALL NOT submit it. Ordinary interactive parsing SHALL reject bare words before the boundary, except the declared optional model-catalog search operand, with guidance rather than guessing between maintenance and prompting. Once an invocation enters launch-option parsing, a subsequent control-looking word SHALL NOT switch it into a maintenance handler.

Unsupported bare command words and reserved operations outside the shared launch-option grammar SHALL retain successful quiet exit before runtime, shell or operation startup. Leading unknown launch flags SHALL instead fail visibly and nonzero. Malformed recognized maintenance commands SHALL retain focused command guidance without automatically printing complete help. No arguments SHALL continue to launch normal A1.

#### Scenario: Query help

- **WHEN** the user runs `a1 --help` or `a1 -h`
- **THEN** A1 SHALL print ordinary A1 help including supported shared launch flags and the literal boundary without launching any profile or loading extension factories

#### Scenario: Query version

- **WHEN** the user runs `a1 --version` or `a1 -v`
- **THEN** A1 SHALL execute its dependency-light truthful A1 version query without launching any profile or loading extension factories

#### Scenario: Manage packages

- **WHEN** the user runs `a1 pi install`, `a1 pi remove`, `a1 pi uninstall`, `a1 pi list`, or an accepted package update form
- **THEN** A1 SHALL run the package operation against the A1 profile without launching any interactive profile

#### Scenario: Launch form is given an argument

- **WHEN** an ordinary invocation has entered shared interactive-option parsing and receives bare prompt words before `--`
- **THEN** A1 SHALL return a focused nonzero boundary diagnostic without launching a profile or selecting a maintenance handler

#### Scenario: Unknown subcommand

- **WHEN** the user provides a bare word outside the declared grammar
- **THEN** A1 SHALL return successfully and silently without invoking a shell or child process

#### Scenario: Comparison launch is absent from a release

- **WHEN** the user runs bare `a1 pi` from a stable release build
- **THEN** A1 SHALL return successfully and silently without launching a profile

#### Scenario: Removed update command is provided

- **WHEN** the user provides a command beginning `update:`
- **THEN** A1 SHALL return successfully and silently without update or runtime work

#### Scenario: Resume from either release channel

- **WHEN** the user runs a valid normal A1 `--session` launch from a stable or prerelease build
- **THEN** A1 SHALL launch the selected session under the normal A1 profile and shared owned runtime

#### Scenario: Session arguments are supplied to the comparison

- **WHEN** the user runs `a1 pi --session <id>`
- **THEN** that unsupported comparison operation SHALL remain a silent no-op rather than fall through to a normal A1 session launch

#### Scenario: Launch with an invocation color

- **WHEN** the user runs `a1 --session-color green` or combines that color with valid normal interactive options in supported order
- **THEN** A1 SHALL launch only the normal profile with the validated invocation-only color
- **AND** the owned color option SHALL NOT reach Pi as an unknown option

#### Scenario: Reject malformed color before rendering

- **WHEN** a recognized normal launch contains `--session-color` with no value, an unsupported value or a repeated occurrence before the boundary
- **THEN** A1 SHALL exit nonzero with focused guidance before interactive startup, project-trust presentation or editor rendering

#### Scenario: Preserve a color-looking literal prompt

- **WHEN** the user runs `a1 --session-color green -- --session-color pink`
- **THEN** A1 SHALL start with green and treat the post-boundary text as literal prompt content, not another override
- **AND** that content SHALL be submitted once only after successful session startup and first presentation without shell evaluation

#### Scenario: Boundary launch without override

- **WHEN** the user starts a normal launch with an explicit `--` and literal prompt but no invocation color
- **THEN** ordinary saved-Default initialization SHALL remain in effect
- **AND** color-looking post-boundary tokens SHALL NOT become launch options

#### Scenario: Leave unrelated commands alone

- **WHEN** a startup-color option is supplied as an unsupported comparison or noninteractive operation
- **THEN** it SHALL NOT enable a normal interactive launch or color override
- **AND** installer/update progress SHALL remain unchanged

#### Scenario: Explicit ordinary prompt contains a reserved command word

- **WHEN** the user runs `a1 -- update`
- **THEN** normal A1 SHALL receive the literal instruction `update` once
- **AND** no application or package update SHALL execute

#### Scenario: Options do not select maintenance midway

- **WHEN** the user runs `a1 --model MODEL update` without a literal boundary
- **THEN** A1 SHALL return nonzero with guidance to place prompt text after `--`
- **AND** neither maintenance nor prompt submission SHALL execute

#### Scenario: Unknown launch flag is not an unknown command word

- **WHEN** the user supplies an unsupported leading launch flag
- **THEN** A1 SHALL return nonzero with a meaningful unsupported-option or unregistered-extension-option diagnostic
- **AND** unrelated unsupported bare words SHALL retain their existing quiet behavior

#### Scenario: Existing control namespaces remain commands

- **WHEN** the user invokes ordinary update, package, worktree or session control syntax
- **THEN** the corresponding existing handler or malformed-command diagnostic SHALL remain authoritative
- **AND** no malformed control form SHALL fall back to an interactive model request

## ADDED Requirements

### Requirement: Ordinary launch discovery uses the existing normal-profile catalog

Ordinary A1 SHALL expose `--list-models [search]` using the same catalog implementation, effective normal A1 profile, supported option/conflict rules and extension registration behavior as the dedicated Pi-compatible entry. Discovery SHALL NOT start an interactive session, publish interactive identity or contact a model. It MAY load extension factories only under the existing catalog contract. Firstmate-scoped discovery SHALL retain the explicit pre-factory safety refusal; sharing SHALL NOT remove selectors or silently select a different profile to evade it.

Each entry SHALL retain truthful help/version identity and ordinary A1 SHALL retain maintenance documentation. Shared interactive flag metadata SHOULD be reused where practical. Help/version SHALL NOT load extension factories, start sessions, publish interactive identity or contact a model, including in Firstmate-scoped environments. Unsupported Pi modes SHALL NOT be advertised as implemented.

#### Scenario: Ordinary model discovery

- **WHEN** the user runs ordinary A1 model listing with an optional search in an allowed isolated environment
- **THEN** it SHALL query the same effective-profile available-model catalog as the equivalent compatible invocation
- **AND** no interactive startup or model request SHALL occur

#### Scenario: Firstmate catalog safety survives consolidation

- **WHEN** ordinary or compatible model listing inherits Firstmate operational home/root/state selectors or native-host claims covered by the existing refusal
- **THEN** discovery SHALL fail clearly before loading extension factories or touching live loaded markers
- **AND** it SHALL NOT return a successful catalog or silently substitute another profile

#### Scenario: Both help entries remain side-effect free

- **WHEN** either entry receives its supported standalone help or version request
- **THEN** it SHALL report its own truthful A1 identity and supported interface without extension factories, session startup, interactive publication or model contact
- **AND** the dedicated compatible version SHALL NOT impersonate an upstream Pi version
